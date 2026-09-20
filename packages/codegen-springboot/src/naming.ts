const JAVA_KEYWORDS = new Set([
  'abstract',
  'assert',
  'boolean',
  'break',
  'byte',
  'case',
  'catch',
  'char',
  'class',
  'const',
  'continue',
  'default',
  'do',
  'double',
  'else',
  'enum',
  'extends',
  'final',
  'finally',
  'float',
  'for',
  'goto',
  'if',
  'implements',
  'import',
  'instanceof',
  'int',
  'interface',
  'long',
  'native',
  'new',
  'package',
  'private',
  'protected',
  'public',
  'return',
  'short',
  'static',
  'strictfp',
  'super',
  'switch',
  'synchronized',
  'this',
  'throw',
  'throws',
  'transient',
  'try',
  'void',
  'volatile',
  'while',
  'record',
  'sealed',
  'permits',
  'non-sealed',
  'var',
  'yield',
]);

/** Divide una cadena en palabras respetando camelCase, guiones y espacios. */
function splitWords(str: string): string[] {
  return str
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0);
}

/** Convierte a PascalCase (ej. NombreDeClase). */
export function toPascalCase(str: string): string {
  const words = splitWords(str);
  if (words.length === 0) return 'GeneratedClass';
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('');
}

/** Convierte a camelCase (ej. nombreDeAtributo). */
export function toCamelCase(str: string): string {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

/** Convierte a snake_case (ej. nombre_de_tabla). */
export function toSnakeCase(str: string): string {
  const words = splitWords(str);
  return words.map((w) => w.toLowerCase()).join('_');
}

/** Convierte a SCREAMING_SNAKE_CASE (ej. CONSTANTE_ENUM). */
export function toScreamingSnakeCase(str: string): string {
  const words = splitWords(str);
  return words.map((w) => w.toUpperCase()).join('_');
}

/** Convierte a kebab-case (ej. nombre-de-ruta). */
export function toKebabCase(str: string): string {
  const words = splitWords(str);
  return words.map((w) => w.toLowerCase()).join('-');
}

/** Sanea un identificador para que sea valido en Java. */
export function sanitizeJavaIdentifier(name: string): string {
  const camel = toCamelCase(name);
  if (JAVA_KEYWORDS.has(camel.toLowerCase())) {
    return `${camel}Val`;
  }
  return camel || 'item';
}

/** Obtiene una forma plural aproximada para colecciones. */
export function pluralize(name: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith('s') || lower.endsWith('x') || lower.endsWith('z') || lower.endsWith('ch')) {
    return `${name}es`;
  }
  if (lower.endsWith('y') && !/[aeiou]y$/.test(lower)) {
    return `${name.slice(0, -1)}ies`;
  }
  return `${name}s`;
}

/** Sanea el nombre de un paquete Java (ej. com.example.demo). */
export function sanitizePackageName(pkg: string): string {
  return pkg
    .split('.')
    .map((part) => {
      const sanitized = part.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
      return JAVA_KEYWORDS.has(sanitized) ? `${sanitized}pkg` : sanitized;
    })
    .join('.');
}
