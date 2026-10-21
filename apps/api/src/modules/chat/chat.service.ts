import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ChatAuthorKind, ChatProposalStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CollabService } from '../collab/collab.service';
import { ChatAssistantService } from './chat-assistant.service';
import { readStoredProposal } from './chat-proposal';
import type { ChatMessageDto, ChatPageDto } from './chat.types';
import { CHAT_EVENT_BUS, type ChatEventBus } from './events/chat-event-bus';
import type { ListChatMessagesDto } from './dto/list-chat-messages.dto';
import type { SendChatMessageDto } from './dto/send-chat-message.dto';

/** Relaciones necesarias para convertir un mensaje en su DTO. */
export const CHAT_MESSAGE_INCLUDE = {
  author: { select: { id: true, name: true } },
  proposalResolvedBy: { select: { id: true, name: true } },
  replyTo: { select: { id: true, author: { select: { name: true } } } },
} satisfies Prisma.ChatMessageInclude;

type ChatMessageRecord = Prisma.ChatMessageGetPayload<{ include: typeof CHAT_MESSAGE_INCLUDE }>;

/** Menciona a la IA: "@ia" como palabra, en cualquier posicion y sin distinguir mayusculas. */
const AI_MENTION = /(^|[\s(¿¡])@ia\b/iu;

/**
 * Mensajes del chat de grupo de un proyecto (ADR 0042): historial, envio y
 * resolucion de las propuestas de la IA. Cada cambio se anuncia por el bus de
 * eventos para que lo reciban todas las conexiones, esten en la instancia que
 * esten.
 */
@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly collab: CollabService,
    private readonly assistant: ChatAssistantService,
    @Inject(CHAT_EVENT_BUS) private readonly bus: ChatEventBus,
  ) {}

  async list(projectId: string, query: ListChatMessagesDto): Promise<ChatPageDto> {
    const limit = query.limit ?? 50;
    const records = await this.prisma.chatMessage.findMany({
      where: {
        projectId,
        ...(query.before ? { createdAt: { lt: new Date(query.before) } } : {}),
      },
      include: CHAT_MESSAGE_INCLUDE,
      orderBy: { createdAt: 'desc' },
      // Uno de mas para saber si quedan mensajes anteriores sin otra consulta.
      take: limit + 1,
    });
    const page = records.slice(0, limit).reverse();
    return { messages: page.map(toChatMessageDto), hasMore: records.length > limit };
  }

  async get(messageId: string): Promise<ChatMessageDto | null> {
    const record = await this.prisma.chatMessage.findUnique({
      where: { id: messageId },
      include: CHAT_MESSAGE_INCLUDE,
    });
    return record === null ? null : toChatMessageDto(record);
  }

  async send(
    projectId: string,
    author: { id: string; name: string },
    dto: SendChatMessageDto,
  ): Promise<ChatMessageDto> {
    const content = dto.content.trim();
    if (content === '') {
      throw new UnprocessableEntityException('El mensaje esta vacio');
    }
    const mentionsAi = dto.askAi === true || AI_MENTION.test(content);

    const record = await this.prisma.chatMessage.create({
      data: { projectId, kind: ChatAuthorKind.USER, authorId: author.id, content, mentionsAi },
      include: CHAT_MESSAGE_INCLUDE,
    });
    await this.bus.publish({ type: 'message', projectId, messageId: record.id });

    if (mentionsAi) {
      this.assistant.enqueue(projectId, record.id, author.name);
    }
    return toChatMessageDto(record);
  }

  /**
   * Aplica una propuesta de la IA sobre el modelo compartido. La reclama de
   * forma atomica (solo si sigue pendiente), de modo que dos editores que pulsan
   * a la vez no la aplican dos veces; si no entra ninguna operacion, se devuelve
   * a pendiente para poder reintentarlo.
   */
  async applyProposal(
    projectId: string,
    messageId: string,
    userId: string,
  ): Promise<ChatMessageDto> {
    const record = await this.claimProposal(
      projectId,
      messageId,
      userId,
      ChatProposalStatus.APPLIED,
    );
    const proposal = readStoredProposal(record.proposal);
    if (proposal === null) {
      await this.release(messageId);
      throw new UnprocessableEntityException('La propuesta guardada no es valida');
    }

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { name: true },
    });
    const report = await this.collab.applyOperations(
      projectId,
      proposal.operations,
      project?.name ?? 'Proyecto UML',
    );

    if (report.applied === 0) {
      await this.release(messageId);
      throw new UnprocessableEntityException(
        `No se pudo aplicar ningun cambio: ${report.firstError ?? 'el modelo ha cambiado'}`,
      );
    }

    await this.prisma.chatMessage.update({
      where: { id: messageId },
      data: {
        proposal: {
          ...proposal,
          result: { applied: report.applied, failed: report.failed },
        },
      },
    });
    return this.announce(projectId, messageId);
  }

  async dismissProposal(
    projectId: string,
    messageId: string,
    userId: string,
  ): Promise<ChatMessageDto> {
    await this.claimProposal(projectId, messageId, userId, ChatProposalStatus.DISMISSED);
    return this.announce(projectId, messageId);
  }

  private async claimProposal(
    projectId: string,
    messageId: string,
    userId: string,
    status: ChatProposalStatus,
  ): Promise<ChatMessageRecord> {
    const claimed = await this.prisma.chatMessage.updateMany({
      where: { id: messageId, projectId, proposalStatus: ChatProposalStatus.PENDING },
      data: {
        proposalStatus: status,
        proposalResolvedById: userId,
        proposalResolvedAt: new Date(),
      },
    });
    const record = await this.prisma.chatMessage.findFirst({
      where: { id: messageId, projectId },
      include: CHAT_MESSAGE_INCLUDE,
    });
    if (record === null || record.proposalStatus === null) {
      throw new NotFoundException('Ese mensaje no tiene ninguna propuesta');
    }
    if (claimed.count === 0) {
      const who = record.proposalResolvedBy?.name ?? 'otra persona';
      throw new ConflictException(
        record.proposalStatus === ChatProposalStatus.APPLIED
          ? `La propuesta ya la aplico ${who}`
          : `La propuesta ya la descarto ${who}`,
      );
    }
    return record;
  }

  private async release(messageId: string): Promise<void> {
    await this.prisma.chatMessage.update({
      where: { id: messageId },
      data: {
        proposalStatus: ChatProposalStatus.PENDING,
        proposalResolvedById: null,
        proposalResolvedAt: null,
      },
    });
  }

  private async announce(projectId: string, messageId: string): Promise<ChatMessageDto> {
    await this.bus.publish({ type: 'message', projectId, messageId });
    const dto = await this.get(messageId);
    if (dto === null) {
      throw new NotFoundException('El mensaje ya no existe');
    }
    return dto;
  }
}

/** Convierte el registro de Prisma en lo que ve la PWA. */
export function toChatMessageDto(record: ChatMessageRecord): ChatMessageDto {
  const proposal = record.proposalStatus === null ? null : readStoredProposal(record.proposal);
  return {
    id: record.id,
    projectId: record.projectId,
    kind: record.kind,
    author: record.author,
    content: record.content,
    mentionsAi: record.mentionsAi,
    isError: record.isError,
    replyTo:
      record.replyTo === null
        ? null
        : { id: record.replyTo.id, authorName: record.replyTo.author?.name ?? 'Alguien' },
    proposal:
      proposal === null || record.proposalStatus === null
        ? null
        : {
            explanation: proposal.explanation,
            summary: proposal.summary,
            operationCount: proposal.operations.length,
            status: record.proposalStatus,
            resolvedBy: record.proposalResolvedBy,
            resolvedAt: record.proposalResolvedAt?.toISOString() ?? null,
            result: proposal.result,
          },
    createdAt: record.createdAt.toISOString(),
  };
}
