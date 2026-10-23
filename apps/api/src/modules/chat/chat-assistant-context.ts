import { ChatAttachmentKind, ChatAuthorKind } from '@prisma/client';
import type { AiChatTurn } from '../ai/interfaces/ai-provider.interface';

/** Mensaje anterior con lo minimo para contarselo a la IA. */
export interface HistoryRecord {
  readonly kind: ChatAuthorKind;
  readonly content: string;
  readonly transcript: string | null;
  readonly author: { readonly name: string } | null;
  readonly attachment: { readonly kind: ChatAttachmentKind } | null;
}

/**
 * Convierte el historial en turnos de texto. Los adjuntos antiguos no se
 * reenvian (solo el del mensaje que se responde): una imagen se menciona y una
 * nota de voz viaja como su transcripcion, que es lo que importa del contexto.
 */
export function toHistoryTurns(records: readonly HistoryRecord[]): AiChatTurn[] {
  return records.map((record) => {
    const parts: string[] = [];
    if (record.attachment?.kind === ChatAttachmentKind.IMAGE) parts.push('[imagen adjunta]');
    if (record.attachment?.kind === ChatAttachmentKind.AUDIO) {
      parts.push(record.transcript ? `[nota de voz] ${record.transcript}` : '[nota de voz]');
    }
    if (record.content) parts.push(record.content);
    return {
      author: record.author?.name ?? 'Alguien',
      fromAssistant: record.kind === ChatAuthorKind.ASSISTANT,
      content: parts.join(' '),
    };
  });
}

/** Caracteres del borrador que viajan por el bus (NOTIFY admite 8000 bytes). */
const DRAFT_LIMIT = 2500;

/** Intervalo minimo entre dos avisos de borrador. */
const DRAFT_INTERVAL_MS = 300;

/**
 * Limita los avisos de "la IA esta escribiendo": como mucho uno cada 300 ms y
 * solo si el texto cambio. Asi el bus y las conexiones no reciben un evento
 * por cada trozo que devuelve el modelo.
 */
export function createDraftThrottle(
  publish: (draft: string) => void,
  now: () => number = Date.now,
): (draft: string) => void {
  let last = Number.NEGATIVE_INFINITY;
  let lastDraft = '';
  return (draft: string) => {
    const clipped = draft.length > DRAFT_LIMIT ? `${draft.slice(0, DRAFT_LIMIT)}...` : draft;
    const time = now();
    if (clipped === lastDraft || time - last < DRAFT_INTERVAL_MS) return;
    last = time;
    lastDraft = clipped;
    publish(clipped);
  };
}
