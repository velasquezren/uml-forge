import { randomUUID } from 'node:crypto';
import type { UMLModel, UmlOperation } from '@uml-forge/uml-core';

interface RawAiItem {
  [key: string]: unknown;
}

function asString(val: unknown, fallback = ''): string {
  if (typeof val === 'string') return val;
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  return fallback;
}

function asStringOrNull(val: unknown): string | null {
  return typeof val === 'string' ? val : null;
}

/** Transforma las sugerencias flexibles del LLM en operaciones atomicas estrictas UmlOperation. */
export function mapAiOperationsToUmlOperations(
  rawList: unknown[],
  existingModel?: UMLModel,
): UmlOperation[] {
  const classIdByName = new Map<string, string>();
  const enumIdByName = new Map<string, string>();

  // Cargar IDs de clases y enums existentes
  if (existingModel) {
    for (const c of existingModel.classes) {
      classIdByName.set(c.name.toLowerCase(), c.id);
    }
    for (const e of existingModel.enums) {
      enumIdByName.set(e.name.toLowerCase(), e.id);
    }
  }

  const operations: UmlOperation[] = [];

  for (const item of rawList) {
    if (!item || typeof item !== 'object') continue;
    const raw = item as RawAiItem;
    const rawType = asString(raw.type || raw.action).toLowerCase();

    // 1. Clases
    if (
      rawType === 'addclass' ||
      rawType === 'add_class' ||
      rawType === 'createclass' ||
      rawType === 'create_class'
    ) {
      const name = asString(raw.name || (raw.class as RawAiItem | undefined)?.name, 'NewClass');
      const classId = asString(raw.id || (raw.class as RawAiItem | undefined)?.id, randomUUID());
      classIdByName.set(name.toLowerCase(), classId);

      operations.push({
        type: 'addClass',
        class: {
          id: classId,
          name,
          isAbstract: Boolean(raw.isAbstract || (raw.class as RawAiItem | undefined)?.isAbstract),
          isInterface: Boolean(
            raw.isInterface || (raw.class as RawAiItem | undefined)?.isInterface,
          ),
          stereotypes: Array.isArray(raw.stereotypes)
            ? raw.stereotypes.map((s) => asString(s))
            : [],
          position: {
            x: Number(
              (raw.position as RawAiItem | undefined)?.x ?? Math.floor(Math.random() * 400 + 50),
            ),
            y: Number(
              (raw.position as RawAiItem | undefined)?.y ?? Math.floor(Math.random() * 300 + 50),
            ),
          },
        },
      });
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
        : ['DEFAULT_LITERAL'];

      operations.push({
        type: 'addEnum',
        enum: {
          id: enumId,
          name,
          literals,
        },
      });
    }

    // 3. Atributos
    else if (rawType === 'addattribute' || rawType === 'add_attribute') {
      const targetName = asString(raw.target || raw.className || raw.class);
      const classId = asString(
        raw.classId || classIdByName.get(targetName.toLowerCase()),
        randomUUID(),
      );
      const rawAttr = (raw.attribute || raw) as RawAiItem;
      const attrName = asString(rawAttr.name, 'newAttribute');
      const propType = asString(rawAttr.type || rawAttr.propertyType, 'String');

      operations.push({
        type: 'addAttribute',
        classId,
        attribute: {
          id: asString(rawAttr.id, randomUUID()),
          name: attrName,
          type: propType,
          visibility:
            (rawAttr.visibility as 'public' | 'private' | 'protected' | 'package') || 'private',
          multiplicity: asString(rawAttr.multiplicity, '1'),
          isStatic: Boolean(rawAttr.isStatic),
          isDerived: Boolean(rawAttr.isDerived),
          isUnique: Boolean(rawAttr.isUnique),
          isNullable: Boolean(rawAttr.isNullable ?? true),
          isIdentifier: Boolean(rawAttr.isIdentifier || attrName.toLowerCase() === 'id'),
          defaultValue: asStringOrNull(rawAttr.defaultValue),
        },
      });
    }

    // 4. Operaciones
    else if (rawType === 'addoperation' || rawType === 'add_operation') {
      const targetName = asString(raw.target || raw.className || raw.class);
      const classId = asString(
        raw.classId || classIdByName.get(targetName.toLowerCase()),
        randomUUID(),
      );
      const rawOp = (raw.operation || raw) as RawAiItem;
      const opName = asString(rawOp.name, 'newOperation');

      operations.push({
        type: 'addOperation',
        classId,
        operation: {
          id: asString(rawOp.id, randomUUID()),
          name: opName,
          returnType: asStringOrNull(rawOp.returnType),
          visibility:
            (rawOp.visibility as 'public' | 'private' | 'protected' | 'package') || 'public',
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
    else if (rawType === 'addrelationship' || rawType === 'add_relationship') {
      const rawRel = (raw.relationship || raw) as RawAiItem;
      const srcTarget = asString(rawRel.source || rawRel.sourceName);
      const tgtTarget = asString(rawRel.target || rawRel.targetName);

      const sourceId = asString(
        rawRel.sourceId || classIdByName.get(srcTarget.toLowerCase()),
        randomUUID(),
      );
      const targetId = asString(
        rawRel.targetId || classIdByName.get(tgtTarget.toLowerCase()),
        randomUUID(),
      );
      const kind =
        (rawRel.kind as
          'association' | 'generalization' | 'realization' | 'aggregation' | 'composition') ||
        'association';

      operations.push({
        type: 'addRelationship',
        relationship: {
          id: asString(rawRel.id, randomUUID()),
          kind,
          name: asString(rawRel.name),
          sourceId,
          targetId,
          sourceEnd: {
            name: '',
            role: asString(rawRel.sourceRole),
            multiplicity: asString(rawRel.sourceMultiplicity, '1'),
            navigable: true,
          },
          targetEnd: {
            name: '',
            role: asString(rawRel.targetRole),
            multiplicity: asString(
              rawRel.targetMultiplicity,
              kind === 'association' ? '0..*' : '1',
            ),
            navigable: true,
          },
        },
      });
    }
  }

  return operations;
}
