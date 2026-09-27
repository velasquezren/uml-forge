import type { UMLModel, UmlOperation } from '@uml-forge/uml-core';
import { layoutNewClassifiers } from './ai-layout';
import { NormalizationContext, type Op } from './ai-normalization-context';

/**
 * Convierte la propuesta de la IA en operaciones que el lienzo puede aplicar
 * sin errores y sin duplicar nada (ADR 0035):
 *
 * - Una clase o enumeracion que ya existe se reutiliza en lugar de crearse de
 *   nuevo; todo lo que apuntaba a la copia pasa a apuntar a la original.
 * - Los tipos se traducen a primitivos del metamodelo o a identificadores.
 * - No se repiten atributos, operaciones ni relaciones que ya estan.
 * - Una relacion con una enumeracion se convierte en un atributo de ese tipo.
 * - Toda clase concreta nueva tiene identificador, salvo que herede uno.
 * - Lo nuevo se coloca debajo del diagrama existente, sin solaparse.
 */
export function normalizeAiOperations(
  operations: readonly UmlOperation[],
  model?: UMLModel,
): UmlOperation[] {
  const context = new NormalizationContext(model);

  const classes: Op<'addClass'>[] = [];
  const enums: Op<'addEnum'>[] = [];
  const enumUpdates: UmlOperation[] = [];

  // Primero las enumeraciones: una clase que la IA crea con el nombre de una
  // enumeracion (por ejemplo al relacionar Pedido con EstadoPedido) es esa
  // misma enumeracion, no una clase nueva.
  for (const op of operations) {
    if (op.type !== 'addEnum') continue;
    const existing = context.enumByName.get(op.enum.name.toLowerCase());
    if (existing === undefined) {
      context.registerEnum(op.enum.id, op.enum.name);
      enums.push(op);
      continue;
    }
    context.remap.set(op.enum.id, existing);
    const update = context.mergeEnumLiterals(existing, op.enum.literals, enums);
    if (update !== null) enumUpdates.push(update);
  }

  for (const op of operations) {
    if (op.type !== 'addClass') continue;
    const name = op.class.name.toLowerCase();
    const existing = context.classByName.get(name) ?? context.enumByName.get(name);
    if (existing !== undefined) {
      context.remap.set(op.class.id, existing);
      continue;
    }
    context.registerClass(op.class.id, op.class.name);
    classes.push(op);
  }

  const attributes: Op<'addAttribute'>[] = [];
  const members: UmlOperation[] = [];
  const relationships: UmlOperation[] = [];

  for (const op of operations) {
    if (op.type === 'addAttribute') {
      const attribute = context.normalizeAttribute(op);
      if (attribute !== null) attributes.push(attribute);
    } else if (op.type === 'addOperation') {
      const operation = context.normalizeOperation(op);
      if (operation !== null) members.push(operation);
    } else if (op.type === 'addRelationship') {
      const result = context.normalizeRelationship(op);
      if (result?.type === 'addAttribute') attributes.push(result);
      else if (result !== null) relationships.push(result);
    } else if (op.type !== 'addClass' && op.type !== 'addEnum') {
      members.push(op);
    }
  }

  const identifiers = context.missingIdentifiers(classes, attributes, relationships);
  const memberCounts = new Map<string, number>();
  for (const op of [...identifiers, ...attributes, ...members]) {
    if (op.type === 'addAttribute' || op.type === 'addOperation') {
      memberCounts.set(op.classId, (memberCounts.get(op.classId) ?? 0) + 1);
    }
  }
  const placed = layoutNewClassifiers(classes, enums, relationships, model, memberCounts);

  return [...placed, ...enumUpdates, ...identifiers, ...attributes, ...members, ...relationships];
}
