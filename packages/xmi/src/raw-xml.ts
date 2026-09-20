/**
 * Acceso tipado al arbol crudo que devuelve fast-xml-parser. El parser entrega
 * `unknown` en cada rama y los dialectos de XMI varian en prefijos y en si un
 * valor llega como texto, como numero o como booleano; estas funciones son el
 * unico punto donde se normaliza esa variedad.
 */
export interface RawXmlNode {
  [key: string]: unknown;
}

/** Prefijo con el que fast-xml-parser marca los atributos XML. */
const ATTRIBUTE_PREFIX = '@_';

/** Convierte un valor cualquiera del arbol en nodo, o null si no lo es. */
export function asNode(value: unknown): RawXmlNode | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as RawXmlNode)
    : null;
}

/**
 * Lee un atributo XML como texto. `allowBooleanAttributes` puede devolver un
 * booleano y algunos dialectos escriben numeros, de modo que todo se normaliza
 * a cadena para poder compararlo sin sorpresas.
 */
export function attr(node: RawXmlNode | undefined, name: string): string | undefined {
  if (node === undefined) {
    return undefined;
  }
  const value = node[`${ATTRIBUTE_PREFIX}${name}`];
  // Un atributo XML solo puede llegar como texto, numero o booleano; cualquier
  // otra cosa es un hijo del arbol y no un atributo.
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return undefined;
}

/** Lee un atributo probando varios nombres, en orden de preferencia. */
export function firstAttr(
  node: RawXmlNode | undefined,
  ...names: readonly string[]
): string | undefined {
  for (const name of names) {
    const value = attr(node, name);
    if (value !== undefined) {
      return value;
    }
  }
  return undefined;
}

/** Lee el atributo `value` de un hijo directo, como hacen `lowerValue` o `defaultValue`. */
export function childValue(node: RawXmlNode, key: string): string | undefined {
  return attr(asNode(node[key]) ?? undefined, 'value');
}

/** Lee un numero de un atributo, con valor de repuesto si falta o no es finito. */
export function numericAttr(node: RawXmlNode, name: string, fallback: number): number {
  const raw = attr(node, name);
  if (raw === undefined) {
    return fallback;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}
