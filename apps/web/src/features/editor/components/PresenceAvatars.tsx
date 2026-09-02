import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { initialsFor } from '../lib/presence';
import type { UserAwarenessState } from '../types';

/** Numero maximo de avatares visibles antes de agrupar el resto en un contador. */
const MAX_VISIBLE = 4;

interface PresenceAvatarsProps {
  remoteUsers: readonly UserAwarenessState[];
  currentUserName?: string;
}

/**
 * Muestra quien esta editando el diagrama en este momento. El primer avatar es
 * siempre el usuario local, para que se reconozca su propio color en el lienzo.
 */
export function PresenceAvatars({ remoteUsers, currentUserName }: PresenceAvatarsProps) {
  const visible = remoteUsers.slice(0, MAX_VISIBLE);
  const hidden = remoteUsers.length - visible.length;
  const total = remoteUsers.length + 1;

  return (
    <div className="flex items-center space-x-2" aria-label="Participantes conectados">
      <div className="flex -space-x-1.5">
        <Avatar
          size="sm"
          className="ring-1 ring-background"
          title={`${currentUserName ?? 'Tu'} (tu)`}
        >
          <AvatarFallback className="bg-primary text-[9px] text-primary-foreground">
            {initialsFor(currentUserName ?? 'Tu')}
          </AvatarFallback>
        </Avatar>

        {visible.map((state) => (
          <Avatar
            key={state.user.id}
            size="sm"
            className="ring-1 ring-background"
            title={state.user.name}
          >
            <AvatarFallback
              className="text-[9px] text-white"
              style={{ backgroundColor: state.user.color }}
            >
              {initialsFor(state.user.name)}
            </AvatarFallback>
          </Avatar>
        ))}

        {hidden > 0 && (
          <Avatar
            size="sm"
            className="ring-1 ring-background"
            title={`${hidden} participantes mas`}
          >
            <AvatarFallback className="text-[9px]">+{hidden}</AvatarFallback>
          </Avatar>
        )}
      </div>

      <span>{total} en linea</span>
    </div>
  );
}
