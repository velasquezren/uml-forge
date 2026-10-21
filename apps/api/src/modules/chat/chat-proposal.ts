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
 * aplicarlo. Los tipos y los extremos se nombran por su clase, no por su UUID.
 */
export function summarizeOperations(
  operations: readonly UmlOperation[],
  model: UMLModel | null,
): string[] {
  const names = new Map<string, string>();
  for (const item of [...(model?.classes ?? []), ...(model?.enums ?? [])]) {
    names.set(item.id, item.name);
  }
  for (const op of operations) {
    if (op.type === 'addClass') names.set(op.class.id, op.class.name);
    if (op.type === 'addEnum') names.set(op.enum.id, op.enum.name);
  }
  const nameOf = (id: string): string => names.get(id) ?? id;

  const lines: string[] = [];
  for (const op of operations) {
    switch (op.type) {
      case 'addClass':
        lines.push(`${op.class.isInterface ? 'Nueva interfaz' : 'Nueva clase'} ${op.class.name}`);
        break;
      case 'addEnum':
        lines.push(`Nueva enumeracion ${op.enum.name} (${op.enum.literals.join(', ')})`);
        break;
      case 'updateEnum':
        lines.push(`${nameOf(op.id)}: literales ${(op.changes.literals ?? []).join(', ')}`);
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
      // La IA solo propone adiciones (ADR 0035); el resto se nombra tal cual.
      case 'updateClass':
      case 'deleteClass':
      case 'updateAttribute':
      case 'deleteAttribute':
      case 'updateOperation':
      case 'deleteOperation':
      case 'updateRelationship':
      case 'deleteRelationship':
      case 'deleteEnum':
      case 'setPosition':
        lines.push(`Operacion ${op.type}`);
    }
  }
  return lines;
}
