import { HTTPError } from 'ky';
import { apiClient } from '@/lib/api';
import { SseParser } from './sse';
import type { AssistantStatus, ChatMessage, ChatPage } from './chatTypes';

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
): Promise<ChatMessage> {
  return apiClient
    .post(`${base(projectId)}/messages`, { json: { content, askAi } })
    .json<ChatMessage>();
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
