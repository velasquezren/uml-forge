import type {
  AnalyzedEntity,
  AnalyzedModel,
  EntityRelationshipField,
  UMLProperty,
} from '../types.js';

/** Busca una entidad analizada por su nombre de clase Java. */
export function findEntityByClassName(
  model: AnalyzedModel,
  javaClassName: string,
): AnalyzedEntity | undefined {
  return Array.from(model.entities.values()).find((e) => e.javaClassName === javaClassName);
}

/** Cadena de herencia desde la raiz hasta la entidad, ambas incluidas. */
export function ancestryOf(entity: AnalyzedEntity, model: AnalyzedModel): AnalyzedEntity[] {
  const chain: AnalyzedEntity[] = [entity];
  const seen = new Set<string>([entity.javaClassName]);
  let current = entity;
  while (current.parentClassName && !seen.has(current.parentClassName)) {
    const parent = findEntityByClassName(model, current.parentClassName);
    if (!parent) break;
    seen.add(parent.javaClassName);
    chain.unshift(parent);
    current = parent;
  }
  return chain;
}

/** Atributos propios y heredados: son los campos que acepta el JSON de la entidad. */
export function inheritedAttributes(entity: AnalyzedEntity, model: AnalyzedModel): UMLProperty[] {
  return ancestryOf(entity, model).flatMap((e) => e.attributes);
}

/** Relaciones propias y heredadas de la entidad. */
export function inheritedRelationships(
  entity: AnalyzedEntity,
  model: AnalyzedModel,
): EntityRelationshipField[] {
  return ancestryOf(entity, model).flatMap((e) => e.relationships);
}

/**
 * Campos que no se serializan al anidar una entidad dentro de otra.
 *
 * Una entidad referenciada se devuelve con sus atributos, pero sin sus propias
 * relaciones: asi se corta cualquier ciclo (`Order.items[].order.items...`) sin
 * importar la forma del grafo. Se incluyen las relaciones de toda la jerarquia,
 * porque el objeto anidado puede ser de una subclase. `hibernateLazyInitializer`
 * y `handler` son propiedades internas de los proxies de Hibernate.
 */
export function jsonIgnoredFieldsFor(targetClassName: string, model: AnalyzedModel): string[] {
  const target = findEntityByClassName(model, targetClassName);
  const fields = new Set<string>();
  if (target) {
    const hierarchy = new Set(ancestryOf(target, model));
    for (const candidate of model.entities.values()) {
      if (ancestryOf(candidate, model).includes(target)) hierarchy.add(candidate);
    }
    for (const member of hierarchy) {
      member.relationships.forEach((rel) => fields.add(rel.fieldName));
    }
  }
  return ['hibernateLazyInitializer', 'handler', ...Array.from(fields).sort()];
}
