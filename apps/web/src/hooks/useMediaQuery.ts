import { useEffect, useState } from 'react';

/**
 * Ancho por debajo del cual el editor pasa a modo compacto: media pantalla en
 * un monitor de 1920 px, una ventana dividida en un portatil o una tableta. En
 * ese modo los paneles flotan sobre el lienzo en lugar de estrecharlo (ADR 0037).
 */
export const COMPACT_EDITOR_QUERY = '(max-width: 1279.98px)';

/** Sigue una media query de CSS y se actualiza al redimensionar la ventana. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => readQuery(query));

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [query]);

  return matches;
}

/** Cierto cuando la ventana es demasiado estrecha para paneles fijos a los lados. */
export function useCompactEditor(): boolean {
  return useMediaQuery(COMPACT_EDITOR_QUERY);
}

function readQuery(query: string): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia(query).matches
  );
}
