import type { AnalyzedEntity, AnalyzedModel, UMLProperty } from '../types.js';
import { sanitizeJavaIdentifier, toCamelCase, toScreamingSnakeCase } from '../naming.js';
import { findEntityByClassName, inheritedAttributes, inheritedRelationships } from './hierarchy.js';
import { mapUmlTypeToJava } from './type-helper.js';

/** Version de la peticion: la de alta y la de modificacion usan valores distintos. */
export type SampleVariant = 'create' | 'update';

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

/** Variable de coleccion donde se guarda el id creado de una entidad (`orderItemId`). */
export function idVariableName(entity: AnalyzedEntity): string {
  return `${toCamelCase(entity.javaClassName)}Id`;
}

/** Marca que se sustituye por `{{variable}}` sin comillas tras serializar el JSON. */
function idPlaceholder(variable: string): string {
  return `@@ID:${variable}@@`;
}

/** Valor de ejemplo para un atributo; `undefined` si su tipo no se puede enviar en JSON. */
function sampleValue(
  attr: UMLProperty,
  model: AnalyzedModel,
  variant: SampleVariant,
): JsonValue | undefined {
  const isUpdate = variant === 'update';
  const javaType = mapUmlTypeToJava(attr.type, model).javaType;

  switch (javaType) {
    case 'String':
      // Los campos unicos llevan un sufijo aleatorio para poder repetir la ejecucion.
      if (attr.isUnique) return `${attr.name}-{{$randomUUID}}`;
      return isUpdate ? `${attr.name} actualizado` : `${attr.name} de ejemplo`;
    case 'Integer':
    case 'Long':
      return isUpdate ? 2 : 1;
    case 'Double':
    case 'BigDecimal':
      return isUpdate ? 20.75 : 10.5;
    case 'Boolean':
      return !isUpdate;
    case 'LocalDate':
      return isUpdate ? '2026-02-20' : '2026-01-15';
    case 'LocalDateTime':
      return isUpdate ? '2026-02-20T16:45:00' : '2026-01-15T10:30:00';
    case 'UUID':
      return '{{$randomUUID}}';
  }

  // El tipo puede ser el id de la enumeracion o su nombre.
  const typeRef = attr.type.trim();
  const umlEnum =
    model.enums.get(typeRef) ??
    Array.from(model.enums.values()).find((e) => e.name.toLowerCase() === typeRef.toLowerCase());
  if (umlEnum) {
    const literals = umlEnum.literals.map((lit) => toScreamingSnakeCase(lit));
    if (literals.length === 0) return 'DEFAULT_VALUE';
    return (isUpdate ? literals[literals.length - 1] : literals[0]) ?? null;
  }

  return undefined;
}

/**
 * Cuerpo JSON de alta o modificacion de una entidad.
 *
 * Las referencias a otras entidades solo se envian desde el lado propietario de
 * la relacion (el que tiene la clave ajena o la tabla intermedia) y solo si la
 * coleccion ya ha creado antes esa entidad (`availableIds`). El lado inverso
 * (`mappedBy`) se ignora: JPA no lo persiste.
 */
export function buildRequestBody(
  entity: AnalyzedEntity,
  model: AnalyzedModel,
  variant: SampleVariant,
  availableIds: ReadonlySet<string>,
): string {
  const body: { [key: string]: JsonValue } = {};

  for (const attr of inheritedAttributes(entity, model)) {
    const value = sampleValue(attr, model, variant);
    if (value !== undefined) body[sanitizeJavaIdentifier(attr.name)] = value;
  }

  for (const target of referencedTargets(entity, model)) {
    const variable = idVariableName(target.entity);
    if (!availableIds.has(variable)) continue;
    const reference = { id: idPlaceholder(variable) };
    body[target.fieldName] = target.isCollection ? [reference] : reference;
  }

  return JSON.stringify(body, null, 2).replace(/"@@ID:([A-Za-z0-9]+)@@"/g, '{{$1}}');
}

/** Referencia que una entidad envia al crearse. */
export interface ReferencedTarget {
  readonly fieldName: string;
  readonly isCollection: boolean;
  readonly entity: AnalyzedEntity;
}

/**
 * Relaciones propietarias hacia entidades concretas distintas de la propia.
 * Una clase abstracta no se puede instanciar desde JSON, y la autorreferencia
 * se deja vacia porque al crear el primer registro aun no existe ningun otro.
 */
export function referencedTargets(
  entity: AnalyzedEntity,
  model: AnalyzedModel,
): ReferencedTarget[] {
  const targets: ReferencedTarget[] = [];
  for (const rel of inheritedRelationships(entity, model)) {
    if (!rel.isOwningSide) continue;
    const target = findEntityByClassName(model, rel.targetClassName);
    if (!target || target.isAbstract || target.javaClassName === entity.javaClassName) continue;
    targets.push({ fieldName: rel.fieldName, isCollection: rel.isCollection, entity: target });
  }
  return targets;
}
