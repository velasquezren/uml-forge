import { useCallback, useEffect, useRef, useState } from 'react';
import { EDIT_IDLE_MS } from '../lib/editLock';

/**
 * Actividad de edicion local. Cada cambio en el modelo renueva un temporizador;
 * mientras corre, la persona "esta editando" y se anuncia a los demas por el
 * canal de awareness. Solo se publica al entrar y al salir de ese estado: el
 * awareness se difunde en cada escritura y una por pulsacion saturaria la red.
 */
export function useEditActivity(publish: (editing: boolean) => void) {
  const [isEditing, setIsEditing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const publishRef = useRef(publish);
  publishRef.current = publish;

  const markEditing = useCallback(() => {
    if (timerRef.current === null) {
      setIsEditing(true);
      publishRef.current(true);
    } else {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      setIsEditing(false);
      publishRef.current(false);
    }, EDIT_IDLE_MS);
  }, []);

  useEffect(
    () => () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
    },
    [],
  );

  return { isEditing, markEditing };
}
