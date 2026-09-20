import type { RawAiItem } from './ai-mapper-helpers';

const IGNORED_CLASS_NAMES = new Set([
  'the',
  'a',
  'an',
  'diagram',
  'uml',
  'classes',
  'class',
  'attributes',
  'methods',
  'relationships',
  'relations',
  'model',
  'design',
  'note',
]);

/** Parser de rescate para texto libre o markdown generado por modelos locales/visión. */
export function parseTextToRawAiItems(text: string): RawAiItem[] {
  const lines = text.split('\n');
  const items: RawAiItem[] = [];
  let currentClass: RawAiItem | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Detectar Enum en texto libre: "Enum Status: ACTIVE, INACTIVE" o "enum Role { ADMIN, USER }"
    const enumMatch = trimmed.match(
      /^(?:enum|enumeration)\s+([a-zA-Z0-9_]+)\s*(?:[:{]|\s+contains)\s*([^}]+)/iu,
    );
    if (enumMatch && enumMatch[1] && enumMatch[2]) {
      if (currentClass) {
        items.push(currentClass);
        currentClass = null;
      }
      const literals = enumMatch[2]
        .split(/[,;\s]+/u)
        .map((l) => l.trim().replace(/['"]/gu, ''))
        .filter((l) => l.length > 0 && /^[a-zA-Z0-9_]+$/u.test(l));
      if (literals.length > 0) {
        items.push({
          type: 'add_enum',
          name: enumMatch[1],
          literals,
        });
        continue;
      }
    }

    // Detectar encabezado de clase: "Class: User", "### User", "## User", "**User**", "Clase User", "Entity User"
    const classMatch = trimmed.match(
      /^(?:class|clase|entity|entidad|###|##|#|\*\*(?:class:?)?)\s*[:]?\s*([a-zA-Z0-9_]+)\b/iu,
    );
    if (classMatch && classMatch[1] && !IGNORED_CLASS_NAMES.has(classMatch[1].toLowerCase())) {
      if (currentClass) items.push(currentClass);
      currentClass = {
        type: 'add_class',
        name: classMatch[1],
        attributes: [],
        methods: [],
      };
      continue;
    }

    // Si estamos dentro de una clase, buscar atributos o métodos
    if (currentClass) {
      // Atributo con dos puntos: "- id: Long", "* email: String", "+ balance: Double"
      const colonAttrMatch = trimmed.match(/^[-*+•]\s*([a-zA-Z0-9_]+)\s*:\s*([a-zA-Z0-9_<>[\]]+)/u);
      if (colonAttrMatch && colonAttrMatch[1] && colonAttrMatch[2]) {
        (currentClass.attributes as unknown[]).push(`${colonAttrMatch[1]}: ${colonAttrMatch[2]}`);
        continue;
      }

      // Atributo con paréntesis: "- id (Long)", "+ name (String)"
      const parenAttrMatch = trimmed.match(/^[-*+•]\s*([a-zA-Z0-9_]+)\s*\(([a-zA-Z0-9_<>[\]]+)\)/u);
      if (parenAttrMatch && parenAttrMatch[1] && parenAttrMatch[2]) {
        (currentClass.attributes as unknown[]).push(`${parenAttrMatch[1]}: ${parenAttrMatch[2]}`);
        continue;
      }

      // Método: "- login()", "+ update(): void", "- pay(amount: Double): Boolean"
      const methodMatch = trimmed.match(
        /^[-*+•]\s*([a-zA-Z0-9_]+)\s*\((.*?)\)(?:\s*:\s*([a-zA-Z0-9_]+))?/u,
      );
      if (methodMatch && methodMatch[1]) {
        (currentClass.methods as unknown[]).push({
          name: methodMatch[1],
          returnType: methodMatch[3] || 'void',
        });
        continue;
      }
    }

    // Detectar relación: "User -> Order", "User (1) -> (0..*) Order", "Customer has many Orders", "Student extends Person"
    const relMatch = trimmed.match(
      /([a-zA-Z0-9_]+)\s*(?:\([0-9.*]+\))?\s*(?:-->|->|has many|tiene|relates to|extends|implements|belongs to|asociado a)\s*(?:\([0-9.*]+\))?\s*([a-zA-Z0-9_]+)/iu,
    );
    if (relMatch && relMatch[1] && relMatch[2]) {
      if (currentClass) {
        items.push(currentClass);
        currentClass = null;
      }
      const lower = trimmed.toLowerCase();
      let kind = 'association';
      if (lower.includes('extend') || lower.includes('hereda') || lower.includes('subclass')) {
        kind = 'generalization';
      } else if (lower.includes('implement')) {
        kind = 'realization';
      } else if (lower.includes('composit') || lower.includes('compone')) {
        kind = 'composition';
      } else if (lower.includes('aggregat') || lower.includes('agrega')) {
        kind = 'aggregation';
      }

      items.push({
        type: 'add_relationship',
        source: relMatch[1],
        target: relMatch[2],
        kind,
      });
    }
  }

  if (currentClass) items.push(currentClass);

  return items;
}
