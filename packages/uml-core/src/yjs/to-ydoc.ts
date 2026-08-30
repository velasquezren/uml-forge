import * as Y from 'yjs';
import type {
  UMLClass,
  UMLEnum,
  UMLOperation,
  UMLParameter,
  UMLProperty,
} from '../schemas/elements.js';
import type { UMLModel } from '../schemas/model.js';
import type { Position } from '../schemas/primitives.js';
import type { UMLEnd, UMLRelationship } from '../schemas/relationships.js';
import {
  META_CREATED_AT,
  META_ID,
  META_NAME,
  META_UPDATED_AT,
  ROOT_CLASSES,
  ROOT_ENUMS,
  ROOT_META,
  ROOT_RELATIONSHIPS,
} from './keys.js';

/** Construye un documento Yjs nuevo a partir de un modelo. */
export function toYDoc(model: UMLModel): Y.Doc {
  const doc = new Y.Doc();
  writeModel(doc, model);
  return doc;
}

/** Vuelca un modelo sobre un documento existente, reemplazando su contenido. */
export function writeModel(doc: Y.Doc, model: UMLModel): void {
  doc.transact(() => {
    const classes = doc.getMap<unknown>(ROOT_CLASSES);
    const enums = doc.getMap<unknown>(ROOT_ENUMS);
    const relationships = doc.getMap<unknown>(ROOT_RELATIONSHIPS);
    const meta = doc.getMap<unknown>(ROOT_META);

    classes.clear();
    enums.clear();
    relationships.clear();

    for (const umlClass of model.classes) {
      classes.set(umlClass.id, buildClassMap(umlClass));
    }
    for (const umlEnum of model.enums) {
      enums.set(umlEnum.id, buildEnumMap(umlEnum));
    }
    for (const relationship of model.relationships) {
      relationships.set(relationship.id, buildRelationshipMap(relationship));
    }

    meta.set(META_ID, model.id);
    meta.set(META_NAME, model.name);
    meta.set(META_CREATED_AT, model.createdAt);
    meta.set(META_UPDATED_AT, model.updatedAt);
  });
}

/** Mapa Yjs de una clase. La posicion vive dentro del propio mapa de la clase. */
export function buildClassMap(umlClass: UMLClass): Y.Map<unknown> {
  const map = new Y.Map<unknown>();
  map.set('id', umlClass.id);
  map.set('name', umlClass.name);
  map.set('isAbstract', umlClass.isAbstract);
  map.set('isInterface', umlClass.isInterface);
  map.set('stereotypes', Y.Array.from([...umlClass.stereotypes]));
  map.set('attributes', Y.Array.from(umlClass.attributes.map(buildAttributeMap)));
  map.set('operations', Y.Array.from(umlClass.operations.map(buildOperationMap)));
  map.set('position', buildPositionMap(umlClass.position));
  return map;
}

/** Mapa Yjs de la posicion de una clase en el lienzo. */
export function buildPositionMap(position: Position): Y.Map<unknown> {
  const map = new Y.Map<unknown>();
  map.set('x', position.x);
  map.set('y', position.y);
  return map;
}

/** Mapa Yjs de un atributo. */
export function buildAttributeMap(attribute: UMLProperty): Y.Map<unknown> {
  const map = new Y.Map<unknown>();
  for (const [key, value] of Object.entries(attribute)) {
    map.set(key, value);
  }
  return map;
}

/** Mapa Yjs de una operacion de clase, con sus parametros como Y.Array. */
export function buildOperationMap(operation: UMLOperation): Y.Map<unknown> {
  const map = new Y.Map<unknown>();
  map.set('id', operation.id);
  map.set('name', operation.name);
  map.set('returnType', operation.returnType);
  map.set('visibility', operation.visibility);
  map.set('isAbstract', operation.isAbstract);
  map.set('isStatic', operation.isStatic);
  map.set('parameters', Y.Array.from(operation.parameters.map(buildParameterMap)));
  return map;
}

/** Mapa Yjs de un parametro de operacion. */
export function buildParameterMap(parameter: UMLParameter): Y.Map<unknown> {
  const map = new Y.Map<unknown>();
  for (const [key, value] of Object.entries(parameter)) {
    map.set(key, value);
  }
  return map;
}

/** Mapa Yjs de una enumeracion. */
export function buildEnumMap(umlEnum: UMLEnum): Y.Map<unknown> {
  const map = new Y.Map<unknown>();
  map.set('id', umlEnum.id);
  map.set('name', umlEnum.name);
  map.set('literals', Y.Array.from([...umlEnum.literals]));
  return map;
}

/** Mapa Yjs de una relacion, con sus dos extremos como mapas anidados. */
export function buildRelationshipMap(relationship: UMLRelationship): Y.Map<unknown> {
  const map = new Y.Map<unknown>();
  map.set('id', relationship.id);
  map.set('kind', relationship.kind);
  map.set('name', relationship.name);
  map.set('sourceId', relationship.sourceId);
  map.set('targetId', relationship.targetId);
  map.set('sourceEnd', buildEndMap(relationship.sourceEnd));
  map.set('targetEnd', buildEndMap(relationship.targetEnd));
  return map;
}

/** Mapa Yjs de un extremo de relacion. */
export function buildEndMap(end: UMLEnd): Y.Map<unknown> {
  const map = new Y.Map<unknown>();
  for (const [key, value] of Object.entries(end)) {
    map.set(key, value);
  }
  return map;
}
