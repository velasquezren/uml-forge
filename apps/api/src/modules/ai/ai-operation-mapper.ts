import { randomUUID } from 'node:crypto';
import type { UMLModel, UmlOperation } from '@uml-forge/uml-core';
import {
  asString,
  asStringOrNull,
  convertDeclarativeToItems,
  normalizeVisibility,
  type RawAiItem,
} from './ai-mapper-helpers';
import { processRelationshipItem } from './ai-relationship-mapper';
import { processClassItem } from './ai-class-mapper';
import { parseTextToRawAiItems } from './ai-text-parser';

export {
  parseAttributeString,
  normalizeVisibility,
  normalizeMultiplicity,
  normalizeRelationshipKind,
} from './ai-mapper-helpers';

/**
 * Transforma respuestas flexibles de cualquier LLM (atómicas, declarativas o texto)
 * en operaciones atómicas estrictas UmlOperation garantizando orden topológico y aciclicidad.
 */
export function mapAiOperationsToUmlOperations(
  rawInput: unknown,
  existingModel?: UMLModel,
): UmlOperation[] {
  if (!rawInput) return [];

  const classIdByName = new Map<string, string>();
  const enumIdByName = new Map<string, string>();

  // Cargar IDs de clases y enums existentes para vincular referencias
  if (existingModel) {
    for (const c of existingModel.classes) {
      classIdByName.set(c.name.toLowerCase(), c.id);
    }
    for (const e of existingModel.enums) {
      enumIdByName.set(e.name.toLowerCase(), e.id);
    }
  }

  // Desempaquetar entrada flexible
  let itemsToProcess: RawAiItem[] = [];

  if (Array.isArray(rawInput)) {
    itemsToProcess = rawInput.filter((x): x is RawAiItem => Boolean(x && typeof x === 'object'));
  } else if (typeof rawInput === 'object') {
    const obj = rawInput as RawAiItem;
    // Si viene como { operations: [...] }
    if (Array.isArray(obj.operations)) {
      itemsToProcess = obj.operations.filter((x): x is RawAiItem =>
        Boolean(x && typeof x === 'object'),
      );
    }
    // Si viene como { classes: [...], relationships: [...], enums: [...] }
    if (
      Array.isArray(obj.classes) ||
      Array.isArray(obj.relationships) ||
      Array.isArray(obj.enums) ||
      Array.isArray(obj.entities)
    ) {
      itemsToProcess = convertDeclarativeToItems(obj);
    }
  }

  // Si aún está vacío, intentar extraer desde texto libre (p.ej. markdown de Llava)
  if (itemsToProcess.length === 0 && typeof rawInput === 'string') {
    return parseUmlFromFreeformText(rawInput, existingModel);
  }

  const classOperations: UmlOperation[] = [];
  const enumOperations: UmlOperation[] = [];
  const attributeOperations: UmlOperation[] = [];
  const operationOperations: UmlOperation[] = [];
  const relationshipOperations: UmlOperation[] = [];

  let classIndex = 0;

  for (const raw of itemsToProcess) {
    const rawType = asString(raw.type || raw.action).toLowerCase();

    // 1. Clases
    if (
      rawType === 'addclass' ||
      rawType === 'add_class' ||
      rawType === 'createclass' ||
      rawType === 'create_class' ||
      (!rawType && raw.name && (raw.attributes || raw.methods || raw.isAbstract !== undefined))
    ) {
      classIndex = processClassItem(
        raw,
        classIndex,
        classIdByName,
        classOperations,
        attributeOperations,
        operationOperations,
      );
    }

    // 2. Enums
    else if (
      rawType === 'addenum' ||
      rawType === 'add_enum' ||
      rawType === 'createenum' ||
      rawType === 'create_enum'
    ) {
      const name = asString(raw.name || (raw.enum as RawAiItem | undefined)?.name, 'NewEnum');
      const enumId = asString(raw.id || (raw.enum as RawAiItem | undefined)?.id, randomUUID());
      enumIdByName.set(name.toLowerCase(), enumId);

      const rawLiterals = (raw.literals ||
        (raw.enum as RawAiItem | undefined)?.literals) as unknown[];
      const literals = Array.isArray(rawLiterals)
        ? rawLiterals.map((l) => asString(l))
        : ['DEFAULT_VALUE'];

      const col = classIndex % 3;
      const row = Math.floor(classIndex / 3);
      classIndex++;

      enumOperations.push({
        type: 'addEnum',
        enum: {
          id: enumId,
          name,
          literals,
          position: {
            x: Number((raw.position as RawAiItem | undefined)?.x ?? col * 340 + 60),
            y: Number((raw.position as RawAiItem | undefined)?.y ?? row * 260 + 60),
          },
        },
      });
    }

    // 3. Atributos atómicos
    else if (rawType === 'addattribute' || rawType === 'add_attribute') {
      const targetName = asString(raw.target || raw.className || raw.class);
      let classId = asString(raw.classId || classIdByName.get(targetName.toLowerCase()));

      if (!classId) {
        classId = randomUUID();
        classIdByName.set(targetName.toLowerCase(), classId);
        classOperations.push({
          type: 'addClass',
          class: {
            id: classId,
            name: targetName || 'GeneratedClass',
            isAbstract: false,
            isInterface: false,
            stereotypes: [],
            position: { x: 60, y: 60 },
          },
        });
      }

      const rawAttr = (raw.attribute || raw) as RawAiItem;
      const attrName = asString(rawAttr.name, 'newAttribute');
      const propType = asString(rawAttr.type || rawAttr.propertyType, 'String');
      const isId = Boolean(rawAttr.isIdentifier || attrName.toLowerCase() === 'id');

      attributeOperations.push({
        type: 'addAttribute',
        classId,
        attribute: {
          id: asString(rawAttr.id, randomUUID()),
          name: attrName,
          type: propType,
          visibility: normalizeVisibility(rawAttr.visibility),
          multiplicity: asString(rawAttr.multiplicity, '1'),
          isStatic: Boolean(rawAttr.isStatic),
          isDerived: Boolean(rawAttr.isDerived),
          isUnique: Boolean(rawAttr.isUnique || isId),
          isNullable: Boolean(rawAttr.isNullable ?? !isId),
          isIdentifier: isId,
          defaultValue: asStringOrNull(rawAttr.defaultValue),
        },
      });
    }

    // 4. Operaciones atómicas
    else if (rawType === 'addoperation' || rawType === 'add_operation') {
      const targetName = asString(raw.target || raw.className || raw.class);
      let classId = asString(raw.classId || classIdByName.get(targetName.toLowerCase()));

      if (!classId) {
        classId = randomUUID();
        classIdByName.set(targetName.toLowerCase(), classId);
        classOperations.push({
          type: 'addClass',
          class: {
            id: classId,
            name: targetName || 'GeneratedClass',
            isAbstract: false,
            isInterface: false,
            stereotypes: [],
            position: { x: 60, y: 60 },
          },
        });
      }

      const rawOp = (raw.operation || raw) as RawAiItem;
      operationOperations.push({
        type: 'addOperation',
        classId,
        operation: {
          id: asString(rawOp.id, randomUUID()),
          name: asString(rawOp.name, 'newOperation'),
          returnType: asStringOrNull(rawOp.returnType) || 'void',
          visibility: normalizeVisibility(rawOp.visibility || 'public'),
          isAbstract: Boolean(rawOp.isAbstract),
          isStatic: Boolean(rawOp.isStatic),
          parameters: Array.isArray(rawOp.parameters)
            ? (rawOp.parameters as RawAiItem[]).map((p) => ({
                id: asString(p.id, randomUUID()),
                name: asString(p.name, 'param'),
                type: asString(p.type, 'String'),
                direction: (p.direction as 'in' | 'out' | 'inout') || 'in',
              }))
            : [],
        },
      });
    }

    // 5. Relaciones
    else if (
      rawType === 'addrelationship' ||
      rawType === 'add_relationship' ||
      (!rawType && (raw.source || raw.from) && (raw.target || raw.to))
    ) {
      const relOp = processRelationshipItem(
        raw,
        classIdByName,
        classOperations,
        () => classIndex++,
      );
      if (relOp) {
        relationshipOperations.push(relOp);
      }
    }
  }

  // Retornar en estricto orden topológico
  return [
    ...classOperations,
    ...enumOperations,
    ...attributeOperations,
    ...operationOperations,
    ...relationshipOperations,
  ];
}

/** Parser de rescate para texto libre o markdown generado por modelos locales/visión. */
export function parseUmlFromFreeformText(text: string, existingModel?: UMLModel): UmlOperation[] {
  const items = parseTextToRawAiItems(text);
  return mapAiOperationsToUmlOperations(items, existingModel);
}
