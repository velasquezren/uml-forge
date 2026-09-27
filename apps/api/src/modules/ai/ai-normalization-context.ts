import { randomUUID } from 'node:crypto';
import type { UMLModel, UmlOperation } from '@uml-forge/uml-core';
import { resolveAiReturnType, resolveAiType } from './ai-type-resolver';

/** Operacion concreta del lenguaje, por su discriminante. */
export type Op<T extends UmlOperation['type']> = Extract<UmlOperation, { type: T }>;

/** Estado compartido durante la normalizacion de una respuesta. */
export class NormalizationContext {
  readonly classByName = new Map<string, string>();
  readonly enumByName = new Map<string, string>();
  readonly remap = new Map<string, string>();
  private readonly classIds = new Set<string>();
  private readonly enumIds = new Set<string>();
  private readonly enumNames = new Map<string, string>();
  private readonly enumLiterals = new Map<string, string[]>();
  private readonly attributeNames = new Map<string, Set<string>>();
  private readonly operationNames = new Map<string, Set<string>>();
  /** Tipos que ya usan los atributos de cada clase. */
  private readonly attributeTypes = new Map<string, Set<string>>();
  private readonly relationshipKeys = new Set<string>();
  private readonly inheritingClasses = new Set<string>();

  constructor(model?: UMLModel) {
    for (const umlClass of model?.classes ?? []) {
      this.registerClass(umlClass.id, umlClass.name);
      for (const attribute of umlClass.attributes) {
        this.claim(this.attributeNames, umlClass.id, attribute.name);
        this.noteType(umlClass.id, attribute.type);
      }
      for (const operation of umlClass.operations)
        this.claim(this.operationNames, umlClass.id, operation.name);
    }
    for (const umlEnum of model?.enums ?? []) {
      this.registerEnum(umlEnum.id, umlEnum.name);
      this.enumLiterals.set(umlEnum.id, [...umlEnum.literals]);
    }
    for (const relationship of model?.relationships ?? []) {
      this.relationshipKeys.add(
        relationshipKey(relationship.kind, relationship.sourceId, relationship.targetId),
      );
      if (relationship.kind === 'generalization') this.inheritingClasses.add(relationship.sourceId);
    }
  }

  registerClass(id: string, name: string): void {
    this.classByName.set(name.toLowerCase(), id);
    this.classIds.add(id);
  }

  registerEnum(id: string, name: string): void {
    this.enumByName.set(name.toLowerCase(), id);
    this.enumIds.add(id);
    this.enumNames.set(id, name);
  }

  /** Anade a una enumeracion existente los literales que aun no tenia. */
  mergeEnumLiterals(
    enumId: string,
    literals: readonly string[],
    pending: Op<'addEnum'>[],
  ): UmlOperation | null {
    const inBatch = pending.find((op) => op.enum.id === enumId);
    const current = inBatch?.enum.literals ?? this.enumLiterals.get(enumId) ?? [];
    const merged = [...new Set([...current, ...literals])];
    if (merged.length === current.length) return null;
    if (inBatch !== undefined) {
      inBatch.enum.literals = merged;
      return null;
    }
    this.enumLiterals.set(enumId, merged);
    return { type: 'updateEnum', id: enumId, changes: { literals: merged } };
  }

  private resolveId(id: string): string {
    return this.remap.get(id) ?? id;
  }

  private readonly lookup = (name: string): string | undefined =>
    this.classByName.get(name.toLowerCase()) ?? this.enumByName.get(name.toLowerCase());

  private readonly isKnownId = (id: string): boolean =>
    this.classIds.has(this.resolveId(id)) || this.enumIds.has(this.resolveId(id));

  private type(raw: string) {
    const resolved = resolveAiType(raw, this.lookup, this.isKnownId);
    return { ...resolved, type: this.resolveId(resolved.type) };
  }

  /** Reserva un nombre de miembro en una clase; falso si ya estaba cogido. */
  private claim(index: Map<string, Set<string>>, classId: string, name: string): boolean {
    const names = index.get(classId) ?? new Set<string>();
    index.set(classId, names);
    const key = name.trim().toLowerCase();
    if (names.has(key)) return false;
    names.add(key);
    return true;
  }

  normalizeAttribute(op: Op<'addAttribute'>): Op<'addAttribute'> | null {
    const classId = this.resolveId(op.classId);
    if (
      !this.classIds.has(classId) ||
      !this.claim(this.attributeNames, classId, op.attribute.name)
    ) {
      return null;
    }
    const { type, isCollection } = this.type(op.attribute.type);
    const multiplicity =
      isCollection && op.attribute.multiplicity === '1' ? '0..*' : op.attribute.multiplicity;
    this.noteType(classId, type);
    return { ...op, classId, attribute: { ...op.attribute, type, multiplicity } };
  }

  private noteType(classId: string, type: string): void {
    const types = this.attributeTypes.get(classId) ?? new Set<string>();
    types.add(type);
    this.attributeTypes.set(classId, types);
  }

  normalizeOperation(op: Op<'addOperation'>): Op<'addOperation'> | null {
    const classId = this.resolveId(op.classId);
    if (
      !this.classIds.has(classId) ||
      !this.claim(this.operationNames, classId, op.operation.name)
    ) {
      return null;
    }
    const returnType = resolveAiReturnType(op.operation.returnType, this.lookup, this.isKnownId);
    return {
      ...op,
      classId,
      operation: {
        ...op.operation,
        returnType: returnType === null ? null : this.resolveId(returnType),
        parameters: op.operation.parameters.map((parameter) => ({
          ...parameter,
          type: this.type(parameter.type).type,
        })),
      },
    };
  }

  /** Relacion depurada, atributo si apunta a una enumeracion, o null si sobra. */
  normalizeRelationship(op: Op<'addRelationship'>): UmlOperation | null {
    const sourceId = this.resolveId(op.relationship.sourceId);
    const targetId = this.resolveId(op.relationship.targetId);
    const { kind } = op.relationship;

    if (this.enumIds.has(sourceId) || this.enumIds.has(targetId)) {
      return this.enumAttribute(sourceId, targetId);
    }
    if (!this.classIds.has(sourceId) || !this.classIds.has(targetId)) return null;
    if (sourceId === targetId && (kind === 'generalization' || kind === 'realization')) return null;

    const key = relationshipKey(kind, sourceId, targetId);
    const reverse = relationshipKey(kind, targetId, sourceId);
    const symmetric = kind === 'association';
    if (this.relationshipKeys.has(key) || (symmetric && this.relationshipKeys.has(reverse)))
      return null;
    this.relationshipKeys.add(key);
    if (kind === 'generalization') this.inheritingClasses.add(sourceId);

    return { ...op, relationship: { ...op.relationship, sourceId, targetId } };
  }

  /** "Pedido - EstadoPedido" se modela como el atributo `estadoPedido: EstadoPedido`. */
  private enumAttribute(sourceId: string, targetId: string): Op<'addAttribute'> | null {
    const classId = this.classIds.has(sourceId)
      ? sourceId
      : this.classIds.has(targetId)
        ? targetId
        : null;
    const enumId = this.enumIds.has(targetId)
      ? targetId
      : this.enumIds.has(sourceId)
        ? sourceId
        : null;
    // Si la clase ya tiene un atributo de esa enumeracion, la relacion sobra.
    if (classId === null || enumId === null || this.attributeTypes.get(classId)?.has(enumId)) {
      return null;
    }

    const enumName = this.enumNames.get(enumId) ?? 'estado';
    const name = enumName.charAt(0).toLowerCase() + enumName.slice(1);
    if (!this.claim(this.attributeNames, classId, name)) return null;
    this.noteType(classId, enumId);

    return newAttribute(classId, { name, type: enumId, isNullable: false });
  }

  /** `id: Long` para cada clase concreta nueva que no tenga ni herede identificador. */
  missingIdentifiers(
    classes: readonly Op<'addClass'>[],
    attributes: readonly Op<'addAttribute'>[],
    relationships: readonly UmlOperation[],
  ): Op<'addAttribute'>[] {
    const inheriting = new Set(this.inheritingClasses);
    for (const op of relationships) {
      if (op.type === 'addRelationship' && op.relationship.kind === 'generalization') {
        inheriting.add(op.relationship.sourceId);
      }
    }

    return classes
      .filter(({ class: umlClass }) => !umlClass.isInterface && !inheriting.has(umlClass.id))
      .filter(
        ({ class: umlClass }) =>
          !attributes.some((op) => op.classId === umlClass.id && op.attribute.isIdentifier),
      )
      .filter(({ class: umlClass }) => this.claim(this.attributeNames, umlClass.id, 'id'))
      .map(({ class: umlClass }) =>
        newAttribute(umlClass.id, {
          name: 'id',
          type: 'Long',
          isUnique: true,
          isNullable: false,
          isIdentifier: true,
        }),
      );
  }
}

/** Atributo privado de multiplicidad 1 con los valores indicados. */
function newAttribute(
  classId: string,
  fields: Pick<Op<'addAttribute'>['attribute'], 'name' | 'type'> &
    Partial<Op<'addAttribute'>['attribute']>,
): Op<'addAttribute'> {
  return {
    type: 'addAttribute',
    classId,
    attribute: {
      id: randomUUID(),
      visibility: 'private',
      multiplicity: '1',
      isStatic: false,
      isDerived: false,
      isUnique: false,
      isNullable: true,
      isIdentifier: false,
      defaultValue: null,
      ...fields,
    },
  };
}

function relationshipKey(kind: string, sourceId: string, targetId: string): string {
  return `${kind}|${sourceId}|${targetId}`;
}
