import { useEffect, useLayoutEffect, useRef } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { describeChatError } from './chatClient';
import { ChatComposer } from './ChatComposer';
import { ChatMessageItem } from './ChatMessageItem';
import type { ChatMessage, OutgoingAttachment } from './chatTypes';
import type { useProjectChat } from './useProjectChat';

/**
 * Cierto si el ultimo mensaje es una pregunta de la IA a esta persona: entonces
 * su respuesta le llegara sin @ia (misma regla que la API, ADR 0042).
 */
function aiAwaitsReplyFrom(messages: readonly ChatMessage[], currentUserId?: string): boolean {
  const last = messages.at(-1);
  if (!last || last.kind !== 'ASSISTANT' || last.isError || !last.content.includes('?')) {
    return false;
  }
  const question = messages.find((message) => message.id === last.replyTo?.id);
  return question?.author?.id === currentUserId;
}

/** Distancia al final por debajo de la cual se sigue la conversacion sola. */
const STICK_TO_BOTTOM_PX = 120;

interface ChatPanelProps {
  chat: ReturnType<typeof useProjectChat>;
  currentUserId: string | undefined;
  canEdit: boolean;
  /** Antes de preguntar a la IA, el servidor debe tener los ultimos cambios del lienzo. */
  beforeAsk?: () => Promise<boolean>;
}

/**
 * Conversacion del equipo con la IA (ADR 0042 y 0044). Mientras la IA escribe,
 * su respuesta aparece a medida que llega. La lista solo baja sola si se
 * estaba mirando el final: quien lee mensajes antiguos no pierde el sitio.
 */
export function ChatPanel({ chat, currentUserId, canEdit, beforeAsk }: ChatPanelProps) {
  const list = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);
  const lastId = chat.messages.at(-1)?.id;
  const draft = chat.assistant.state === 'thinking' ? (chat.assistant.draft ?? '') : null;
  const aiAwaitsReply = aiAwaitsReplyFrom(chat.messages, currentUserId);

  const handleScroll = () => {
    const element = list.current;
    if (!element) return;
    atBottom.current =
      element.scrollHeight - element.scrollTop - element.clientHeight < STICK_TO_BOTTOM_PX;
  };

  useLayoutEffect(() => {
    const element = list.current;
    if (element && atBottom.current) element.scrollTop = element.scrollHeight;
  }, [lastId, draft]);

  // Al abrir el panel se empieza por el final de la conversacion.
  useEffect(() => {
    const element = list.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, []);

  const send = async (content: string, askAi: boolean, attachment?: OutgoingAttachment) => {
    try {
      if (askAi || /@ia\b/iu.test(content)) await beforeAsk?.();
      atBottom.current = true;
      await chat.send(content, askAi, attachment);
    } catch (error) {
      toast.error(`No se pudo enviar: ${await describeChatError(error)}`);
      throw error;
    }
  };

  const resolve = async (messageId: string, action: 'apply' | 'dismiss') => {
    try {
      const message = await chat.resolve(messageId, action);
      if (action === 'apply' && message.proposal?.result) {
        toast.success(`Aplicados ${message.proposal.result.applied} cambios al modelo`);
      }
    } catch (error) {
      toast.error(await describeChatError(error), { duration: 10000 });
    }
  };

  const askAgain = (questionId: string) => {
    chat.askAgain(questionId).catch(async (error: unknown) => {
      toast.error(await describeChatError(error));
    });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={list}
        onScroll={handleScroll}
        className="min-h-0 flex-1 overflow-y-auto px-4 py-3"
        aria-live="polite"
      >
        {chat.hasMore && (
          <Button
            variant="ghost"
            size="sm"
            className="mb-2 w-full text-xs"
            onClick={() => void chat.loadOlder()}
          >
            Cargar mensajes anteriores
          </Button>
        )}
        {chat.messages.length === 0 && (
          <p className="py-8 text-center text-xs text-muted-foreground">
            Todavia no hay mensajes. Escribe al equipo o pregunta a la IA con @ia: por ejemplo "@ia
            que le falta a este modelo?", envia la foto de un diagrama o graba una nota de voz.
          </p>
        )}
        <ul className="space-y-3">
          {chat.messages.map((message) => (
            <ChatMessageItem
              key={message.id}
              message={message}
              isOwn={message.kind === 'USER' && message.author?.id === currentUserId}
              canEdit={canEdit}
              onResolve={resolve}
              onAskAgain={askAgain}
            />
          ))}
        </ul>
        {draft !== null && (
          <div className="mt-3 space-y-0.5" role="status">
            <p className="flex items-center gap-1.5 px-1 text-[11px] text-muted-foreground">
              <Sparkles className="h-3 w-3 text-primary" />
              <span className="font-medium text-foreground">IA</span>
              {chat.assistant.askedBy && <span>respondiendo a {chat.assistant.askedBy}</span>}
              <Loader2 className="h-3 w-3 animate-spin" />
            </p>
            {draft === '' ? (
              <p className="px-1 text-xs text-muted-foreground">Pensando la respuesta...</p>
            ) : (
              <div className="max-w-[88%] whitespace-pre-wrap break-words rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
                {draft}
                <span className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse bg-primary align-middle" />
              </div>
            )}
          </div>
        )}
      </div>

      <div className="space-y-2 border-t border-border p-3">
        {!chat.connected && (
          <p className="text-[11px] text-amber-600 dark:text-amber-400">
            {chat.error ? `Sin conexion con el chat: ${chat.error}. ` : ''}Reconectando...
          </p>
        )}
        <ChatComposer onSend={send} aiAwaitsReply={aiAwaitsReply} />
      </div>
    </div>
  );
}
