import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Loader2, Send, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { describeChatError } from './chatClient';
import { ChatMessageItem } from './ChatMessageItem';
import type { useProjectChat } from './useProjectChat';

interface ChatPanelProps {
  chat: ReturnType<typeof useProjectChat>;
  currentUserId: string | undefined;
  canEdit: boolean;
  /** Antes de preguntar a la IA, el servidor debe tener los ultimos cambios del lienzo. */
  beforeAsk?: () => Promise<boolean>;
}

/**
 * Conversacion del equipo con la IA. Enter envia y Mayusculas+Enter salta de
 * linea; el boton de la IA (o escribir @ia) hace que la IA responda.
 */
export function ChatPanel({ chat, currentUserId, canEdit, beforeAsk }: ChatPanelProps) {
  const [draft, setDraft] = useState('');
  const [askAi, setAskAi] = useState(false);
  const [sending, setSending] = useState(false);
  const listEnd = useRef<HTMLDivElement>(null);
  const lastId = chat.messages.at(-1)?.id;

  // Baja al ultimo mensaje cuando llega uno nuevo o la IA empieza a escribir.
  useEffect(() => {
    listEnd.current?.scrollIntoView({ block: 'end' });
  }, [lastId, chat.assistant.state]);

  const send = async () => {
    const content = draft.trim();
    if (content === '' || sending) return;
    setSending(true);
    try {
      if (askAi || /@ia\b/iu.test(content)) await beforeAsk?.();
      await chat.send(content, askAi);
      setDraft('');
      setAskAi(false);
    } catch (error) {
      toast.error(`No se pudo enviar: ${await describeChatError(error)}`);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void send();
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

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3" aria-live="polite">
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
            que le falta a este modelo?" o "@ia anade una clase Factura".
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
            />
          ))}
        </ul>
        {chat.assistant.state === 'thinking' && (
          <p role="status" className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            La IA esta preparando la respuesta
            {chat.assistant.askedBy ? ` para ${chat.assistant.askedBy}` : ''}...
          </p>
        )}
        <div ref={listEnd} />
      </div>

      <div className="space-y-2 border-t border-border p-3">
        {!chat.connected && (
          <p className="text-[11px] text-amber-600 dark:text-amber-400">
            {chat.error ? `Sin conexion con el chat: ${chat.error}. ` : ''}Reconectando...
          </p>
        )}
        <Textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={askAi ? 'Pregunta o pide algo a la IA...' : 'Escribe al equipo (o usa @ia)'}
          aria-label="Mensaje para el chat del equipo"
          className="min-h-16 resize-none text-sm"
          maxLength={4000}
        />
        <div className="flex items-center justify-between gap-2">
          <Button
            type="button"
            variant={askAi ? 'default' : 'outline'}
            size="sm"
            className={cn('h-8 gap-1.5 text-xs')}
            aria-pressed={askAi}
            onClick={() => setAskAi((value) => !value)}
            title="La IA respondera a este mensaje"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Preguntar a la IA
          </Button>
          <Button
            size="sm"
            className="h-8 gap-1.5 text-xs"
            disabled={sending || draft.trim() === ''}
            onClick={() => void send()}
          >
            {sending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            Enviar
          </Button>
        </div>
      </div>
    </div>
  );
}
