/**
 * Eventos del chat que viajan entre instancias de la API. Son deliberadamente
 * pequenos (identificadores, no mensajes completos): PostgreSQL limita el
 * contenido de un NOTIFY a 8000 bytes, y cada instancia lee el mensaje de la
 * base de datos una sola vez antes de repartirlo a sus conexiones (ADR 0042).
 */
export type ChatBusEvent =
  | { readonly type: 'message'; readonly projectId: string; readonly messageId: string }
  | {
      readonly type: 'assistant';
      readonly projectId: string;
      readonly state: 'thinking' | 'idle';
      readonly askedBy: string | null;
      /** Respuesta parcial; acotada porque NOTIFY admite 8000 bytes. */
      readonly draft?: string | null;
    };

export type ChatBusListener = (event: ChatBusEvent) => void;

/** Reparto de eventos del chat entre todas las instancias de la API. */
export interface ChatEventBus {
  publish(event: ChatBusEvent): Promise<void>;
  /** Escucha los eventos de todos los proyectos; devuelve la baja. */
  subscribe(listener: ChatBusListener): () => void;
}

/** Token de inyeccion de la implementacion elegida con `CHAT_EVENT_BUS`. */
export const CHAT_EVENT_BUS = Symbol('CHAT_EVENT_BUS');

/** Comprueba que un JSON recibido por la red es un evento valido. */
export function parseChatBusEvent(raw: string): ChatBusEvent | null {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof value !== 'object' || value === null) return null;
  const event = value as Record<string, unknown>;
  if (typeof event.projectId !== 'string') return null;

  if (event.type === 'message' && typeof event.messageId === 'string') {
    return { type: 'message', projectId: event.projectId, messageId: event.messageId };
  }
  if (event.type === 'assistant' && (event.state === 'thinking' || event.state === 'idle')) {
    return {
      type: 'assistant',
      projectId: event.projectId,
      state: event.state,
      askedBy: typeof event.askedBy === 'string' ? event.askedBy : null,
      draft: typeof event.draft === 'string' ? event.draft : null,
    };
  }
  return null;
}
