import { RotateCcw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { colorForUser } from '@/features/editor/lib/collab';
import { ChatAttachmentView } from './ChatAttachmentView';
import { ChatProposalCard } from './ChatProposalCard';
import type { ChatMessage } from './chatTypes';

const timeFormat = new Intl.DateTimeFormat('es', { hour: '2-digit', minute: '2-digit' });

interface ChatMessageItemProps {
  message: ChatMessage;
  isOwn: boolean;
  canEdit: boolean;
  onResolve: (messageId: string, action: 'apply' | 'dismiss') => Promise<void>;
  /** Vuelve a preguntar a la IA tras una respuesta fallida. */
  onAskAgain?: (questionId: string) => void;
}

/** Un mensaje del chat: propio a la derecha, ajeno a la izquierda y la IA destacada. */
export function ChatMessageItem({
  message,
  isOwn,
  canEdit,
  onResolve,
  onAskAgain,
}: ChatMessageItemProps) {
  const isAssistant = message.kind === 'ASSISTANT';
  const authorName = isAssistant ? 'IA' : (message.author?.name ?? 'Usuario eliminado');
  const color = message.author ? colorForUser(message.author.id) : undefined;

  return (
    <li className={cn('flex flex-col gap-0.5', isOwn ? 'items-end' : 'items-start')}>
      <div className="flex items-center gap-1.5 px-1 text-[11px] text-muted-foreground">
        {isAssistant ? (
          <Sparkles className="h-3 w-3 text-primary" aria-hidden />
        ) : (
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: color }}
            aria-hidden
          />
        )}
        <span className="font-medium text-foreground">{isOwn ? 'Tu' : authorName}</span>
        {message.replyTo && <span>respondiendo a {message.replyTo.authorName}</span>}
        <time dateTime={message.createdAt}>{timeFormat.format(new Date(message.createdAt))}</time>
      </div>
      <div
        className={cn(
          'max-w-[88%] whitespace-pre-wrap break-words rounded-lg px-3 py-2 text-sm',
          isOwn && 'bg-primary text-primary-foreground',
          !isOwn && !isAssistant && 'bg-muted',
          isAssistant && !message.isError && 'border border-primary/30 bg-primary/5',
          message.isError && 'border border-destructive/40 bg-destructive/10',
        )}
      >
        {message.attachment && (
          <div className={message.content ? 'mb-1.5' : undefined}>
            <ChatAttachmentView
              projectId={message.projectId}
              attachment={message.attachment}
              transcript={message.transcript}
            />
          </div>
        )}
        {message.content}
        {message.proposal && (
          <ChatProposalCard
            proposal={message.proposal}
            canEdit={canEdit}
            onResolve={(action) => onResolve(message.id, action)}
          />
        )}
      </div>
      {message.isError && message.replyTo && onAskAgain && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 gap-1 px-2 text-[11px]"
          onClick={() => onAskAgain(message.replyTo?.id ?? '')}
        >
          <RotateCcw className="h-3 w-3" /> Volver a preguntar
        </Button>
      )}
    </li>
  );
}
