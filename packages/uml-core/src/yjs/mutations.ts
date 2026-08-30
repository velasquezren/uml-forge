import * as Y from 'yjs';
import type { UmlOperation } from '../operations/schema.js';
import { classesMap, enumsMap, relationshipsMap, requireArray, requireMap } from './access.js';
import { locateMember } from './locate.js';
import { cascadeTypeRemoval, deleteClassWithCascade } from './mutations-cascade.js';
import {
  buildAttributeMap,
  buildClassMap,
  buildEndMap,
  buildEnumMap,
  buildOperationMap,
  buildParameterMap,
  buildRelationshipMap,
} from './to-ydoc.js';

/**
 * Traduce una operacion ya validada a mutaciones nativas del CRDT. Solo toca lo
 * que cambia, de modo que dos usuarios editando clases distintas no colisionan.
 * Las precondiciones ya se comprobaron contra el modelo: aqui una ausencia
 * inesperada se ignora en silencio porque el documento acaba de ser validado.
 */
export function mutate(doc: Y.Doc, operation: UmlOperation): void {
  switch (operation.type) {
    case 'addClass':
      classesMap(doc).set(
        operation.class.id,
        buildClassMap({ ...operation.class, attributes: [], operations: [] }),
      );
      return;
    case 'updateClass':
      updateClass(doc, operation.id, operation.changes);
      return;
    case 'deleteClass':
      deleteClassWithCascade(doc, operation.id);
      return;
    case 'setPosition':
      writePosition(doc, operation.classId, operation.position);
      return;

    case 'addAttribute':
      pushMember(doc, operation.classId, 'attributes', buildAttributeMap(operation.attribute));
      return;
    case 'updateAttribute':
      updateMember(doc, operation.id, 'attributes', operation.changes);
      return;
    case 'deleteAttribute':
      deleteMember(doc, operation.id, 'attributes');
      return;

    case 'addOperation':
      pushMember(doc, operation.classId, 'operations', buildOperationMap(operation.operation));
      return;
    case 'updateOperation':
      updateOperation(doc, operation.id, operation.changes);
      return;
    case 'deleteOperation':
      deleteMember(doc, operation.id, 'operations');
      return;

    case 'addRelationship':
      relationshipsMap(doc).set(
        operation.relationship.id,
        buildRelationshipMap(operation.relationship),
      );
      return;
    case 'updateRelationship':
      updateRelationship(doc, operation.id, operation.changes);
      return;
    case 'deleteRelationship':
      relationshipsMap(doc).delete(operation.id);
      return;

    case 'addEnum':
      enumsMap(doc).set(operation.enum.id, buildEnumMap(operation.enum));
      return;
    case 'updateEnum':
      updateEnum(doc, operation.id, operation.changes);
      return;
    case 'deleteEnum':
      cascadeTypeRemoval(doc, operation.id);
      enumsMap(doc).delete(operation.id);
      return;
  }
}

type ClassChanges = Extract<UmlOperation, { type: 'updateClass' }>['changes'];
type AttributeChanges = Extract<UmlOperation, { type: 'updateAttribute' }>['changes'];
type OperationChanges = Extract<UmlOperation, { type: 'updateOperation' }>['changes'];
type RelationshipChanges = Extract<UmlOperation, { type: 'updateRelationship' }>['changes'];
type EnumChanges = Extract<UmlOperation, { type: 'updateEnum' }>['changes'];

function updateClass(doc: Y.Doc, classId: string, changes: ClassChanges): void {
  const classMap = requireMap(classesMap(doc), classId);
  if (!classMap.ok) {
    return;
  }
  setIfDefined(classMap.value, 'name', changes.name);
  setIfDefined(classMap.value, 'isAbstract', changes.isAbstract);
  setIfDefined(classMap.value, 'isInterface', changes.isInterface);
  if (changes.stereotypes !== undefined) {
    classMap.value.set('stereotypes', Y.Array.from([...changes.stereotypes]));
  }
  if (changes.position !== undefined) {
    writePositionOn(classMap.value, changes.position);
  }
}

function writePosition(doc: Y.Doc, classId: string, position: { x: number; y: number }): void {
  const classMap = requireMap(classesMap(doc), classId);
  if (classMap.ok) {
    writePositionOn(classMap.value, position);
  }
}

function writePositionOn(classMap: Y.Map<unknown>, position: { x: number; y: number }): void {
  const current = requireMap(classMap, 'position');
  if (!current.ok) {
    return;
  }
  current.value.set('x', position.x);
  current.value.set('y', position.y);
}

function pushMember(
  doc: Y.Doc,
  classId: string,
  containerKey: 'attributes' | 'operations',
  entry: Y.Map<unknown>,
): void {
  const classMap = requireMap(classesMap(doc), classId);
  if (!classMap.ok) {
    return;
  }
  const container = requireArray(classMap.value, containerKey);
  if (container.ok) {
    container.value.push([entry]);
  }
}

function updateMember(
  doc: Y.Doc,
  memberId: string,
  containerKey: 'attributes' | 'operations',
  changes: AttributeChanges,
): void {
  const location = locateMember(doc, memberId, containerKey);
  if (location === null) {
    return;
  }
  for (const [key, value] of Object.entries(changes)) {
    if (value !== undefined) {
      location.entry.set(key, value);
    }
  }
}

function updateOperation(doc: Y.Doc, operationId: string, changes: OperationChanges): void {
  const location = locateMember(doc, operationId, 'operations');
  if (location === null) {
    return;
  }
  setIfDefined(location.entry, 'name', changes.name);
  setIfDefined(location.entry, 'visibility', changes.visibility);
  setIfDefined(location.entry, 'isAbstract', changes.isAbstract);
  setIfDefined(location.entry, 'isStatic', changes.isStatic);
  if (changes.returnType !== undefined) {
    location.entry.set('returnType', changes.returnType);
  }
  if (changes.parameters !== undefined) {
    location.entry.set('parameters', Y.Array.from(changes.parameters.map(buildParameterMap)));
  }
}

function deleteMember(
  doc: Y.Doc,
  memberId: string,
  containerKey: 'attributes' | 'operations',
): void {
  const location = locateMember(doc, memberId, containerKey);
  if (location !== null) {
    location.container.delete(location.index, 1);
  }
}

function updateRelationship(
  doc: Y.Doc,
  relationshipId: string,
  changes: RelationshipChanges,
): void {
  const relationship = requireMap(relationshipsMap(doc), relationshipId);
  if (!relationship.ok) {
    return;
  }
  setIfDefined(relationship.value, 'kind', changes.kind);
  setIfDefined(relationship.value, 'name', changes.name);
  setIfDefined(relationship.value, 'sourceId', changes.sourceId);
  setIfDefined(relationship.value, 'targetId', changes.targetId);
  if (changes.sourceEnd !== undefined) {
    relationship.value.set('sourceEnd', buildEndMap(changes.sourceEnd));
  }
  if (changes.targetEnd !== undefined) {
    relationship.value.set('targetEnd', buildEndMap(changes.targetEnd));
  }
}

function updateEnum(doc: Y.Doc, enumId: string, changes: EnumChanges): void {
  const umlEnum = requireMap(enumsMap(doc), enumId);
  if (!umlEnum.ok) {
    return;
  }
  setIfDefined(umlEnum.value, 'name', changes.name);
  if (changes.literals !== undefined) {
    umlEnum.value.set('literals', Y.Array.from([...changes.literals]));
  }
}

function setIfDefined(map: Y.Map<unknown>, key: string, value: unknown): void {
  if (value !== undefined) {
    map.set(key, value);
  }
}
