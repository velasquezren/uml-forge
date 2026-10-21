import { Inject, Injectable, Logger } from '@nestjs/common';
import { ChatAuthorKind, ChatProposalStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CHAT_HISTORY_LIMIT } from '../ai/ai-chat-prompt';
import { AiService } from '../ai/ai.service';
import type { AiChatReply } from '../ai/interfaces/ai-provider.interface';
import { CollabService } from '../collab/collab.service';
import { summarizeOperations, type StoredProposal } from './chat-proposal';
import { CHAT_EVENT_BUS, type ChatEventBus } from './events/chat-event-bus';

/** Preguntas a la IA que pueden esperar a la vez en un mismo proyecto. */
const MAX_PENDING_PER_PROJECT = 5;

/**
 * La IA del chat de grupo (ADR 0042). Las preguntas de un mismo proyecto se
 * atienden en orden, una tras otra: asi cada respuesta ve las anteriores en el
 * historial y la conversacion no se cruza. Proyectos distintos se atienden en
 * paralelo. Mientras piensa, todos ven "IA esta escribiendo".
 */
@Injectable()
export class ChatAssistantService {
  private readonly logger = new Logger(ChatAssistantService.name);
  private readonly queues = new Map<string, Promise<void>>();
  private readonly pending = new Map<string, number>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
    private readonly collab: CollabService,
    @Inject(CHAT_EVENT_BUS) private readonly bus: ChatEventBus,
  ) {}

  /** Encola una pregunta; la respuesta llega por el bus de eventos. */
  enqueue(projectId: string, questionId: string, askedBy: string): void {
    const waiting = this.pending.get(projectId) ?? 0;
    if (waiting >= MAX_PENDING_PER_PROJECT) {
      void this.postAssistantMessage(projectId, questionId, {
        content: `${askedBy}, ahora mismo tengo demasiadas preguntas pendientes en este proyecto. Vuelve a preguntarme en un momento.`,
        isError: true,
      });
      return;
    }
    this.pending.set(projectId, waiting + 1);

    const previous = this.queues.get(projectId) ?? Promise.resolve();
    const next = previous
      .then(() => this.answer(projectId, questionId, askedBy))
      .catch((error: unknown) => {
        this.logger.error(`Error del asistente en ${projectId}: ${String(error)}`);
      })
      .finally(() => {
        const left = (this.pending.get(projectId) ?? 1) - 1;
        if (left <= 0) this.pending.delete(projectId);
        else this.pending.set(projectId, left);
        if (this.queues.get(projectId) === next) this.queues.delete(projectId);
      });
    this.queues.set(projectId, next);
  }

  /** Espera a que se vacie la cola de un proyecto; lo usan las pruebas. */
  async drain(projectId: string): Promise<void> {
    await (this.queues.get(projectId) ?? Promise.resolve());
  }

  private async answer(projectId: string, questionId: string, askedBy: string): Promise<void> {
    await this.bus.publish({ type: 'assistant', projectId, state: 'thinking', askedBy });
    try {
      const question = await this.prisma.chatMessage.findUnique({ where: { id: questionId } });
      if (question === null) return;

      const [history, model] = await Promise.all([
        this.history(projectId, question.createdAt),
        this.collab.currentModel(projectId),
      ]);
      const reply = await this.ai.converse({
        askedBy,
        message: question.content,
        history,
        participants: this.collab.participants(projectId),
        model: model ?? undefined,
      });

      await this.postAssistantMessage(projectId, questionId, {
        content: reply.reply,
        isError: false,
        proposal: toStoredProposal(reply, model),
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      await this.postAssistantMessage(projectId, questionId, {
        content: `${askedBy}, no he podido responder: ${reason}`,
        isError: true,
      });
    } finally {
      await this.bus.publish({ type: 'assistant', projectId, state: 'idle', askedBy: null });
    }
  }

  /** Mensajes anteriores a la pregunta, del mas antiguo al mas reciente. */
  private async history(projectId: string, before: Date) {
    const records = await this.prisma.chatMessage.findMany({
      where: { projectId, createdAt: { lt: before }, isError: false },
      include: { author: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: CHAT_HISTORY_LIMIT,
    });
    return records.reverse().map((record) => ({
      author: record.author?.name ?? 'Alguien',
      fromAssistant: record.kind === ChatAuthorKind.ASSISTANT,
      content: record.content,
    }));
  }

  private async postAssistantMessage(
    projectId: string,
    replyToId: string,
    message: { content: string; isError: boolean; proposal?: StoredProposal | null },
  ): Promise<void> {
    const proposal = message.proposal ?? null;
    const record = await this.prisma.chatMessage.create({
      data: {
        projectId,
        kind: ChatAuthorKind.ASSISTANT,
        content: message.content,
        isError: message.isError,
        replyToId,
        ...(proposal === null
          ? {}
          : {
              proposal,
              proposalStatus: ChatProposalStatus.PENDING,
            }),
      },
    });
    await this.bus.publish({ type: 'message', projectId, messageId: record.id });
  }
}

/** Propuesta lista para guardar, con su resumen legible. */
function toStoredProposal(
  reply: AiChatReply,
  model: Awaited<ReturnType<CollabService['currentModel']>>,
): StoredProposal | null {
  if (reply.proposal === null || reply.proposal.operations.length === 0) {
    return null;
  }
  const operations = [...reply.proposal.operations];
  return {
    explanation: reply.proposal.explanation,
    operations,
    summary: summarizeOperations(operations, model),
    result: null,
  };
}
