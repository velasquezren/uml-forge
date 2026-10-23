/** Menciona a la IA: "@ia" como palabra, en cualquier posicion y sin distinguir mayusculas. */
const AI_MENTION = /(^|[\s(¿¡])@ia\b/iu;

/** Tiempo durante el que contestar a una pregunta de la IA sigue la conversacion. */
export const FOLLOW_UP_WINDOW_MS = 10 * 60 * 1000;

/** Ultimo mensaje del chat, con lo necesario para saber si la IA espera respuesta. */
export interface LastMessage {
  readonly kind: 'USER' | 'ASSISTANT';
  readonly content: string;
  readonly isError: boolean;
  readonly createdAt: Date;
  /** Autor del mensaje al que respondia la IA. */
  readonly replyTo: { readonly authorId: string | null } | null;
}

export function mentionsAi(content: string): boolean {
  return AI_MENTION.test(content);
}

/**
 * Cierto si el mensaje contesta a una pregunta que la IA acaba de hacer a esa
 * misma persona (ADR 0042). Sin esto, tras "¿Deseas anadir algo mas?" la
 * respuesta "pon mas atributos a Student" iba al grupo y la IA no la atendia.
 * Solo cuenta para quien recibio la pregunta y durante 10 minutos, para que la
 * IA no se meta en conversaciones entre personas.
 */
export function isFollowUpToAssistant(
  last: LastMessage | null,
  authorId: string,
  now: Date,
): boolean {
  if (last === null || last.kind !== 'ASSISTANT' || last.isError) return false;
  if (last.replyTo?.authorId !== authorId) return false;
  if (now.getTime() - last.createdAt.getTime() > FOLLOW_UP_WINDOW_MS) return false;
  return last.content.includes('?');
}
