import type { AnalyzedModel } from '../types.js';
import { toPascalCase } from '../naming.js';

export interface JavaTypeResult {
  readonly javaType: string;
  readonly imports: string[];
}

/** Mapea un tipo de referencia UML a su equivalente en Java. */
export function mapUmlTypeToJava(
  typeRef: string | null | undefined,
  model: AnalyzedModel,
): JavaTypeResult {
  if (!typeRef || typeRef === 'void') {
    return { javaType: 'void', imports: [] };
  }

  const normalized = typeRef.trim();

  switch (normalized) {
    case 'String':
    case 'Text':
      return { javaType: 'String', imports: [] };
    case 'Integer':
    case 'int':
      return { javaType: 'Integer', imports: [] };
    case 'Long':
    case 'long':
      return { javaType: 'Long', imports: [] };
    case 'Double':
    case 'double':
    case 'Float':
    case 'float':
    case 'Real':
      return { javaType: 'Double', imports: [] };
    case 'BigDecimal':
      return { javaType: 'BigDecimal', imports: ['java.math.BigDecimal'] };
    case 'Boolean':
    case 'boolean':
      return { javaType: 'Boolean', imports: [] };
    case 'Date':
      return { javaType: 'LocalDate', imports: ['java.time.LocalDate'] };
    case 'DateTime':
      return { javaType: 'LocalDateTime', imports: ['java.time.LocalDateTime'] };
    case 'UUID':
      return { javaType: 'UUID', imports: ['java.util.UUID'] };
  }

  const enumEntry =
    model.enums.get(normalized) ||
    Array.from(model.enums.values()).find((e) => e.name.toLowerCase() === normalized.toLowerCase());
  if (enumEntry) {
    return { javaType: toPascalCase(enumEntry.name), imports: [] };
  }

  const ifaceEntry =
    model.interfaces.get(normalized) ||
    Array.from(model.interfaces.values()).find(
      (i) => i.name.toLowerCase() === normalized.toLowerCase(),
    );
  if (ifaceEntry) {
    return { javaType: toPascalCase(ifaceEntry.name), imports: [] };
  }

  const entityEntry =
    model.entities.get(normalized) ||
    Array.from(model.entities.values()).find(
      (e) => e.umlClass.name.toLowerCase() === normalized.toLowerCase(),
    );
  if (entityEntry) {
    return { javaType: entityEntry.javaClassName, imports: [] };
  }

  return { javaType: toPascalCase(normalized), imports: [] };
}
