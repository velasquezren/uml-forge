import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useSpeechRecognition } from './useSpeechRecognition';

/** Doble del reconocedor nativo: guarda la instancia para dispararle eventos. */
class FakeRecognition {
  static last: FakeRecognition | null = null;
  lang = '';
  continuous = false;
  interimResults = false;
  onresult: ((event: SpeechRecognitionEvent) => void) | null = null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null = null;
  onend: (() => void) | null = null;
  start = vi.fn(() => {
    FakeRecognition.last = this;
  });
  stop = vi.fn();
  abort = vi.fn();
}

function emitFinalResult(text: string): void {
  const event = {
    resultIndex: 0,
    results: [Object.assign([{ transcript: text }], { isFinal: true })],
  } as unknown as SpeechRecognitionEvent;
  FakeRecognition.last?.onresult?.(event);
}

afterEach(() => {
  Reflect.deleteProperty(window, 'SpeechRecognition');
  FakeRecognition.last = null;
});

describe('useSpeechRecognition', () => {
  it('informa de que no hay soporte cuando el navegador no trae la API', () => {
    const { result } = renderHook(() => useSpeechRecognition());

    expect(result.current.isSupported).toBe(false);
  });

  it('entrega el texto dictado cuando el resultado es definitivo', () => {
    Object.defineProperty(window, 'SpeechRecognition', {
      configurable: true,
      writable: true,
      value: FakeRecognition,
    });
    const onResult = vi.fn();
    const { result } = renderHook(() => useSpeechRecognition({ onResult }));

    expect(result.current.isSupported).toBe(true);

    act(() => result.current.start());
    expect(FakeRecognition.last?.lang).toBe('es-ES');

    act(() => emitFinalResult('una veterinaria con mascotas y duenos'));
    expect(onResult).toHaveBeenCalledWith('una veterinaria con mascotas y duenos');
  });
});
