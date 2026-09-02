import { useCallback, useEffect, useRef } from 'react';
import { useReactFlow } from '@xyflow/react';

/** Cadencia maxima de publicacion del cursor, en milisegundos. */
const CURSOR_INTERVAL_MS = 60;

interface CursorPosition {
  x: number;
  y: number;
}

/**
 * Traduce el puntero del raton a coordenadas del lienzo y lo publica con un
 * limite de frecuencia. Sin ese limite cada pixel del movimiento generaria un
 * mensaje de awareness y saturaria la conexion con el servidor de colaboracion.
 */
export function useCursorBroadcast(publishCursor: (position: CursorPosition | null) => void) {
  const { screenToFlowPosition } = useReactFlow();
  const lastSentAtRef = useRef(0);

  // Al desmontar el lienzo el cursor propio deja de existir para los demas.
  useEffect(() => {
    return () => publishCursor(null);
  }, [publishCursor]);

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const now = Date.now();
      if (now - lastSentAtRef.current < CURSOR_INTERVAL_MS) {
        return;
      }
      lastSentAtRef.current = now;

      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      publishCursor({ x: Math.round(position.x), y: Math.round(position.y) });
    },
    [screenToFlowPosition, publishCursor],
  );

  const handlePointerLeave = useCallback(() => {
    publishCursor(null);
  }, [publishCursor]);

  return { handlePointerMove, handlePointerLeave };
}
