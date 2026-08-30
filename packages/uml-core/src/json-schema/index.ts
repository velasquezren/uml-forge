import { z } from 'zod';
import { UmlOperationSchema } from '../operations/schema.js';
import { UMLModelSchema } from '../schemas/model.js';

/**
 * JSON Schema derivados de los esquemas Zod. Son lo que se le entrega a un
 * modelo de lenguaje para forzar salida estructurada. Se derivan siempre, nunca
 * se escriben a mano: el esquema Zod es la unica fuente de verdad. Ver ADR 0006.
 */

/** Esquema de una sola operacion, en su forma de entrada (con opcionales). */
export function umlOperationJsonSchema(): Record<string, unknown> {
  return z.toJSONSchema(UmlOperationSchema, { io: 'input' });
}

/** Esquema de una lista de operaciones, que es lo que se pide a la IA. */
export function umlOperationListJsonSchema(): Record<string, unknown> {
  return z.toJSONSchema(z.object({ operations: z.array(UmlOperationSchema) }), { io: 'input' });
}

/** Esquema del modelo completo, util para documentacion y contratos. */
export function umlModelJsonSchema(): Record<string, unknown> {
  return z.toJSONSchema(UMLModelSchema, { io: 'output' });
}
