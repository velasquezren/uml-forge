import { z } from 'zod';

/** Catalogo cerrado de errores del metamodelo. */
export const UmlErrorCodeSchema = z.enum([
  'invalid_payload',
  'class_not_found',
  'enum_not_found',
  'relationship_not_found',
  'attribute_not_found',
  'operation_not_found',
  'duplicate_id',
  'duplicate_name',
  'dangling_reference',
  'unknown_type',
  'cyclic_inheritance',
  'invalid_multiplicity',
  'invalid_generalization',
  'invalid_realization',
  'invalid_document',
]);

export type UmlErrorCode = z.infer<typeof UmlErrorCodeSchema>;

/** Error del metamodelo. Nunca se lanza: viaja dentro de un Result. */
export interface UmlError {
  /** Codigo estable, apto para traducir o para decidir en el cliente. */
  readonly code: UmlErrorCode;
  /** Mensaje en espanol, orientado a la persona que modela. */
  readonly message: string;
  /** Identificador del elemento afectado, cuando se conoce. */
  readonly elementId?: string;
  /** Ruta dentro del modelo o del payload, para localizar el problema. */
  readonly path?: readonly (string | number)[];
}

/** Crea un error del metamodelo. */
export function umlError(
  code: UmlErrorCode,
  message: string,
  extra: { elementId?: string; path?: readonly (string | number)[] } = {},
): UmlError {
  return { code, message, elementId: extra.elementId, path: extra.path };
}

/** Convierte los problemas de Zod en un error del metamodelo. */
export function fromZodError(issues: readonly z.core.$ZodIssue[], context: string): UmlError {
  const first = issues[0];
  const detail =
    first === undefined ? 'payload invalido' : `${first.path.join('.')}: ${first.message}`;
  return umlError('invalid_payload', `${context}: ${detail}`, {
    path:
      first === undefined
        ? undefined
        : [...first.path].map((segment) => segment as string | number),
  });
}
