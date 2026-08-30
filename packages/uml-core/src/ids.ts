/**
 * Generacion de identificadores. Todo elemento del metamodelo nace con un
 * UUID v4 estable y nunca se identifica por nombre. Ver ADR 0006.
 */

/** Genera un UUID v4 con la API nativa de la plataforma. */
export function createId(): string {
  return crypto.randomUUID();
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

/** Indica si una cadena es un UUID con formato valido. */
export function isId(value: string): boolean {
  return UUID_PATTERN.test(value);
}
