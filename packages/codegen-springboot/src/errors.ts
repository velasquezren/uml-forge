import type { UmlError } from '@uml-forge/uml-core';

/** Codigos de error del generador Spring Boot. */
export type CodegenErrorCode =
  'invalid_model' | 'unsupported_type' | 'duplicate_identifier' | 'generation_failed';

/** Error estructurado producido durante la generacion de Spring Boot. */
export interface CodegenError {
  readonly code: CodegenErrorCode;
  readonly message: string;
  readonly details?: readonly UmlError[] | readonly string[];
}

/** Crea un error por modelo UML invalido. */
export function invalidModelError(errors: readonly UmlError[]): CodegenError {
  const message = `El modelo UML no es valido: ${errors.map((e) => e.message).join('; ')}`;
  return {
    code: 'invalid_model',
    message,
    details: errors,
  };
}

/** Crea un error por tipo no soportado. */
export function unsupportedTypeError(typeName: string, context?: string): CodegenError {
  return {
    code: 'unsupported_type',
    message: `El tipo '${typeName}' no esta soportado${context ? ` en ${context}` : ''}`,
  };
}

/** Crea un error generico de generacion. */
export function generationFailedError(message: string, details?: string[]): CodegenError {
  return {
    code: 'generation_failed',
    message,
    details,
  };
}
