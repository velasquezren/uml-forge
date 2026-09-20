import type * as Y from 'yjs';
import { fromZodError, umlError, type UmlError } from '../errors.js';
import { asYArray, asYMap } from './access.js';
import { err, ok, type Result } from '../result.js';
import { UMLModelSchema, type UMLModel } from '../schemas/model.js';
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

/**
 * Reconstruye el modelo a partir del documento Yjs. Las colecciones viven en
 * mapas indexados por identificador, de modo que el orden de insercion no forma
 * parte del estado compartido: se devuelven ordenadas por identificador para que
 * el resultado sea determinista. Ver ADR 0009.
 */
export function fromYDoc(doc: Y.Doc): Result<UMLModel, UmlError> {
  const meta = doc.getMap<unknown>(ROOT_META);
  if (meta.size === 0) {
    return err(umlError('invalid_document', 'el documento no contiene metadatos del modelo'));
  }

  const candidate = {
    id: meta.get(META_ID),
    name: meta.get(META_NAME),
    createdAt: meta.get(META_CREATED_AT),
    updatedAt: meta.get(META_UPDATED_AT),
    classes: readCollection(doc.getMap<unknown>(ROOT_CLASSES)),
    enums: readCollection(doc.getMap<unknown>(ROOT_ENUMS)),
    relationships: readCollection(doc.getMap<unknown>(ROOT_RELATIONSHIPS)),
  };

  const parsed = UMLModelSchema.safeParse(candidate);
  return parsed.success
    ? ok(parsed.data)
    : err(fromZodError(parsed.error.issues, 'documento Yjs invalido'));
}

/** Indica si el documento ya contiene un modelo. */
export function hasModel(doc: Y.Doc): boolean {
  return doc.getMap<unknown>(ROOT_META).size > 0;
}

/** Lee una coleccion indexada por identificador y la devuelve ordenada. */
function readCollection(map: Y.Map<unknown>): unknown[] {
  return [...map.keys()].sort().map((key) => toPlain(map.get(key)));
}

/** Convierte un valor del documento a datos planos, listos para validar con Zod. */
function toPlain(value: unknown): unknown {
  const nested = asYMap(value) ?? asYArray(value);
  return nested === null ? value : (nested.toJSON() as unknown);
}
