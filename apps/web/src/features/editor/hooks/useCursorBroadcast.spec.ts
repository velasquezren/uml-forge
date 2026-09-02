import { describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';

// El lienzo real no se monta en las pruebas: basta con una conversion conocida
// de coordenadas de pantalla a coordenadas del diagrama.
vi.mock('@xyflow/react', () => ({
  useReactFlow: () => ({
    screenToFlowPosition: ({ x, y }: { x: number; y: number }) => ({ x: x * 2, y: y * 2 }),
  }),
}));

const { useCursorBroadcast } = await import('./useCursorBroadcast');

function pointerAt(x: number, y: number): React.PointerEvent<HTMLDivElement> {
  return { clientX: x, clientY: y } as unknown as React.PointerEvent<HTMLDivElement>;
}

describe('useCursorBroadcast', () => {
  it('publica el cursor en coordenadas del lienzo y limita la frecuencia', () => {
    const publishCursor = vi.fn();
    const { result } = renderHook(() => useCursorBroadcast(publishCursor));

    act(() => result.current.handlePointerMove(pointerAt(10, 20)));
    expect(publishCursor).toHaveBeenCalledWith({ x: 20, y: 40 });

    // Un segundo movimiento inmediato cae dentro de la ventana de limitacion.
    act(() => result.current.handlePointerMove(pointerAt(11, 21)));
    expect(publishCursor).toHaveBeenCalledTimes(1);
  });

  it('retira el cursor al salir del lienzo', () => {
    const publishCursor = vi.fn();
    const { result } = renderHook(() => useCursorBroadcast(publishCursor));

    act(() => result.current.handlePointerLeave());
    expect(publishCursor).toHaveBeenLastCalledWith(null);
  });

  it('retira el cursor al desmontar el lienzo', () => {
    const publishCursor = vi.fn();
    const { unmount } = renderHook(() => useCursorBroadcast(publishCursor));

    unmount();
    expect(publishCursor).toHaveBeenLastCalledWith(null);
  });
});
