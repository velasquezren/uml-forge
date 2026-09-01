import { createId, type Visibility } from '@uml-forge/uml-core';

/** Mapa para traducir IDs de origen (enteros, cadenas arbitrarias) a UUIDs validos. */
export class IdMapper {
  private readonly map = new Map<string, string>();

  toUuid(originalId: string | undefined | null): string {
    if (!originalId) return createId();
    const existing = this.map.get(originalId);
    if (existing) return existing;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      originalId,
    );
    const newId = isUuid ? originalId : createId();
    this.map.set(originalId, newId);
    return newId;
  }
}

/** Normaliza la visibilidad UML. */
export function normalizeVisibility(v: string | undefined): Visibility {
  const normalized = v?.toLowerCase() ?? 'package';
  switch (normalized) {
    case 'public':
    case '+':
      return 'public';
    case 'private':
    case '-':
      return 'private';
    case 'protected':
    case '#':
      return 'protected';
    default:
      return 'package';
  }
}

/** Normaliza la multiplicidad a una cadena valida. */
export function normalizeMultiplicity(
  lower: string | number | undefined,
  upper: string | number | undefined,
): string {
  const l = lower === undefined ? '1' : String(lower);
  const u = upper === undefined ? '1' : String(upper);
  if (lower === undefined && (u === '*' || u === '-1')) return '*';
  if (l === '1' && u === '1') return '1';
  if (l === '0' && u === '1') return '0..1';
  if (l === '0' && (u === '*' || u === '-1')) return '0..*';
  if (l === '1' && (u === '*' || u === '-1')) return '1..*';
  if (u === '*' || u === '-1') return '*';
  return l === u ? l : `${l}..${u}`;
}

/** Normaliza los tipos primitivos UML hacia el metamodelo de UML Forge. */
export function normalizeType(typeStr: string | undefined, idMapper: IdMapper): string {
  if (!typeStr) return 'String';
  const clean = typeStr.trim();
  const lower = clean.toLowerCase();

  if (lower.includes('string') || lower.includes('char') || lower.includes('varchar'))
    return 'String';
  if (lower === 'integer' || lower === 'int') return 'Integer';
  if (lower === 'long') return 'Long';
  if (lower === 'double' || lower === 'float' || lower === 'real') return 'Double';
  if (lower === 'boolean' || lower === 'bool') return 'Boolean';
  if (lower.includes('date') && !lower.includes('time')) return 'Date';
  if (lower.includes('datetime') || lower.includes('timestamp')) return 'DateTime';
  if (lower === 'uuid') return 'UUID';
  if (lower === 'text' || lower === 'clob') return 'Text';

  return idMapper.toUuid(clean);
}

/** Extrae un array independientemente de si fast-xml-parser devuelve un objeto o un array. */
export function toArray<T>(item: T | T[] | undefined): T[] {
  if (item === undefined || item === null) return [];
  return Array.isArray(item) ? item : [item];
}
