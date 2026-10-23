import { Inject, Injectable, Logger } from '@nestjs/common';
import { ChatAttachmentKind, ChatAuthorKind, ChatProposalStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CHAT_HISTORY_LIMIT } from '../ai/ai-chat-prompt';
import { AiService } from '../ai/ai.service';
import type { AiChatAttachment, AiChatReply } from '../ai/interfaces/ai-provider.interface';
import { CollabService } from '../collab/collab.service';
import { createDraftThrottle, toHistoryTurns } from './chat-assistant-context';
import { summarizeOperations, type StoredProposal } from './chat-proposal';
import { CHAT_EVENT_BUS, type ChatEventBus } from './events/chat-event-bus';

/** Preguntas a la IA que pueden esperar a la vez en un mismo proyecto. */
const MAX_PENDING_PER_PROJECT = 5;

/** Que hay que hacer con un mensaje: transcribir su nota de voz, responderlo o ambas. */
export interface AssistantTask {
  readonly transcribe: boolean;
  readonly answer: boolean;
}

/**
 * La IA del chat de grupo (ADR 0042 y 0044). Los mensajes de un mismo proyecto
 * se atienden en orden, uno tras otro: asi cada respuesta ve las anteriores y
 * una nota de voz se transcribe antes de responderla. Proyectos distintos se
 * atienden en paralelo. Mientras escribe, todos ven el texto que va saliendo.
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

  /** Encola el trabajo sobre un mensaje; el resultado llega por el bus de eventos. */
  enqueue(
    projectId: string,
    messageId: string,
    askedBy: string,
    task: AssistantTask = { transcribe: false, answer: true },
  ): void {
    const waiting = this.pending.get(projectId) ?? 0;
    if (waiting >= MAX_PENDING_PER_PROJECT) {
      if (task.answer) {
        void this.postAssistantMessage(projectId, messageId, {
          content: `${askedBy}, ahora mismo tengo demasiadas preguntas pendientes en este proyecto. Vuelve a preguntarme en un momento.`,
          isError: true,
        });
      }
      return;
    }
    this.pending.set(projectId, waiting + 1);

    const previous = this.queues.get(projectId) ?? Promise.resolve();
    const next = previous
      .then(() => this.process(projectId, messageId, askedBy, task))
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

  private async process(
    projectId: string,
    messageId: string,
    askedBy: string,
    task: AssistantTask,
  ): Promise<void> {
    const transcript = task.transcribe ? await this.transcribe(projectId, messageId) : null;
    if (task.answer) {
      await this.answer(projectId, messageId, askedBy, transcript);
    }
  }

  /** Transcribe la nota de voz y publica el mensaje con su texto ('' si fallo). */
  private async transcribe(projectId: string, messageId: string): Promise<string | null> {
    const attachment = await this.prisma.chatAttachment.findUnique({ where: { messageId } });
    if (attachment === null) return null;

    let transcript = '';
    try {
      transcript = await this.ai.transcribe(Buffer.from(attachment.data), attachment.mimeType);
    } catch (error) {
      this.logger.warn(`No se pudo transcribir la nota de voz ${messageId}: ${String(error)}`);
    }
    await this.prisma.chatMessage.update({ where: { id: messageId }, data: { transcript } });
    await this.bus.publish({ type: 'message', projectId, messageId });
    return transcript;
  }

  private async answer(
    projectId: string,
    questionId: string,
    askedBy: string,
    transcript: string | null,
  ): Promise<void> {
    await this.bus.publish({ type: 'assistant', projectId, state: 'thinking', askedBy });
    try {
      const question = await this.prisma.chatMessage.findUnique({
        where: { id: questionId },
        include: { attachment: true },
      });
      if (question === null) return;

      const [history, model] = await Promise.all([
        this.history(projectId, question.createdAt),
        this.collab.currentModel(projectId),
      ]);
      const onDraft = createDraftThrottle((draft) => {
        void this.bus.publish({ type: 'assistant', projectId, state: 'thinking', askedBy, draft });
      });

      const reply = await this.ai.converse(
        {
          askedBy,
          message: question.content,
          history,
          participants: this.collab.participants(projectId),
          model: model ?? undefined,
          attachment: toAiAttachment(question.attachment),
          transcript: transcript ?? question.transcript ?? undefined,
        },
        onDraft,
      );

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
      select: {
        kind: true,
        content: true,
        transcript: true,
        author: { select: { name: true } },
        attachment: { select: { kind: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: CHAT_HISTORY_LIMIT,
    });
    return toHistoryTurns(records.reverse());
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
        ...(proposal === null ? {} : { proposal, proposalStatus: ChatProposalStatus.PENDING }),
      },
    });
    await this.bus.publish({ type: 'message', projectId, messageId: record.id });
  }
}

/** El adjunto del mensaje que se responde, en la forma que entiende la IA. */
function toAiAttachment(
  attachment: { kind: ChatAttachmentKind; mimeType: string; data: Uint8Array } | null,
): AiChatAttachment | undefined {
  if (attachment === null) return undefined;
  return {
    kind: attachment.kind === ChatAttachmentKind.IMAGE ? 'image' : 'audio',
    mimeType: attachment.mimeType,
    data: Buffer.from(attachment.data),
  };
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
