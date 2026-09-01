import { z } from 'zod';
import { MultiplicitySchema } from './multiplicity.js';
import {
  IdSchema,
  NameSchema,
  PositionSchema,
  TypeReferenceSchema,
  VisibilitySchema,
} from './primitives.js';

/** Direccion de un parametro de operacion. */
export const ParameterDirectionSchema = z.enum(['in', 'out', 'inout', 'return']);
export type ParameterDirection = z.infer<typeof ParameterDirectionSchema>;

/** Parametro de una operacion. */
export const UMLParameterSchema = z.object({
  id: IdSchema,
  name: NameSchema,
  type: TypeReferenceSchema,
  direction: ParameterDirectionSchema,
});
export type UMLParameter = z.infer<typeof UMLParameterSchema>;

/**
 * Operacion de una clase. Un `returnType` nulo representa una operacion sin
 * valor de retorno (void en el codigo generado).
 */
export const UMLOperationSchema = z.object({
  id: IdSchema,
  name: NameSchema,
  returnType: TypeReferenceSchema.nullable(),
  visibility: VisibilitySchema,
  isAbstract: z.boolean(),
  isStatic: z.boolean(),
  parameters: z.array(UMLParameterSchema),
});
export type UMLOperation = z.infer<typeof UMLOperationSchema>;

/** Propiedad (atributo) de una clase. */
export const UMLPropertySchema = z.object({
  id: IdSchema,
  name: NameSchema,
  type: TypeReferenceSchema,
  visibility: VisibilitySchema,
  multiplicity: MultiplicitySchema,
  isStatic: z.boolean(),
  isDerived: z.boolean(),
  isUnique: z.boolean(),
  isNullable: z.boolean(),
  isIdentifier: z.boolean(),
  defaultValue: z.string().nullable(),
});
export type UMLProperty = z.infer<typeof UMLPropertySchema>;

/** Clase, clase abstracta o interfaz del modelo. */
export const UMLClassSchema = z.object({
  id: IdSchema,
  name: NameSchema,
  isAbstract: z.boolean(),
  isInterface: z.boolean(),
  stereotypes: z.array(z.string().trim().min(1)),
  attributes: z.array(UMLPropertySchema),
  operations: z.array(UMLOperationSchema),
  position: PositionSchema,
});
export type UMLClass = z.infer<typeof UMLClassSchema>;

/** Enumeracion del modelo. Como la clase, ocupa un lugar propio en el lienzo. */
export const UMLEnumSchema = z.object({
  id: IdSchema,
  name: NameSchema,
  literals: z.array(z.string().trim().min(1)),
  position: PositionSchema,
});
export type UMLEnum = z.infer<typeof UMLEnumSchema>;
