import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useEditorPanels } from './useEditorPanels';

describe('paneles del editor', () => {
  it('en pantalla ancha arrancan abiertos y se pueden tener los dos', () => {
    const { result } = renderHook(() => useEditorPanels(false));
    expect(result.current.leftOpen).toBe(true);
    expect(result.current.rightOpen).toBe(true);
  });

  it('en modo compacto arrancan cerrados y solo se abre uno cada vez', () => {
    const { result } = renderHook(() => useEditorPanels(true));
    expect(result.current.leftOpen).toBe(false);
    expect(result.current.rightOpen).toBe(false);

    act(() => result.current.toggleLeft());
    expect(result.current.leftOpen).toBe(true);

    act(() => result.current.toggleRight());
    expect(result.current.rightOpen).toBe(true);
    expect(result.current.leftOpen).toBe(false);

    act(() => result.current.closeRight());
    expect(result.current.rightOpen).toBe(false);
  });

  it('al estrechar la ventana cierra los paneles y al ensancharla los recupera', () => {
    const { result, rerender } = renderHook(({ compact }) => useEditorPanels(compact), {
      initialProps: { compact: false },
    });
    rerender({ compact: true });
    expect(result.current.leftOpen).toBe(false);
    expect(result.current.rightOpen).toBe(false);

    rerender({ compact: false });
    expect(result.current.leftOpen).toBe(true);
    expect(result.current.rightOpen).toBe(true);
  });
});
