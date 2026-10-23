import { useCallback, useEffect, useRef, useState } from 'react';
import {
  askAgain as requestAskAgain,
  describeChatError,
  fetchChatPage,
  postChatMessage,
  readChatStream,
  resolveProposal,
} from './chatClient';
import type { AssistantStatus, ChatMessage, OutgoingAttachment } from './chatTypes';

const MAX_RECONNECT_DELAY_MS = 15_000;
const IDLE: AssistantStatus = { state: 'idle', askedBy: null };

/** Inserta o sustituye mensajes manteniendo el orden cronologico. */
export function mergeMessages(
  current: readonly ChatMessage[],
  incoming: readonly ChatMessage[],
): ChatMessage[] {
  const byId = new Map(current.map((message) => [message.id, message]));
  for (const message of incoming) byId.set(message.id, message);
  return [...byId.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

interface UseProjectChatOptions {
  projectId: string;
  currentUserId: string | undefined;
  /** Con el panel abierto los mensajes nuevos no cuentan como pendientes. */
  isOpen: boolean;
  onMention?: (message: ChatMessage) => void;
}

/**
 * Estado del chat de grupo de un proyecto (ADR 0042). Abre el flujo en tiempo
 * real y, ya conectado, carga la ultima pagina del historial; si el flujo se
 * corta lo reabre con espera creciente y vuelve a pedir la pagina para
 * recuperar lo que llegara mientras tanto.
 */
export function useProjectChat({
  projectId,
  currentUserId,
  isOpen,
  onMention,
}: UseProjectChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [connected, setConnected] = useState(false);
  const [assistant, setAssistant] = useState<AssistantStatus>(IDLE);
  const [unread, setUnread] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const isOpenRef = useRef(isOpen);
  isOpenRef.current = isOpen;
  const onMentionRef = useRef(onMention);
  onMentionRef.current = onMention;
  const seenIds = useRef(new Set<string>());

  const receive = useCallback(
    (incoming: ChatMessage) => {
      const isNew = !seenIds.current.has(incoming.id);
      seenIds.current.add(incoming.id);
      setMessages((current) => mergeMessages(current, [incoming]));
      if (!isNew || incoming.author?.id === currentUserId) return;
      if (!isOpenRef.current) setUnread((count) => count + 1);
      if (incoming.kind === 'ASSISTANT') onMentionRef.current?.(incoming);
    },
    [currentUserId],
  );

  const loadLatest = useCallback(async () => {
    const page = await fetchChatPage(projectId);
    for (const message of page.messages) seenIds.current.add(message.id);
    setMessages((current) => mergeMessages(current, page.messages));
    setHasMore((previous) => previous || page.hasMore);
  }, [projectId]);

  useEffect(() => {
    const controller = new AbortController();
    let delay = 1000;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const connect = async () => {
      try {
        // Primero el flujo y despues el historial: al reves, un mensaje escrito
        // entre ambas peticiones no llegaba por ninguna de las dos.
        await readChatStream(projectId, controller.signal, {
          onReady: () => {
            setConnected(true);
            setError(null);
            delay = 1000;
            loadLatest().catch(async (cause: unknown) => setError(await describeChatError(cause)));
          },
          onMessage: receive,
          onAssistant: setAssistant,
        });
      } catch (cause) {
        if (controller.signal.aborted) return;
        setError(await describeChatError(cause));
      }
      if (controller.signal.aborted) return;
      setConnected(false);
      setAssistant(IDLE);
      timer = setTimeout(() => void connect(), delay);
      delay = Math.min(delay * 2, MAX_RECONNECT_DELAY_MS);
    };

    void connect();
    return () => {
      controller.abort();
      if (timer !== undefined) clearTimeout(timer);
    };
  }, [projectId, loadLatest, receive]);

  useEffect(() => {
    if (isOpen) setUnread(0);
  }, [isOpen]);

  const loadOlder = useCallback(async () => {
    const oldest = messages[0];
    if (!oldest) return;
    const page = await fetchChatPage(projectId, oldest.createdAt);
    for (const message of page.messages) seenIds.current.add(message.id);
    setMessages((current) => mergeMessages(current, page.messages));
    setHasMore(page.hasMore);
  }, [messages, projectId]);

  const send = useCallback(
    async (content: string, askAi: boolean, attachment?: OutgoingAttachment) => {
      const message = await postChatMessage(projectId, content, askAi, attachment);
      seenIds.current.add(message.id);
      setMessages((current) => mergeMessages(current, [message]));
    },
    [projectId],
  );

  const resolve = useCallback(
    async (messageId: string, action: 'apply' | 'dismiss') => {
      const message = await resolveProposal(projectId, messageId, action);
      setMessages((current) => mergeMessages(current, [message]));
      return message;
    },
    [projectId],
  );

  const askAgain = useCallback(
    (messageId: string) => requestAskAgain(projectId, messageId),
    [projectId],
  );

  return {
    messages,
    hasMore,
    connected,
    assistant,
    unread,
    error,
    loadOlder,
    send,
    resolve,
    askAgain,
  };
}
