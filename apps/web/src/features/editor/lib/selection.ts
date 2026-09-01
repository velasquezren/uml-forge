import type { UMLClass, UMLModel } from '@uml-forge/uml-core';
import type { SelectedElement } from '../types';

/**
 * Vuelve a leer del modelo el elemento seleccionado.
 *
 * La seleccion se guarda como una referencia, no como una copia: si el
 * inspector trabajase sobre el objeto capturado en el momento del clic, cada
 * edicion propia o remota lo dejaria obsoleto y los campos del panel dejarian
 * de reflejar el modelo. Devuelve null si el elemento ya no existe, que es
 * justo lo que ocurre cuando otro participante lo borra.
 */
export function resolveSelection(
  model: UMLModel | null,
  selected: SelectedElement | null,
): SelectedElement | null {
  if (model === null || selected === null) {
    return null;
  }

  if (selected.type === 'relationship') {
    const relationship = model.relationships.find((rel) => rel.id === selected.id);
    return relationship === undefined ? null : { ...selected, element: relationship };
  }

  if (selected.type === 'classifier') {
    const umlClass = model.classes.find((cls) => cls.id === selected.id);
    if (umlClass !== undefined) {
      return { ...selected, element: umlClass };
    }
    const umlEnum = model.enums.find((enm) => enm.id === selected.id);
    return umlEnum === undefined ? null : { ...selected, element: umlEnum };
  }

  // Atributos y operaciones se localizan dentro de su clase contenedora.
  const owner = model.classes.find((cls: UMLClass) =>
    selected.type === 'attribute'
      ? cls.attributes.some((attribute) => attribute.id === selected.id)
      : cls.operations.some((operation) => operation.id === selected.id),
  );
  if (owner === undefined) {
    return null;
  }

  const member =
    selected.type === 'attribute'
      ? owner.attributes.find((attribute) => attribute.id === selected.id)
      : owner.operations.find((operation) => operation.id === selected.id);

  return member === undefined ? null : { ...selected, parentId: owner.id, element: member };
}
