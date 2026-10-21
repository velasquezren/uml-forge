/** Persona que escribe en el chat, tal como la ven los demas. */
export interface ChatAuthorDto {
  readonly id: string;
  readonly name: string;
}

/** Propuesta de cambios de la IA y su estado. */
export interface ChatProposalDto {
  readonly explanation: string;
  /** Una linea legible por cambio: "Nueva clase Pedido", "Pedido: + total (BigDecimal)". */
  readonly summary: readonly string[];
  readonly operationCount: number;
  readonly status: 'PENDING' | 'APPLIED' | 'DISMISSED';
  readonly resolvedBy: ChatAuthorDto | null;
  readonly resolvedAt: string | null;
  /** Resultado de aplicarla: cuantas operaciones entraron y cuantas no. */
  readonly result: { readonly applied: number; readonly failed: number } | null;
}

/** Mensaje del chat de grupo tal como lo recibe la PWA. */
export interface ChatMessageDto {
  readonly id: string;
  readonly projectId: string;
  readonly kind: 'USER' | 'ASSISTANT';
  readonly author: ChatAuthorDto | null;
  readonly content: string;
  readonly mentionsAi: boolean;
  readonly isError: boolean;
  readonly replyTo: { readonly id: string; readonly authorName: string } | null;
  readonly proposal: ChatProposalDto | null;
  readonly createdAt: string;
}

/** Pagina del historial, de la mas antigua a la mas reciente. */
export interface ChatPageDto {
  readonly messages: readonly ChatMessageDto[];
  readonly hasMore: boolean;
}

/** Evento que recibe cada conexion del flujo en tiempo real. */
export type ChatStreamEvent =
  | { readonly type: 'message'; readonly data: ChatMessageDto }
  | {
      readonly type: 'assistant';
      readonly data: { readonly state: 'thinking' | 'idle'; readonly askedBy: string | null };
    };
