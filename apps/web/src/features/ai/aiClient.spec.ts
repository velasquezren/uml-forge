import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UmlOperation } from '@uml-forge/uml-core';

const postMock = vi.fn<(...args: unknown[]) => unknown>();
const getMock = vi.fn<(...args: unknown[]) => unknown>();

vi.mock('@/lib/api', () => ({
  apiClient: {
    post: (...args: unknown[]) => postMock(...args),
    get: (...args: unknown[]) => getMock(...args),
  },
}));

const { applyAiOperations, fetchAiStatus, generateFromPrompt } = await import('./aiClient');

describe('aiClient', () => {
  beforeEach(() => {
    postMock.mockReset();
    getMock.mockReset();
  });

  it('devuelve el estado del proveedor de IA', async () => {
    getMock.mockReturnValue({
      json: () =>
        Promise.resolve({ provider: 'gemini', available: true, model: 'gemini-2.5-flash' }),
    });

    await expect(fetchAiStatus()).resolves.toEqual({
      provider: 'gemini',
      available: true,
      model: 'gemini-2.5-flash',
    });
  });

  it('devuelve null si el servidor no responde al estado', async () => {
    getMock.mockReturnValue({ json: () => Promise.reject(new Error('sin red')) });

    await expect(fetchAiStatus()).resolves.toBeNull();
  });

  it('pide operaciones a partir de una instruccion en lenguaje natural', async () => {
    postMock.mockReturnValue({
      json: () => Promise.resolve({ explanation: 'Dos clases', operations: [] }),
    });

    const result = await generateFromPrompt('una veterinaria con mascotas y duenos');

    expect(postMock).toHaveBeenCalledWith(
      'ai/generate',
      expect.objectContaining({ json: { prompt: 'una veterinaria con mascotas y duenos' } }),
    );
    expect(result).toEqual({ ok: true, suggestion: { explanation: 'Dos clases', operations: [] } });
  });

  it('informa del motivo cuando la IA falla', async () => {
    postMock.mockReturnValue({ json: () => Promise.reject(new Error('proveedor no disponible')) });

    await expect(generateFromPrompt('algo')).resolves.toEqual({
      ok: false,
      error: 'proveedor no disponible',
    });
  });

  it('aplica las operaciones sugeridas sobre el lienzo', () => {
    const applyOperation = vi.fn();
    const operations = [
      { type: 'addClass', class: { id: 'c1', name: 'Pet' } },
      { type: 'deleteClass', id: 'c1' },
    ] as unknown as UmlOperation[];

    expect(applyAiOperations(operations, applyOperation)).toBe(2);
    expect(applyOperation).toHaveBeenCalledTimes(2);
  });
});
