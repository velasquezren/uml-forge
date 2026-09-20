export interface RawAiItem {
  [key: string]: unknown;
}

export function asString(val: unknown, fallback = ''): string {
  if (typeof val === 'string') return val.trim();
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  return fallback;
}

export function asStringOrNull(val: unknown): string | null {
  if (typeof val === 'string' && val.trim().length > 0) return val.trim();
  return null;
}

const MULTIPLICITY_PATTERN = /^(\*|\d+|\d+\.\.(\d+|\*))$/u;

/** Normaliza multiplicidades a formas estándar UML 2.5 (1, 0..1, 0..*, 1..*). */
export function normalizeMultiplicity(raw: unknown, fallback: string): string {
  const str = asString(raw).toLowerCase().replace(/\s+/gu, '');
  if (!str) return fallback;
  if (str === '*' || str === 'n' || str === 'm' || str === 'many') return '0..*';
  if (str === '1' || str === '1..1' || str === 'one') return '1';
  if (str === '0..1' || str === 'optional') return '0..1';
  if (str === '0..*' || str === '0..n' || str === '0..m') return '0..*';
  if (str === '1..*' || str === '1..n' || str === '1..m') return '1..*';
  if (!MULTIPLICITY_PATTERN.test(str)) {
    return fallback;
  }
  return str;
}

/** Normaliza tipos de relaciones UML. */
export function normalizeRelationshipKind(
  raw: unknown,
): 'association' | 'generalization' | 'realization' | 'aggregation' | 'composition' {
  const str = asString(raw).toLowerCase();
  if (
    str.includes('generaliz') ||
    str.includes('inherit') ||
    str.includes('extend') ||
    str.includes('herencia') ||
    str.includes('is-a') ||
    str === 'subclass'
  ) {
    return 'generalization';
  }
  if (
    str.includes('realiz') ||
    str.includes('implement') ||
    str.includes('interfaz') ||
    str.includes('interface')
  ) {
    return 'realization';
  }
  if (
    str.includes('composit') ||
    str.includes('composicion') ||
    str.includes('composed') ||
    str.includes('part-of')
  ) {
    return 'composition';
  }
  if (str.includes('aggregat') || str.includes('agregacion')) {
    return 'aggregation';
  }
  return 'association';
}

/** Normaliza visibilidad UML (+ public, - private, # protected, ~ package). */
export function normalizeVisibility(raw: unknown): 'public' | 'private' | 'protected' | 'package' {
  const str = asString(raw).toLowerCase();
  if (str === '+' || str.includes('pub')) return 'public';
  if (str === '#' || str.includes('prot')) return 'protected';
  if (str === '~' || str.includes('pack')) return 'package';
  return 'private';
}

/** Descompone una cadena de atributo como "+ id: Long [1]" en componentes. */
export function parseAttributeString(rawStr: string): {
  name: string;
  type: string;
  visibility: 'public' | 'private' | 'protected' | 'package';
  isIdentifier: boolean;
} {
  let s = rawStr.trim();
  let visibility: 'public' | 'private' | 'protected' | 'package' = 'private';

  // Visibilidad al inicio
  if (s.startsWith('+')) {
    visibility = 'public';
    s = s.slice(1).trim();
  } else if (s.startsWith('-')) {
    visibility = 'private';
    s = s.slice(1).trim();
  } else if (s.startsWith('#')) {
    visibility = 'protected';
    s = s.slice(1).trim();
  } else if (s.startsWith('~')) {
    visibility = 'package';
    s = s.slice(1).trim();
  }

  // Quitar modificadores como {id}, {PK}, [1], etc.
  const isPk = /\b(id|pk|identifier|primary)\b/iu.test(s);
  s = s
    .replace(/\{[^}]*\}/gu, '')
    .replace(/\[[^\]]*\]/gu, '')
    .trim();

  // Separar nombre y tipo por ':'
  const colonIdx = s.indexOf(':');
  let name = s;
  let type = 'String';

  if (colonIdx !== -1) {
    name = s.slice(0, colonIdx).trim();
    type =
      s
        .slice(colonIdx + 1)
        .split('=')[0]
        ?.trim() || 'String';
  }

  const cleanName = name.toLowerCase();
  const isIdentifier =
    isPk ||
    cleanName === 'id' ||
    cleanName === '_id' ||
    (cleanName.length > 2 && cleanName.endsWith('_id'));

  return { name: name || 'attribute', type: type || 'String', visibility, isIdentifier };
}

/** Convierte objetos declarativos { classes: [...], relationships: [...] } en items de procesamiento. */
export function convertDeclarativeToItems(obj: RawAiItem): RawAiItem[] {
  const result: RawAiItem[] = [];

  if (Array.isArray(obj.classes) || Array.isArray(obj.entities) || Array.isArray(obj.nodes)) {
    const rawClasses = (obj.classes || obj.entities || obj.nodes) as RawAiItem[];
    for (const c of rawClasses) {
      result.push({
        type: 'add_class',
        ...c,
      });
    }
  }

  if (Array.isArray(obj.enums)) {
    const rawEnums = obj.enums as RawAiItem[];
    for (const e of rawEnums) {
      result.push({
        type: 'add_enum',
        ...e,
      });
    }
  }

  if (
    Array.isArray(obj.relationships) ||
    Array.isArray(obj.relations) ||
    Array.isArray(obj.edges) ||
    Array.isArray(obj.links)
  ) {
    const rawRels = (obj.relationships || obj.relations || obj.edges || obj.links) as RawAiItem[];
    for (const r of rawRels) {
      result.push({
        type: 'add_relationship',
        ...r,
      });
    }
  }

  return result;
}
