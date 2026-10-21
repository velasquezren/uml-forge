import { useCallback, useState } from 'react';
import { MessagesSquare } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ChatPanel } from './ChatPanel';
import type { ChatMessage } from './chatTypes';
import { useProjectChat } from './useProjectChat';

interface ChatSheetProps {
  projectId: string;
  currentUser: { id: string; name: string } | null;
  canEdit: boolean;
  beforeAsk?: () => Promise<boolean>;
}

/**
 * Boton del chat del equipo en la barra del editor y su panel lateral. El chat
 * sigue conectado con el panel cerrado: el contador muestra los mensajes sin
 * leer y un aviso indica cuando la IA ha respondido a la persona.
 */
export function ChatSheet({ projectId, currentUser, canEdit, beforeAsk }: ChatSheetProps) {
  const [open, setOpen] = useState(false);

  const handleAssistantReply = useCallback(
    (message: ChatMessage) => {
      if (!open && message.replyTo?.authorName === currentUser?.name) {
        toast.info('La IA te ha respondido en el chat del equipo', {
          action: { label: 'Ver', onClick: () => setOpen(true) },
        });
      }
    },
    [open, currentUser?.name],
  );

  const chat = useProjectChat({
    projectId,
    currentUserId: currentUser?.id,
    isOpen: open,
    onMention: handleAssistantReply,
  });

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="relative h-8 gap-1.5 px-2 text-xs"
        onClick={() => setOpen(true)}
        title="Chat del equipo con la IA"
        data-chat-connected={chat.connected}
        aria-label={
          chat.unread > 0 ? `Chat del equipo, ${chat.unread} sin leer` : 'Chat del equipo'
        }
      >
        <MessagesSquare className="h-4 w-4" />
        <span className="hidden xl:inline">Chat</span>
        {chat.unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-primary px-1 text-center text-[10px] leading-4 text-primary-foreground">
            {chat.unread > 99 ? '99+' : chat.unread}
          </span>
        )}
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
          <SheetHeader className="border-b border-border">
            <SheetTitle>Chat del equipo</SheetTitle>
            <SheetDescription>
              Todos los miembros del proyecto ven esta conversacion. Escribe @ia para preguntar a la
              IA: conoce el modelo y puede proponer cambios que un editor aplica.
            </SheetDescription>
          </SheetHeader>
          <ChatPanel
            chat={chat}
            currentUserId={currentUser?.id}
            canEdit={canEdit}
            beforeAsk={beforeAsk}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
