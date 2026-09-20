import { umlError, type UmlError } from '../../errors.js';
import { collectElementIds } from '../../model/lookup.js';
import type { UMLModel } from '../../schemas/model.js';

/** Detecta identificadores repetidos y nombres repetidos donde no se admiten. */
export function checkDuplicates(model: UMLModel): UmlError[] {
  return [...duplicateIds(model), ...duplicateTypeNames(model), ...duplicateMembers(model)];
}

function duplicateIds(model: UMLModel): UmlError[] {
  const seen = new Set<string>();
  const reported = new Set<string>();
  const errors: UmlError[] = [];
  for (const id of collectElementIds(model)) {
    if (seen.has(id) && !reported.has(id)) {
      reported.add(id);
      errors.push(
        umlError('duplicate_id', `el identificador ${id} se usa en mas de un elemento`, {
          elementId: id,
        }),
      );
    }
    seen.add(id);
  }
  return errors;
}

function duplicateTypeNames(model: UMLModel): UmlError[] {
  const errors: UmlError[] = [];
  const named = [
    ...model.classes.map((umlClass) => ({ id: umlClass.id, name: umlClass.name, kind: 'clase' })),
    ...model.enums.map((umlEnum) => ({ id: umlEnum.id, name: umlEnum.name, kind: 'enumeracion' })),
  ];
  const seen = new Map<string, string>();
  for (const element of named) {
    const key = element.name.trim().toLowerCase();
    const previous = seen.get(key);
    if (previous === undefined) {
      seen.set(key, element.id);
      continue;
    }
    errors.push(
      umlError('duplicate_name', `el nombre ${element.name} se usa en mas de una ${element.kind}`, {
        elementId: element.id,
      }),
    );
  }
  return errors;
}

function duplicateMembers(model: UMLModel): UmlError[] {
  const errors: UmlError[] = [];
  for (const umlClass of model.classes) {
    errors.push(
      ...findRepeated(
        umlClass.attributes.map((attribute) => ({
          id: attribute.id,
          key: attribute.name.trim().toLowerCase(),
        })),
        (id) =>
          umlError('duplicate_name', `atributo repetido en la clase ${umlClass.name}`, {
            elementId: id,
          }),
      ),
    );
    errors.push(
      ...findRepeated(
        umlClass.operations.map((operation) => ({
          id: operation.id,
          key: `${operation.name.trim().toLowerCase()}(${operation.parameters.map((p) => p.type).join(',')})`,
        })),
        (id) =>
          umlError('duplicate_name', `operacion repetida en la clase ${umlClass.name}`, {
            elementId: id,
          }),
      ),
    );
  }
  for (const umlEnum of model.enums) {
    errors.push(
      ...findRepeated(
        umlEnum.literals.map((literal) => ({ id: umlEnum.id, key: literal.trim().toLowerCase() })),
        (id) =>
          umlError('duplicate_name', `literal repetido en la enumeracion ${umlEnum.name}`, {
            elementId: id,
          }),
      ),
    );
  }
  return errors;
}

function findRepeated(
  entries: readonly { id: string; key: string }[],
  toError: (id: string) => UmlError,
): UmlError[] {
  const seen = new Set<string>();
  const errors: UmlError[] = [];
  for (const entry of entries) {
    if (seen.has(entry.key)) {
      errors.push(toError(entry.id));
    }
    seen.add(entry.key);
  }
  return errors;
}
