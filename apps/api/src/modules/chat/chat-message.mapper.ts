import type { Prisma } from '@prisma/client';
import { readStoredProposal } from './chat-proposal';
import type { ChatMessageDto } from './chat.types';

/** Relaciones necesarias para convertir un mensaje en su DTO. */
export const CHAT_MESSAGE_INCLUDE = {
  author: { select: { id: true, name: true } },
  proposalResolvedBy: { select: { id: true, name: true } },
  replyTo: { select: { id: true, author: { select: { name: true } } } },
  // Solo los metadatos: el contenido binario se descarga por su propia ruta.
  attachment: {
    select: { id: true, kind: true, mimeType: true, sizeBytes: true, durationMs: true },
  },
} satisfies Prisma.ChatMessageInclude;

export type ChatMessageRecord = Prisma.ChatMessageGetPayload<{
  include: typeof CHAT_MESSAGE_INCLUDE;
}>;

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
    attachment: record.attachment,
    transcript: record.transcript,
    createdAt: record.createdAt.toISOString(),
  };
}
