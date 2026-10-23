/** Persona que escribe en el chat. */
export interface ChatAuthor {
  id: string;
  name: string;
}

/** Propuesta de cambios de la IA y su estado. */
export interface ChatProposal {
  explanation: string;
  summary: string[];
  operationCount: number;
  status: 'PENDING' | 'APPLIED' | 'DISMISSED';
  resolvedBy: ChatAuthor | null;
  resolvedAt: string | null;
  result: { applied: number; failed: number } | null;
}

/** Datos de un adjunto; el contenido se descarga aparte por su identificador. */
export interface ChatAttachment {
  id: string;
  kind: 'IMAGE' | 'AUDIO';
  mimeType: string;
  sizeBytes: number;
  durationMs: number | null;
}

/** Adjunto preparado para enviar, en base64. */
export interface OutgoingAttachment {
  kind: 'image' | 'audio';
  mimeType: string;
  dataBase64: string;
  durationMs?: number;
  /** Solo para la vista previa local, no se envia. */
  previewUrl: string;
}

/** Mensaje del chat de grupo; mismo contrato que `ChatMessageDto` de la API. */
export interface ChatMessage {
  id: string;
  projectId: string;
  kind: 'USER' | 'ASSISTANT';
  author: ChatAuthor | null;
  content: string;
  mentionsAi: boolean;
  isError: boolean;
  replyTo: { id: string; authorName: string } | null;
  proposal: ChatProposal | null;
  attachment: ChatAttachment | null;
  /** Transcripcion de la nota de voz: null mientras se hace, '' si no se pudo. */
  transcript: string | null;
  createdAt: string;
}

export interface ChatPage {
  messages: ChatMessage[];
  hasMore: boolean;
}

/** Estado de la IA del chat: pensando la respuesta para alguien, o libre. */
export interface AssistantStatus {
  state: 'thinking' | 'idle';
  askedBy: string | null;
  /** Lo que la IA lleva escrito mientras responde. */
  draft?: string | null;
}
