import { ViewportPortal, useStore } from '@xyflow/react';
import type { UserAwarenessState } from '../types';

/** Estado de presencia que ya tiene cursor publicado. */
type CursorState = UserAwarenessState & { cursor: { x: number; y: number } };

interface RemoteCursorsProps {
  users: readonly UserAwarenessState[];
}

/**
 * Dibuja el puntero de los demas participantes dentro del sistema de
 * coordenadas del lienzo, de modo que cada uno lo ve sobre el mismo punto del
 * modelo aunque tenga otro encuadre. El tamanno se compensa con el zoom para
 * que el cursor no crezca ni se encoja al acercar el diagrama.
 */
export function RemoteCursors({ users }: RemoteCursorsProps) {
  const zoom = useStore((state) => state.transform[2]);
  const withCursor = users.filter((user): user is CursorState => user.cursor !== undefined);

  if (withCursor.length === 0) {
    return null;
  }

  return (
    <ViewportPortal>
      {withCursor.map((state) => (
        <div
          key={state.user.id}
          className="pointer-events-none absolute z-50 flex items-start"
          style={{
            transform: `translate(${state.cursor.x}px, ${state.cursor.y}px) scale(${1 / zoom})`,
            transformOrigin: '0 0',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <path
              d="M2 2 L2 14 L5.5 10.5 L8 15.5 L10.5 14 L8 9.5 L13 9.5 Z"
              fill={state.user.color}
              stroke="white"
              strokeWidth="1"
            />
          </svg>
          <span
            className="ml-1 rounded px-1.5 py-0.5 text-[10px] font-medium text-white shadow-sm"
            style={{ backgroundColor: state.user.color }}
          >
            {state.user.name}
          </span>
        </div>
      ))}
    </ViewportPortal>
  );
}
