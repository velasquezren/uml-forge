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
function matchPrimitive(rawStr: string): string | null {
  let clean = rawStr.trim();
  if (clean.includes('#')) {
    clean = clean.split('#').pop()!.trim();
  }
  clean = clean.replace(/^(EAJava_|EAC_|EACsharp_|EAVB_|EA_|umlforge-primitive-)/i, '');
  const lower = clean.toLowerCase();

  // 1. Cadenas / Caracteres (string, str, char, varchar)
  if (
    lower === 'string' ||
    lower === 'str' ||
    lower === 'char' ||
    lower === 'varchar' ||
    lower === 'character' ||
    lower.includes('string') ||
    lower.includes('varchar')
  ) {
    return 'String';
  }

  // 2. Enteros (int, integer, short, byte, smallint, tinyint)
  if (
    lower === 'int' ||
    lower === 'integer' ||
    lower === 'short' ||
    lower === 'byte' ||
    lower === 'smallint' ||
    lower === 'tinyint' ||
    lower.endsWith('int') ||
    lower.endsWith('integer')
  ) {
    return 'Integer';
  }

  // 3. Enteros largos (long, bigint)
  if (lower === 'long' || lower === 'bigint' || lower.endsWith('long')) {
    return 'Long';
  }

  // 4. Numeros decimales / flotantes (double, float, real, number)
  if (
    lower === 'double' ||
    lower === 'float' ||
    lower === 'real' ||
    lower === 'number' ||
    lower.endsWith('double') ||
    lower.endsWith('float')
  ) {
    return 'Double';
  }

  // 5. Decimales de alta precision (bigdecimal, decimal, numeric, money)
  if (lower === 'bigdecimal' || lower === 'decimal' || lower === 'numeric' || lower === 'money') {
    return 'BigDecimal';
  }

  // 6. Booleanos (bool, boolean, bit)
  if (
    lower === 'bool' ||
    lower === 'boolean' ||
    lower === 'bit' ||
    lower.endsWith('bool') ||
    lower.endsWith('boolean')
  ) {
    return 'Boolean';
  }

  // 7. Fechas (date)
  if (lower === 'date' || (lower.includes('date') && !lower.includes('time'))) {
    return 'Date';
  }

  // 8. Fecha y hora / Timestamp (datetime, timestamp, time)
  if (
    lower === 'datetime' ||
    lower === 'timestamp' ||
    lower === 'time' ||
    lower.includes('timestamp')
  ) {
    return 'DateTime';
  }

  // 9. UUID (uuid, guid)
  if (lower === 'uuid' || lower === 'guid') {
    return 'UUID';
  }

  // 10. Texto largo (text, clob)
  if (lower === 'text' || lower === 'clob') {
    return 'Text';
  }

  // 11. Si es void
  if (lower === 'void') {
    return 'void';
  }

  return null;
}

export function normalizeType(
  typeStr: string | undefined,
  idMapper: IdMapper,
  typeDefs?: Map<string, string>,
): string {
  if (!typeStr || typeStr.trim() === '') return 'String';
  const raw = typeStr.trim();

  // 1. Coincidencia directa con tipo primitivo
  const directMatch = matchPrimitive(raw);
  if (directMatch !== null) {
    return directMatch;
  }

  // 2. Si typeStr es un ID definido en typeDefs (PrimitiveType o DataType en el XML):
  if (typeDefs && typeDefs.has(raw)) {
    const definedName = typeDefs.get(raw)!;
    const defMatch = matchPrimitive(definedName);
    if (defMatch !== null) {
      return defMatch;
    }
  }

  // 3. Si tiene prefijos de dialectos como Enterprise Architect:
  const withoutPrefix = raw.replace(/^(EAJava_|EAC_|EACsharp_|EAVB_|EA_|umlforge-primitive-)/i, '');
  if (withoutPrefix !== raw) {
    const prefixMatch = matchPrimitive(withoutPrefix);
    if (prefixMatch !== null) {
      return prefixMatch;
    }
    if (typeDefs && typeDefs.has(withoutPrefix)) {
      const defMatch = matchPrimitive(typeDefs.get(withoutPrefix)!);
      if (defMatch !== null) {
        return defMatch;
      }
    }
  }

  // 4. Si no es primitivo, es una referencia a otro Clasificador (Class, Enum, etc.) por su ID
  return idMapper.toUuid(raw);
}

/** Extrae un array independientemente de si fast-xml-parser devuelve un objeto o un array. */
export function toArray<T>(item: T | T[] | undefined): T[] {
  if (item === undefined || item === null) return [];
  return Array.isArray(item) ? item : [item];
}
