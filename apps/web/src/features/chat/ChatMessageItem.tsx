import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { colorForUser } from '@/features/editor/lib/collab';
import { ChatProposalCard } from './ChatProposalCard';
import type { ChatMessage } from './chatTypes';

const timeFormat = new Intl.DateTimeFormat('es', { hour: '2-digit', minute: '2-digit' });

interface ChatMessageItemProps {
  message: ChatMessage;
  isOwn: boolean;
  canEdit: boolean;
  onResolve: (messageId: string, action: 'apply' | 'dismiss') => Promise<void>;
}

/** Un mensaje del chat: propio a la derecha, ajeno a la izquierda y la IA destacada. */
export function ChatMessageItem({ message, isOwn, canEdit, onResolve }: ChatMessageItemProps) {
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
        {message.content}
        {message.proposal && (
          <ChatProposalCard
            proposal={message.proposal}
            canEdit={canEdit}
            onResolve={(action) => onResolve(message.id, action)}
          />
        )}
      </div>
    </li>
  );
}
