import { useCallback, useEffect, useState } from 'react';

/**
 * Estado de la paleta y del inspector. En pantalla ancha ambos arrancan
 * abiertos y fijos; en modo compacto arrancan cerrados y solo se abre uno cada
 * vez, porque flotan sobre el lienzo y dos a la vez lo taparian entero. Al
 * cambiar de modo (redimensionar la ventana) se vuelve a su estado por defecto.
 */
export function useEditorPanels(compact: boolean) {
  const [leftOpen, setLeftOpen] = useState(!compact);
  const [rightOpen, setRightOpen] = useState(!compact);

  useEffect(() => {
    setLeftOpen(!compact);
    setRightOpen(!compact);
  }, [compact]);

  const toggleLeft = useCallback(() => {
    const next = !leftOpen;
    setLeftOpen(next);
    if (next && compact) setRightOpen(false);
  }, [leftOpen, compact]);

  const toggleRight = useCallback(() => {
    const next = !rightOpen;
    setRightOpen(next);
    if (next && compact) setLeftOpen(false);
  }, [rightOpen, compact]);

  const closeLeft = useCallback(() => setLeftOpen(false), []);
  const closeRight = useCallback(() => setRightOpen(false), []);

  return { leftOpen, rightOpen, toggleLeft, toggleRight, closeLeft, closeRight };
}
