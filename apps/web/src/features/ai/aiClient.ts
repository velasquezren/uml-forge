import { HTTPError } from 'ky';
import type {
  Result,
  UMLModel,
  UmlError,
  UmlOperation,
  UmlOperationInput,
} from '@uml-forge/uml-core';
import { apiClient } from '@/lib/api';

/** Estado del proveedor de IA configurado en el servidor. */
export interface AiStatus {
  provider: string;
  available: boolean;
  model: string;
}

/** Respuesta del modulo de IA: explicacion mas operaciones a aplicar. */
export interface AiSuggestion {
  explanation: string;
  operations: UmlOperation[];
}

export type AiResult = { ok: true; suggestion: AiSuggestion } | { ok: false; error: string };

/** Traduce el error de la API a un mensaje presentable. */
async function describeError(error: unknown): Promise<string> {
  if (error instanceof HTTPError) {
    try {
      const body = await error.response.json<{ message?: string | string[] }>();
      const message = body.message;
      if (Array.isArray(message)) {
        return message.join('; ');
      }
      if (typeof message === 'string') {
        return message;
      }
    } catch {
      // Sin cuerpo JSON se informa del codigo de estado.
    }
    return `La API respondio ${error.response.status}`;
  }
  return error instanceof Error ? error.message : 'Error desconocido';
}

async function requestSuggestion(path: string, json: Record<string, unknown>): Promise<AiResult> {
  try {
    const suggestion = await apiClient.post(path, { json, timeout: 120000 }).json<AiSuggestion>();
    return { ok: true, suggestion };
  } catch (error) {
    return { ok: false, error: await describeError(error) };
  }
}

/** Consulta si hay proveedor de IA disponible en el servidor. */
export async function fetchAiStatus(): Promise<AiStatus | null> {
  try {
    return await apiClient.get('ai/status').json<AiStatus>();
  } catch {
    return null;
  }
}

/** Genera operaciones UML a partir de una instruccion en lenguaje natural. */
export function generateFromPrompt(prompt: string, currentModel?: UMLModel): Promise<AiResult> {
  return requestSuggestion('ai/generate', currentModel ? { prompt, currentModel } : { prompt });
}

/** Interpreta la foto de un diagrama y devuelve las operaciones equivalentes. */
export function generateFromImage(
  imageBase64: string,
  mimeType = 'image/png',
  prompt?: string,
  currentModel?: UMLModel,
): Promise<AiResult> {
  const body: Record<string, unknown> = { imageBase64, mimeType };
  if (prompt) {
    body.prompt = prompt;
  }
  if (currentModel) {
    body.currentModel = currentModel;
  }
  return requestSuggestion('ai/image', body);
}

/** Audita un modelo existente y propone refinamientos. */
export function refineModel(model: UMLModel, context?: string): Promise<AiResult> {
  return requestSuggestion('ai/refine', context ? { model, context } : { model });
}

/** Resumen de lo que se pudo aplicar de una sugerencia. */
export interface AiApplyReport {
  applied: number;
  failed: number;
  firstError?: string;
}

/**
 * Aplica las operaciones sugeridas sobre el lienzo. Es el unico punto de union
 * entre la IA y el modelo: el dictado por voz y la lectura de imagenes usan
 * esta funcion en lugar de escribir en el CRDT. Una operacion que el
 * metamodelo rechaza no interrumpe al resto: se cuenta y se informa.
 */
export function applyAiOperations(
  operations: readonly UmlOperation[],
  applyOperation: (op: UmlOperationInput) => Result<UMLModel, UmlError>,
): AiApplyReport {
  const report: AiApplyReport = { applied: 0, failed: 0 };

  for (const operation of operations) {
    const result = applyOperation(operation);
    if (result.ok) {
      report.applied += 1;
    } else {
      report.failed += 1;
      report.firstError ??= result.error.message;
    }
  }

  return report;
}
