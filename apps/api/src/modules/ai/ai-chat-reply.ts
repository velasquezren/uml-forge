import type { UMLModel } from '@uml-forge/uml-core';
import { mapAiOperationsToUmlOperations } from './ai-operation-mapper';
import type { AiChatReply } from './interfaces/ai-provider.interface';
import { extractJsonObject } from './providers/json-extraction';

type JsonObject = Record<string, unknown>;

function asObject(value: unknown): JsonObject | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as JsonObject)
    : null;
}

/** Cierto si el objeto trae al menos una lista de elementos del modelo. */
function hasModelLists(value: JsonObject): boolean {
  return ['classes', 'enums', 'relationships', 'operations', 'changes'].some((key) =>
    Array.isArray(value[key]),
  );
}

/**
 * Interpreta la respuesta del chat, venga de Gemini con esquema o de un modelo
 * local menos disciplinado. La propuesta pasa por el mismo mapeador y la misma
 * normalizacion que el asistente: reutiliza clases, traduce tipos y coloca lo
 * nuevo bajo el diagrama (ADR 0035). Si el modelo devolvio texto sin JSON, ese
 * texto es la respuesta.
 */
export function parseChatReply(rawText: string, model?: UMLModel): AiChatReply {
  const candidate = extractJsonObject(rawText);
  let parsed: JsonObject | null = null;
  if (candidate !== null) {
    try {
      parsed = asObject(JSON.parse(candidate));
    } catch {
      parsed = null;
    }
  }

  if (parsed === null) {
    const text = rawText.trim();
    return { reply: text || 'No he podido generar una respuesta.', proposal: null };
  }

  const reply =
    typeof parsed.reply === 'string' && parsed.reply.trim() !== ''
      ? parsed.reply.trim()
      : typeof parsed.explanation === 'string'
        ? parsed.explanation.trim()
        : 'No he podido generar una respuesta.';

  // La propuesta suele venir en `proposal`; algunos modelos la ponen en la raiz.
  const proposalSource = asObject(parsed.proposal) ?? (hasModelLists(parsed) ? parsed : null);
  if (proposalSource === null) {
    return { reply, proposal: null };
  }

  const operations = mapAiOperationsToUmlOperations(proposalSource, model);
  if (operations.length === 0) {
    return { reply, proposal: null };
  }

  const explanation =
    typeof proposalSource.explanation === 'string' && proposalSource.explanation.trim() !== ''
      ? proposalSource.explanation.trim()
      : reply;
  return { reply, proposal: { explanation, operations } };
}
