import {
  applyOperation,
  type UMLClass,
  type UMLEnum,
  type UMLModel,
  type UMLRelationship,
  type UmlOperation,
} from '@uml-forge/uml-core';
import { asString, normalizeMultiplicity, normalizeRelationshipKind } from './ai-mapper-helpers';
import { resolveAiType } from './ai-type-resolver';

type Raw = Record<string, unknown>;
type AttributeChanges = Extract<UmlOperation, { type: 'updateAttribute' }>['changes'];

const ACTIONS = new Set(['rename', 'update', 'delete']);

/**
 * Traduce los cambios que la IA del chat pide sobre elementos que ya existen
 * (renombrar, modificar o eliminar, ADR 0045) a operaciones del metamodelo.
 * La IA nombra los elementos; aqui se buscan en el modelo por nombre, sin
 * distinguir mayusculas, y lo que no existe se descarta en silencio. Cada
 * cambio se resuelve sobre el modelo que dejan los anteriores: tras renombrar
 * Usuario a Cliente, la IA puede seguir llamandola de cualquiera de las dos
 * formas.
 */
export function mapAiChanges(rawChanges: unknown, model?: UMLModel): UmlOperation[] {
  if (!Array.isArray(rawChanges) || model === undefined) return [];
  const operations: UmlOperation[] = [];
  let current = model;
  for (const item of rawChanges) {
    if (typeof item !== 'object' || item === null) continue;
    for (const op of mapChange(withCurrentNames(item as Raw, model, current), current)) {
      const result = applyOperation(current, op);
      if (result.ok) {
        current = result.value;
        operations.push(op);
      }
    }
  }
  return operations;
}

/** El cambio con los nombres que los elementos tienen tras los cambios previos. */
function withCurrentNames(raw: Raw, original: UMLModel, current: UMLModel): Raw {
  const className = currentName(asString(raw.className || raw.name), original, current);
  return {
    ...raw,
    className,
    target: currentName(asString(raw.target), original, current),
    memberName: currentMember(className, memberName(raw), original, current),
  };
}

function currentName(name: string, original: UMLModel, current: UMLModel): string {
  const now = [...current.classes, ...current.enums];
  if (name === '' || findByName(now, name) !== undefined) return name;
  const before = findByName([...original.classes, ...original.enums], name);
  return now.find((item) => item.id === before?.id)?.name ?? name;
}

function currentMember(owner: string, name: string, original: UMLModel, current: UMLModel): string {
  const umlClass = findByName(current.classes, owner);
  if (umlClass === undefined || name === '') return name;
  const now = [...umlClass.attributes, ...umlClass.operations];
  if (findByName(now, name) !== undefined) return name;
  const previous = original.classes.find((c) => c.id === umlClass.id);
  const before = findByName(
    [...(previous?.attributes ?? []), ...(previous?.operations ?? [])],
    name,
  );
  return now.find((member) => member.id === before?.id)?.name ?? name;
}

function mapChange(raw: Raw, model: UMLModel): UmlOperation[] {
  const action = asString(raw.action).toLowerCase();
  const element = asString(raw.element).toLowerCase();
  if (!ACTIONS.has(action)) return [];
  const owner = asString(raw.className || raw.name);

  if (element === 'attribute') return attributeChange(action, raw, model, owner);
  if (element === 'operation' || element === 'method')
    return operationChange(action, raw, model, owner);
  if (element === 'relationship') return relationshipChange(action, raw, model, owner);

  // "class", "interface", "enum" o "tabla": se decide por lo que hay en el modelo.
  const umlClass = findByName(model.classes, owner);
  if (umlClass !== undefined) return classChange(action, raw, umlClass);
  const umlEnum = findByName(model.enums, owner);
  return umlEnum === undefined ? [] : enumChange(action, raw, umlEnum);
}

function classChange(action: string, raw: Raw, umlClass: UMLClass): UmlOperation[] {
  if (action === 'delete') return [{ type: 'deleteClass', id: umlClass.id }];
  const changes = {
    ...newName(raw, umlClass.name),
    ...flag(raw, 'isAbstract'),
    ...flag(raw, 'isInterface'),
  };
  return Object.keys(changes).length === 0
    ? []
    : [{ type: 'updateClass', id: umlClass.id, changes }];
}

function enumChange(action: string, raw: Raw, umlEnum: UMLEnum): UmlOperation[] {
  if (action === 'delete') return [{ type: 'deleteEnum', id: umlEnum.id }];
  const changes = newName(raw, umlEnum.name);
  return Object.keys(changes).length === 0 ? [] : [{ type: 'updateEnum', id: umlEnum.id, changes }];
}

function attributeChange(action: string, raw: Raw, model: UMLModel, owner: string): UmlOperation[] {
  const attribute = findByName(findByName(model.classes, owner)?.attributes ?? [], memberName(raw));
  if (attribute === undefined) return [];
  if (action === 'delete') return [{ type: 'deleteAttribute', id: attribute.id }];

  const changes: AttributeChanges = {
    ...newName(raw, attribute.name),
    ...flag(raw, 'isIdentifier'),
    ...flag(raw, 'isNullable'),
    ...flag(raw, 'isUnique'),
  };
  const rawType = asString(raw.type);
  if (rawType !== '') {
    const resolved = resolveAiType(
      rawType,
      (name) => findByName(model.classes, name)?.id ?? findByName(model.enums, name)?.id,
      (id) => model.classes.some((c) => c.id === id) || model.enums.some((e) => e.id === id),
    );
    if (resolved.type !== attribute.type) changes.type = resolved.type;
  }
  const multiplicity = asString(raw.multiplicity);
  if (multiplicity !== '') {
    const normalized = normalizeMultiplicity(multiplicity, attribute.multiplicity);
    if (normalized !== attribute.multiplicity) changes.multiplicity = normalized;
  }
  return Object.keys(changes).length === 0
    ? []
    : [{ type: 'updateAttribute', id: attribute.id, changes }];
}

function operationChange(action: string, raw: Raw, model: UMLModel, owner: string): UmlOperation[] {
  const operation = findByName(findByName(model.classes, owner)?.operations ?? [], memberName(raw));
  if (operation === undefined) return [];
  if (action === 'delete') return [{ type: 'deleteOperation', id: operation.id }];
  const changes = newName(raw, operation.name);
  return Object.keys(changes).length === 0
    ? []
    : [{ type: 'updateOperation', id: operation.id, changes }];
}

/**
 * Relaciones entre dos clases, en cualquier sentido, y si se indica, de un
 * tipo concreto. Se eliminan todas las coincidencias: asi desaparece tambien
 * una flecha que estuviera duplicada.
 */
function relationshipChange(
  action: string,
  raw: Raw,
  model: UMLModel,
  owner: string,
): UmlOperation[] {
  const source = findByName(model.classes, owner);
  const target = findByName(model.classes, asString(raw.target));
  if (source === undefined || target === undefined) return [];
  const rawKind = asString(raw.relationshipKind);
  const kind = rawKind === '' ? null : normalizeRelationshipKind(rawKind);
  const matches = model.relationships.filter(
    (r) =>
      (kind === null || r.kind === kind) &&
      ((r.sourceId === source.id && r.targetId === target.id) ||
        (r.sourceId === target.id && r.targetId === source.id)),
  );
  if (action === 'delete') return matches.map((r) => ({ type: 'deleteRelationship', id: r.id }));
  const first = matches[0];
  return first === undefined ? [] : relationshipUpdate(raw, first, source.id);
}

function relationshipUpdate(
  raw: Raw,
  relationship: UMLRelationship,
  sourceId: string,
): UmlOperation[] {
  const newKind = asString(raw.newKind);
  const kind = newKind === '' ? relationship.kind : normalizeRelationshipKind(newKind);
  // Las multiplicidades se dan en el sentido en que la IA nombro la relacion.
  const reversed = relationship.sourceId !== sourceId;
  const near = asString(raw.sourceMultiplicity);
  const far = asString(raw.targetMultiplicity);
  const sourceEnd = endWith(relationship.sourceEnd, reversed ? far : near);
  const targetEnd = endWith(relationship.targetEnd, reversed ? near : far);
  const changes = {
    ...(kind === relationship.kind ? {} : { kind }),
    ...(sourceEnd === relationship.sourceEnd ? {} : { sourceEnd }),
    ...(targetEnd === relationship.targetEnd ? {} : { targetEnd }),
  };
  return Object.keys(changes).length === 0
    ? []
    : [{ type: 'updateRelationship', id: relationship.id, changes }];
}

function endWith(end: UMLRelationship['sourceEnd'], multiplicity: string) {
  if (multiplicity === '') return end;
  const normalized = normalizeMultiplicity(multiplicity, end.multiplicity);
  return normalized === end.multiplicity ? end : { ...end, multiplicity: normalized };
}

function memberName(raw: Raw): string {
  return asString(raw.memberName || raw.attribute || raw.operation || raw.method);
}

function newName(raw: Raw, current: string): { name?: string } {
  const name = asString(raw.newName).trim();
  return name === '' || name === current ? {} : { name };
}

function flag<K extends string>(raw: Raw, key: K): Partial<Record<K, boolean>> {
  const value = raw[key];
  return typeof value === 'boolean' ? ({ [key]: value } as Partial<Record<K, boolean>>) : {};
}

function findByName<T extends { name: string }>(items: readonly T[], name: string): T | undefined {
  const key = name.trim().toLowerCase();
  return key === '' ? undefined : items.find((item) => item.name.toLowerCase() === key);
}
