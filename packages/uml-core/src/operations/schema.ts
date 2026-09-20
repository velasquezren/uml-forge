import { z } from 'zod';
import { fromZodError, type UmlError } from '../errors.js';
import { err, ok, type Result } from '../result.js';
import { IdSchema, PositionSchema } from '../schemas/primitives.js';
import {
  AttributeChangesSchema,
  AttributeInputSchema,
  ClassChangesSchema,
  ClassInputSchema,
  EnumChangesSchema,
  EnumInputSchema,
  OperationChangesSchema,
  OperationInputSchema,
  RelationshipChangesSchema,
  RelationshipInputSchema,
} from './payloads.js';

/**
 * Lenguaje de operaciones del metamodelo. Es lo que emite la IA, lo que viaja
 * en la cola offline y lo que se aplica sobre el documento Yjs. Ningun productor
 * devuelve jamas un modelo completo, solo operaciones incrementales.
 *
 * Cuidado con los nombres: `UmlOperation` es una operacion de este lenguaje;
 * `UMLOperation` es una operacion (metodo) de una clase del modelo.
 */
export const UmlOperationSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('addClass'), class: ClassInputSchema }),
  z.object({ type: z.literal('updateClass'), id: IdSchema, changes: ClassChangesSchema }),
  z.object({ type: z.literal('deleteClass'), id: IdSchema }),

  z.object({ type: z.literal('addAttribute'), classId: IdSchema, attribute: AttributeInputSchema }),
  z.object({ type: z.literal('updateAttribute'), id: IdSchema, changes: AttributeChangesSchema }),
  z.object({ type: z.literal('deleteAttribute'), id: IdSchema }),

  z.object({ type: z.literal('addOperation'), classId: IdSchema, operation: OperationInputSchema }),
  z.object({ type: z.literal('updateOperation'), id: IdSchema, changes: OperationChangesSchema }),
  z.object({ type: z.literal('deleteOperation'), id: IdSchema }),

  z.object({ type: z.literal('addRelationship'), relationship: RelationshipInputSchema }),
  z.object({
    type: z.literal('updateRelationship'),
    id: IdSchema,
    changes: RelationshipChangesSchema,
  }),
  z.object({ type: z.literal('deleteRelationship'), id: IdSchema }),

  z.object({ type: z.literal('addEnum'), enum: EnumInputSchema }),
  z.object({ type: z.literal('updateEnum'), id: IdSchema, changes: EnumChangesSchema }),
  z.object({ type: z.literal('deleteEnum'), id: IdSchema }),

  // `classId` admite tambien el identificador de una enumeracion: ambas se
  // arrastran por el mismo lienzo.
  z.object({ type: z.literal('setPosition'), classId: IdSchema, position: PositionSchema }),
]);

/** Operacion ya normalizada, con todos los valores por defecto resueltos. */
export type UmlOperation = z.infer<typeof UmlOperationSchema>;

/** Operacion tal y como la escribe quien la emite, con campos opcionales. */
export type UmlOperationInput = z.input<typeof UmlOperationSchema>;

/** Discriminante de la union. */
export type UmlOperationType = UmlOperation['type'];

/** Lista de todos los tipos de operacion, util para interfaces y pruebas. */
export const UML_OPERATION_TYPES: readonly UmlOperationType[] = [
  'addClass',
  'updateClass',
  'deleteClass',
  'addAttribute',
  'updateAttribute',
  'deleteAttribute',
  'addOperation',
  'updateOperation',
  'deleteOperation',
  'addRelationship',
  'updateRelationship',
  'deleteRelationship',
  'addEnum',
  'updateEnum',
  'deleteEnum',
  'setPosition',
];

/** Valida y normaliza una operacion recibida de una fuente no fiable. */
export function parseOperation(raw: unknown): Result<UmlOperation, UmlError> {
  const parsed = UmlOperationSchema.safeParse(raw);
  return parsed.success
    ? ok(parsed.data)
    : err(fromZodError(parsed.error.issues, 'operacion invalida'));
}
