import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  Result,
  UMLModel,
  UmlError,
  UmlOperation,
  UmlOperationInput,
} from '@uml-forge/uml-core';

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

  it('aplica las operaciones sugeridas y cuenta las que rechaza el metamodelo', () => {
    const operations = [
      { type: 'addClass', class: { id: 'c1', name: 'Pet' } },
      { type: 'deleteClass', id: 'desconocida' },
    ] as unknown as UmlOperation[];

    const applyOperation = vi
      .fn<(op: UmlOperationInput) => Result<UMLModel, UmlError>>()
      .mockReturnValueOnce({ ok: true, value: {} as UMLModel })
      .mockReturnValueOnce({
        ok: false,
        error: { code: 'class_not_found', message: 'La clase no existe' } satisfies UmlError,
      });

    expect(applyAiOperations(operations, applyOperation)).toEqual({
      applied: 1,
      failed: 1,
      firstError: 'La clase no existe',
    });
    expect(applyOperation).toHaveBeenCalledTimes(2);
  });
});
