import { UmlOperationSchema, type UMLModel, type UmlOperation } from '@uml-forge/uml-core';
import { z } from 'zod';

/** Forma en que se guarda la propuesta en la columna JSON `proposal`. */
const StoredProposalSchema = z.object({
  explanation: z.string(),
  operations: z.array(UmlOperationSchema),
  summary: z.array(z.string()),
  result: z
    .object({ applied: z.number().int(), failed: z.number().int() })
    .nullable()
    .default(null),
});

export type StoredProposal = z.infer<typeof StoredProposalSchema>;

/**
 * Lee la propuesta guardada. Se valida al leer: las operaciones se aplican
 * sobre el documento compartido y no deben entrar si la columna se altero.
 */
export function readStoredProposal(value: unknown): StoredProposal | null {
  const parsed = StoredProposalSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

/**
 * Una linea legible por operacion, para que todos vean que cambiaria antes de
 * aplicarlo. Los tipos y los extremos se nombran por su clase, no por su UUID,
 * y los cambios sobre lo existente con el nombre que tiene ahora (ADR 0045).
 */
export function summarizeOperations(
  operations: readonly UmlOperation[],
  model: UMLModel | null,
): string[] {
  const names = new Map<string, string>();
  const owners = new Map<string, string>();
  for (const item of [...(model?.classes ?? []), ...(model?.enums ?? [])]) {
    names.set(item.id, item.name);
  }
  for (const umlClass of model?.classes ?? []) {
    for (const member of [...umlClass.attributes, ...umlClass.operations]) {
      names.set(member.id, member.name);
      owners.set(member.id, umlClass.name);
    }
  }
  for (const op of operations) {
    if (op.type === 'addClass') names.set(op.class.id, op.class.name);
    if (op.type === 'addEnum') names.set(op.enum.id, op.enum.name);
  }
  const nameOf = (id: string): string => names.get(id) ?? id;
  const member = (id: string): string => `${owners.get(id) ?? '?'}.${nameOf(id)}`;
  const relationship = (id: string): string => {
    const r = model?.relationships.find((candidate) => candidate.id === id);
    return r === undefined
      ? 'relacion'
      : `${r.kind} ${nameOf(r.sourceId)} -> ${nameOf(r.targetId)}`;
  };

  const lines: string[] = [];
  for (const op of operations) {
    switch (op.type) {
      case 'addClass':
        lines.push(`${op.class.isInterface ? 'Nueva interfaz' : 'Nueva clase'} ${op.class.name}`);
        break;
      case 'addEnum':
        lines.push(`Nueva enumeracion ${op.enum.name} (${op.enum.literals.join(', ')})`);
        break;
      case 'addAttribute':
        lines.push(
          `${nameOf(op.classId)}: + ${op.attribute.name} (${nameOf(op.attribute.type)}${op.attribute.multiplicity === '1' ? '' : ` [${op.attribute.multiplicity}]`})`,
        );
        break;
      case 'addOperation':
        lines.push(`${nameOf(op.classId)}: + ${op.operation.name}()`);
        break;
      case 'addRelationship': {
        const r = op.relationship;
        lines.push(
          `Relacion ${r.kind}: ${nameOf(r.sourceId)} [${r.sourceEnd.multiplicity}] -> ${nameOf(r.targetId)} [${r.targetEnd.multiplicity}]`,
        );
        break;
      }
      case 'updateClass':
        lines.push(`Clase ${nameOf(op.id)}: ${describeChanges(op.changes, nameOf)}`);
        break;
      case 'updateEnum':
        lines.push(`Enumeracion ${nameOf(op.id)}: ${describeChanges(op.changes, nameOf)}`);
        break;
      case 'updateAttribute':
      case 'updateOperation':
        lines.push(`${member(op.id)}: ${describeChanges(op.changes, nameOf)}`);
        break;
      case 'updateRelationship':
        lines.push(`Relacion ${relationship(op.id)}: ${describeChanges(op.changes, nameOf)}`);
        break;
      case 'deleteClass':
        lines.push(`Eliminar la clase ${nameOf(op.id)} y sus relaciones`);
        break;
      case 'deleteEnum':
        lines.push(`Eliminar la enumeracion ${nameOf(op.id)}`);
        break;
      case 'deleteAttribute':
      case 'deleteOperation':
        lines.push(`${owners.get(op.id) ?? '?'}: - ${nameOf(op.id)}`);
        break;
      case 'deleteRelationship':
        lines.push(`Eliminar la relacion ${relationship(op.id)}`);
        break;
      case 'setPosition':
        lines.push(`Mover ${nameOf(op.classId)}`);
    }
  }
  return lines;
}

/** "renombrar a Cliente, tipo UUID, multiplicidad 0..1" a partir de los cambios. */
function describeChanges(changes: object, nameOf: (id: string) => string): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(changes)) {
    if (key === 'name' && typeof value === 'string') parts.push(`renombrar a ${value}`);
    else if (key === 'type' && typeof value === 'string') parts.push(`tipo ${nameOf(value)}`);
    else if (key === 'kind' && typeof value === 'string') parts.push(`pasa a ${value}`);
    else if (key === 'literals' && Array.isArray(value))
      parts.push(`literales ${value.join(', ')}`);
    else if (key === 'multiplicity' && typeof value === 'string')
      parts.push(`multiplicidad ${value}`);
    else if ((key === 'sourceEnd' || key === 'targetEnd') && isEnd(value)) {
      parts.push(`${key === 'sourceEnd' ? 'origen' : 'destino'} [${value.multiplicity}]`);
    } else if (typeof value === 'boolean')
      parts.push(`${FLAGS[key] ?? key}: ${value ? 'si' : 'no'}`);
  }
  return parts.length > 0 ? parts.join(', ') : 'sin cambios';
}

const FLAGS: Record<string, string> = {
  isAbstract: 'abstracta',
  isInterface: 'interfaz',
  isIdentifier: 'identificador',
  isNullable: 'admite nulo',
  isUnique: 'unico',
  isStatic: 'estatico',
};

function isEnd(value: unknown): value is { multiplicity: string } {
  return typeof value === 'object' && value !== null && 'multiplicity' in value;
}
