import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ChatAttachmentKind, ChatAuthorKind, ChatProposalStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { normalizeAiOperations } from '../ai/ai-operation-normalizer';
import { CollabService } from '../collab/collab.service';
import { ChatAssistantService } from './chat-assistant.service';
import { validateAttachment } from './chat-attachments';
import { isFollowUpToAssistant, mentionsAi as hasAiMention } from './chat-mentions';
import { readStoredProposal } from './chat-proposal';
import {
  CHAT_MESSAGE_INCLUDE,
  toChatMessageDto,
  type ChatMessageRecord,
} from './chat-message.mapper';
import type { ChatMessageDto, ChatPageDto } from './chat.types';
import { CHAT_EVENT_BUS, type ChatEventBus } from './events/chat-event-bus';
import type { ListChatMessagesDto } from './dto/list-chat-messages.dto';
import type { SendChatMessageDto } from './dto/send-chat-message.dto';

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
    const content = (dto.content ?? '').trim();
    const attachment = dto.attachment ? validateAttachment(dto.attachment) : null;
    if (content === '' && attachment === null) {
      throw new UnprocessableEntityException('El mensaje esta vacio');
    }
    const mentionsAi =
      dto.askAi === true ||
      hasAiMention(content) ||
      isFollowUpToAssistant(await this.lastMessage(projectId), author.id, new Date());

    const record = await this.prisma.chatMessage.create({
      data: {
        projectId,
        kind: ChatAuthorKind.USER,
        authorId: author.id,
        content,
        mentionsAi,
        ...(attachment === null
          ? {}
          : {
              attachment: {
                create: {
                  kind:
                    attachment.kind === 'image'
                      ? ChatAttachmentKind.IMAGE
                      : ChatAttachmentKind.AUDIO,
                  mimeType: attachment.mimeType,
                  sizeBytes: attachment.data.length,
                  durationMs: attachment.durationMs,
                  data: Uint8Array.from(attachment.data),
                },
              },
            }),
      },
      include: CHAT_MESSAGE_INCLUDE,
    });
    await this.bus.publish({ type: 'message', projectId, messageId: record.id });

    // Las notas de voz se transcriben siempre, para leerlas sin escucharlas;
    // la IA solo responde si se le pregunta (ADR 0044).
    const transcribe = attachment?.kind === 'audio';
    if (transcribe || mentionsAi) {
      this.assistant.enqueue(projectId, record.id, author.name, { transcribe, answer: mentionsAi });
    }
    return toChatMessageDto(record);
  }

  /**
   * Vuelve a pedir a la IA que responda a un mensaje, por ejemplo tras un error
   * pasajero. Se responde al mensaje original, con su adjunto, sin duplicarlo.
   */
  async askAgain(projectId: string, messageId: string, askedBy: string): Promise<void> {
    const message = await this.prisma.chatMessage.findFirst({
      where: { id: messageId, projectId, kind: ChatAuthorKind.USER },
      select: { id: true, transcript: true, attachment: { select: { kind: true } } },
    });
    if (message === null) {
      throw new NotFoundException('Ese mensaje no existe en el chat del proyecto');
    }
    const transcribe = message.attachment?.kind === ChatAttachmentKind.AUDIO && !message.transcript;
    this.assistant.enqueue(projectId, message.id, askedBy, { transcribe, answer: true });
  }

  /** Ultimo mensaje del proyecto, para saber si la IA espera una respuesta. */
  private async lastMessage(projectId: string) {
    return this.prisma.chatMessage.findFirst({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      select: {
        kind: true,
        content: true,
        isError: true,
        createdAt: true,
        replyTo: { select: { authorId: true } },
      },
    });
  }

  /** Contenido de un adjunto, solo si pertenece a un mensaje de este proyecto. */
  async attachment(
    projectId: string,
    attachmentId: string,
  ): Promise<{ data: Buffer; mimeType: string }> {
    const record = await this.prisma.chatAttachment.findFirst({
      where: { id: attachmentId, message: { projectId } },
      select: { data: true, mimeType: true },
    });
    if (record === null) {
      throw new NotFoundException('El adjunto no existe');
    }
    return { data: Buffer.from(record.data), mimeType: record.mimeType };
  }

  /**
   * Aplica una propuesta de la IA sobre el modelo compartido. La reclama de
   * forma atomica (solo si sigue pendiente), de modo que dos editores que pulsan
   * a la vez no la aplican dos veces. Antes se vuelve a normalizar contra el
   * modelo de ahora (ADR 0045): lo que otra propuesta o un editor ya hicieron
   * se descarta en vez de duplicarse. Si no entra nada, vuelve a pendiente.
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
    const current = await this.collab.currentModel(projectId);
    const operations = normalizeAiOperations(proposal.operations, current ?? undefined);
    const skipped = Math.max(0, proposal.operations.length - operations.length);
    const report = await this.collab.applyOperations(
      projectId,
      operations,
      project?.name ?? 'Proyecto UML',
    );

    if (report.applied === 0) {
      await this.release(messageId);
      throw new UnprocessableEntityException(
        `No se pudo aplicar ningun cambio: ${report.firstError ?? 'todo lo propuesto ya esta en el modelo'}`,
      );
    }

    await this.prisma.chatMessage.update({
      where: { id: messageId },
      data: {
        proposal: {
          ...proposal,
          result: { applied: report.applied, failed: report.failed + skipped },
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
