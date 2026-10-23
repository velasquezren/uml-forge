import { HTTPError } from 'ky';
import { apiClient } from '@/lib/api';
import { SseParser } from './sse';
import type { AssistantStatus, ChatMessage, ChatPage, OutgoingAttachment } from './chatTypes';

/** Mensaje de error legible a partir de la respuesta de la API. */
export async function describeChatError(error: unknown): Promise<string> {
  if (error instanceof HTTPError) {
    try {
      const body = await error.response.json<{ message?: string | string[] }>();
      if (Array.isArray(body.message)) return body.message.join('; ');
      if (typeof body.message === 'string') return body.message;
    } catch {
      // Sin cuerpo JSON se informa del codigo.
    }
    return `La API respondio ${error.response.status}`;
  }
  return error instanceof Error ? error.message : 'Error desconocido';
}

const base = (projectId: string) => `projects/${projectId}/chat`;

export function fetchChatPage(projectId: string, before?: string): Promise<ChatPage> {
  const searchParams: Record<string, string> = { limit: '50' };
  if (before) searchParams.before = before;
  return apiClient.get(`${base(projectId)}/messages`, { searchParams }).json<ChatPage>();
}

export function postChatMessage(
  projectId: string,
  content: string,
  askAi: boolean,
  attachment?: OutgoingAttachment,
): Promise<ChatMessage> {
  const json: Record<string, unknown> = { content, askAi };
  if (attachment) {
    const { previewUrl: _preview, ...payload } = attachment;
    json.attachment = payload;
  }
  return apiClient
    .post(`${base(projectId)}/messages`, { json, timeout: 60000 })
    .json<ChatMessage>();
}

/** Pide a la IA que vuelva a responder a un mensaje (por ejemplo tras un error). */
export async function askAgain(projectId: string, messageId: string): Promise<void> {
  await apiClient.post(`${base(projectId)}/messages/${messageId}/ask-again`);
}

/**
 * URL local de un adjunto. Se descarga con la cabecera de autenticacion (una
 * etiqueta <img> o <audio> no puede enviarla) y se guarda para toda la sesion:
 * un adjunto no cambia nunca.
 */
const attachmentUrls = new Map<string, Promise<string>>();

export function attachmentUrl(projectId: string, attachmentId: string): Promise<string> {
  let url = attachmentUrls.get(attachmentId);
  if (url === undefined) {
    url = apiClient
      .get(`${base(projectId)}/attachments/${attachmentId}`, { timeout: 60000 })
      .blob()
      .then((blob) => URL.createObjectURL(blob));
    // Si falla, se olvida para poder reintentarlo.
    url.catch(() => attachmentUrls.delete(attachmentId));
    attachmentUrls.set(attachmentId, url);
  }
  return url;
}

export function resolveProposal(
  projectId: string,
  messageId: string,
  action: 'apply' | 'dismiss',
): Promise<ChatMessage> {
  return apiClient
    .post(`${base(projectId)}/messages/${messageId}/proposal/${action}`, { timeout: 60000 })
    .json<ChatMessage>();
}

/** Lo que llega por el flujo en tiempo real. */
export type ChatStreamHandlers = {
  onReady: () => void;
  onMessage: (message: ChatMessage) => void;
  onAssistant: (status: AssistantStatus) => void;
};

/**
 * Abre el flujo de eventos del chat y lo lee hasta que se cierra o se aborta.
 * Pasa por `apiClient`, de modo que lleva el token y lo renueva si caduco.
 */
export async function readChatStream(
  projectId: string,
  signal: AbortSignal,
  handlers: ChatStreamHandlers,
): Promise<void> {
  const response = await apiClient.get(`${base(projectId)}/stream`, {
    signal,
    timeout: false,
    retry: 0,
    headers: { Accept: 'text/event-stream' },
  });
  const reader = response.body?.getReader();
  if (!reader) return;

  const decoder = new TextDecoder();
  const parser = new SseParser();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return;
    for (const event of parser.push(decoder.decode(value, { stream: true }))) {
      if (event.event === 'ready') handlers.onReady();
      else if (event.event === 'message') handlers.onMessage(JSON.parse(event.data) as ChatMessage);
      else if (event.event === 'assistant') {
        handlers.onAssistant(JSON.parse(event.data) as AssistantStatus);
      }
    }
  }
}
