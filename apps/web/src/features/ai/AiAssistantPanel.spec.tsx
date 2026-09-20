import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Result, UMLModel, UmlError, UmlOperationInput } from '@uml-forge/uml-core';
import type * as AiClientModule from './aiClient';

const fetchAiStatusMock = vi.fn();
const generateFromPromptMock = vi.fn();

vi.mock('./aiClient', async (importOriginal) => {
  const actual = await importOriginal<typeof AiClientModule>();
  return {
    ...actual,
    fetchAiStatus: () => fetchAiStatusMock() as unknown,
    generateFromPrompt: (...args: unknown[]) => generateFromPromptMock(...args) as unknown,
  };
});

const { AiAssistantPanel } = await import('./AiAssistantPanel');

function applyOk(): Result<UMLModel, UmlError> {
  return { ok: true, value: {} as UMLModel };
}

describe('AiAssistantPanel', () => {
  beforeEach(() => {
    fetchAiStatusMock.mockReset();
    generateFromPromptMock.mockReset();
    fetchAiStatusMock.mockReturnValue(
      Promise.resolve({ provider: 'gemini', available: true, model: 'gemini-2.5-flash' }),
    );
  });

  it('muestra el proveedor de IA activo', async () => {
    render(<AiAssistantPanel model={null} applyOperation={applyOk} />);

    expect(await screen.findByText(/gemini · gemini-2.5-flash/i)).toBeInTheDocument();
  });

  it('pide operaciones a la IA y solo las aplica tras confirmarlas', async () => {
    const operations = [{ type: 'addClass', class: { id: 'c1', name: 'Pet' } }];
    generateFromPromptMock.mockReturnValue(
      Promise.resolve({
        ok: true,
        suggestion: { explanation: 'Se crea la clase Pet', operations },
      }),
    );
    const applyOperation = vi
      .fn<(op: UmlOperationInput) => Result<UMLModel, UmlError>>()
      .mockReturnValue(applyOk());

    render(<AiAssistantPanel model={null} applyOperation={applyOperation} />);

    fireEvent.change(screen.getByLabelText(/Instruccion para la IA/i), {
      target: { value: 'una veterinaria con mascotas' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Generar/i }));

    expect(await screen.findByText('Se crea la clase Pet')).toBeInTheDocument();
    expect(generateFromPromptMock).toHaveBeenCalledWith('una veterinaria con mascotas', undefined);
    // Hasta aqui el modelo no se ha tocado.
    expect(applyOperation).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /Aplicar 1 operaciones/i }));

    await waitFor(() => expect(applyOperation).toHaveBeenCalledTimes(1));
  });

  it('avisa cuando la IA no responde', async () => {
    generateFromPromptMock.mockReturnValue(
      Promise.resolve({ ok: false, error: 'proveedor no disponible' }),
    );

    render(<AiAssistantPanel model={null} applyOperation={applyOk} />);

    fireEvent.change(screen.getByLabelText(/Instruccion para la IA/i), {
      target: { value: 'algo' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Generar/i }));

    await waitFor(() => expect(screen.queryByText(/Se crea/i)).not.toBeInTheDocument());
    expect(generateFromPromptMock).toHaveBeenCalled();
  });
});
