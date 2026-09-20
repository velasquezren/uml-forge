/**
 * Generacion de identificadores. Todo elemento del metamodelo nace con un
 * UUID v4 estable y nunca se identifica por nombre. Ver ADR 0006.
 */

/** Genera un UUID v4, incluso en HTTP de una red local. */
export function createId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();

  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

/** Indica si una cadena es un UUID con formato valido. */
export function isId(value: string): boolean {
  return UUID_PATTERN.test(value);
}
