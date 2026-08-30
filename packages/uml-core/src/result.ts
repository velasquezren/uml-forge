/**
 * Tipo Result: las operaciones del metamodelo no lanzan excepciones, devuelven
 * un exito o un error explicito. Ver ADR 0007.
 */
export type Result<T, E> =
  { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: E };

/** Construye un resultado correcto. */
export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

/** Construye un resultado erroneo. */
export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

/** Estrecha el tipo a la rama correcta. */
export function isOk<T, E>(
  result: Result<T, E>,
): result is { readonly ok: true; readonly value: T } {
  return result.ok;
}

/** Estrecha el tipo a la rama erronea. */
export function isErr<T, E>(
  result: Result<T, E>,
): result is { readonly ok: false; readonly error: E } {
  return !result.ok;
}
