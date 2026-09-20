import { randomUUID } from 'node:crypto';
import type { UmlOperation } from '@uml-forge/uml-core';
import {
  asString,
  asStringOrNull,
  normalizeVisibility,
  parseAttributeString,
  type RawAiItem,
} from './ai-mapper-helpers';

/** Procesa la definición de una clase y sus atributos/métodos anidados. */
export function processClassItem(
  raw: RawAiItem,
  classIndex: number,
  classIdByName: Map<string, string>,
  classOperations: UmlOperation[],
  attributeOperations: UmlOperation[],
  operationOperations: UmlOperation[],
): number {
  const name = asString(
    raw.name || (raw.class as RawAiItem | undefined)?.name,
    `Class_${classIndex + 1}`,
  );
  const classId = asString(raw.id || (raw.class as RawAiItem | undefined)?.id, randomUUID());
  classIdByName.set(name.toLowerCase(), classId);

  // Posicionamiento inteligente en cuadrícula de 3 columnas
  const col = classIndex % 3;
  const row = Math.floor(classIndex / 3);
  const defaultX = col * 340 + 60;
  const defaultY = row * 260 + 60;
  const nextIndex = classIndex + 1;

  const posRaw = (raw.position || (raw.class as RawAiItem | undefined)?.position) as
    RawAiItem | undefined;
  const x = typeof posRaw?.x === 'number' ? posRaw.x : defaultX;
  const y = typeof posRaw?.y === 'number' ? posRaw.y : defaultY;

  classOperations.push({
    type: 'addClass',
    class: {
      id: classId,
      name,
      isAbstract: Boolean(raw.isAbstract || (raw.class as RawAiItem | undefined)?.isAbstract),
      isInterface: Boolean(raw.isInterface || (raw.class as RawAiItem | undefined)?.isInterface),
      stereotypes: Array.isArray(raw.stereotypes) ? raw.stereotypes.map((s) => asString(s)) : [],
      position: { x, y },
    },
  });

  // Atributos anidados en formato declarativo
  const nestedAttrs = raw.attributes as unknown[];
  if (Array.isArray(nestedAttrs)) {
    for (const attrItem of nestedAttrs) {
      if (typeof attrItem === 'string') {
        const parsed = parseAttributeString(attrItem);
        attributeOperations.push({
          type: 'addAttribute',
          classId,
          attribute: {
            id: randomUUID(),
            name: parsed.name,
            type: parsed.type,
            visibility: parsed.visibility,
            multiplicity: '1',
            isStatic: false,
            isDerived: false,
            isUnique: parsed.isIdentifier,
            isNullable: !parsed.isIdentifier,
            isIdentifier: parsed.isIdentifier,
            defaultValue: null,
          },
        });
      } else if (attrItem && typeof attrItem === 'object') {
        const a = attrItem as RawAiItem;
        const aName = asString(a.name, 'attr');
        const cleanAName = aName.toLowerCase();
        const isId = Boolean(
          a.isIdentifier ||
          cleanAName === 'id' ||
          cleanAName === '_id' ||
          (cleanAName.length > 2 && cleanAName.endsWith('_id')),
        );
        attributeOperations.push({
          type: 'addAttribute',
          classId,
          attribute: {
            id: asString(a.id, randomUUID()),
            name: aName,
            type: asString(a.type || a.propertyType, 'String'),
            visibility: normalizeVisibility(a.visibility),
            multiplicity: asString(a.multiplicity, '1'),
            isStatic: Boolean(a.isStatic),
            isDerived: Boolean(a.isDerived),
            isUnique: Boolean(a.isUnique || isId),
            isNullable: Boolean(a.isNullable ?? !isId),
            isIdentifier: isId,
            defaultValue: asStringOrNull(a.defaultValue),
          },
        });
      }
    }
  }

  // Operaciones/métodos anidados
  const nestedMethods = (raw.methods || raw.operations) as unknown[];
  if (Array.isArray(nestedMethods)) {
    for (const mItem of nestedMethods) {
      if (typeof mItem === 'string') {
        const mName = mItem.replace(/\(.*\)/gu, '').trim() || 'method';
        operationOperations.push({
          type: 'addOperation',
          classId,
          operation: {
            id: randomUUID(),
            name: mName,
            returnType: 'void',
            visibility: 'public',
            isAbstract: false,
            isStatic: false,
            parameters: [],
          },
        });
      } else if (mItem && typeof mItem === 'object') {
        const m = mItem as RawAiItem;
        operationOperations.push({
          type: 'addOperation',
          classId,
          operation: {
            id: asString(m.id, randomUUID()),
            name: asString(m.name, 'operation'),
            returnType: asStringOrNull(m.returnType) || 'void',
            visibility: normalizeVisibility(m.visibility || 'public'),
            isAbstract: Boolean(m.isAbstract),
            isStatic: Boolean(m.isStatic),
            parameters: Array.isArray(m.parameters)
              ? (m.parameters as RawAiItem[]).map((p) => ({
                  id: asString(p.id, randomUUID()),
                  name: asString(p.name, 'param'),
                  type: asString(p.type, 'String'),
                  direction: (p.direction as 'in' | 'out' | 'inout') || 'in',
                }))
              : [],
          },
        });
      }
    }
  }

  return nextIndex;
}
