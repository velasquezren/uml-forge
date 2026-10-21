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
}
