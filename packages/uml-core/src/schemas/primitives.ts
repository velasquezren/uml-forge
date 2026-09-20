import { z } from 'zod';

/** Visibilidad UML de una propiedad u operacion. */
export const VisibilitySchema = z.enum(['public', 'private', 'protected', 'package']);
export type Visibility = z.infer<typeof VisibilitySchema>;

/** Tipos primitivos soportados por el metamodelo y por el generador. */
export const PrimitiveTypeSchema = z.enum([
  'String',
  'Integer',
  'Long',
  'Double',
  'BigDecimal',
  'Boolean',
  'Date',
  'DateTime',
  'UUID',
  'Text',
]);
export type PrimitiveType = z.infer<typeof PrimitiveTypeSchema>;

/** Identificador estable de cualquier elemento del modelo. */
export const IdSchema = z.uuid();

/**
 * Nombre de un elemento. Se admite cualquier texto no vacio: la conversion a
 * identificador valido de Java es responsabilidad del generador.
 */
export const NameSchema = z.string().trim().min(1, 'el nombre no puede estar vacio').max(120);

/**
 * Referencia a un tipo: o bien un primitivo, o bien el identificador de una
 * clase o de una enumeracion del propio modelo.
 */
export const TypeReferenceSchema = z.union([PrimitiveTypeSchema, IdSchema]);
export type TypeReference = z.infer<typeof TypeReferenceSchema>;

/** Posicion del elemento en el lienzo. */
export const PositionSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
});
export type Position = z.infer<typeof PositionSchema>;

/** Indica si una referencia de tipo es un primitivo. */
export function isPrimitiveType(value: string): value is PrimitiveType {
  return PrimitiveTypeSchema.safeParse(value).success;
}
