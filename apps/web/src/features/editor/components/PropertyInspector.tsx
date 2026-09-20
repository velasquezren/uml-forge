import type { UMLClass, UMLModel, UMLRelationship, UmlOperationInput } from '@uml-forge/uml-core';
import { ClassifierInspector } from './ClassifierInspector';
import { RelationshipInspector } from './RelationshipInspector';
import type { SelectedElement } from '../types';

interface PropertyInspectorProps {
  selectedElement: SelectedElement | null;
  onApplyOperation: (op: UmlOperationInput) => void;
  model?: UMLModel;
  typeNames?: Record<string, string>;
}

export function PropertyInspector({
  selectedElement,
  onApplyOperation,
  model,
  typeNames: explicitTypeNames,
}: PropertyInspectorProps) {
  const typeNames: Record<string, string> = explicitTypeNames ?? {};
  if (!explicitTypeNames && model) {
    for (const c of model.classes) typeNames[c.id] = c.name;
    for (const e of model.enums) typeNames[e.id] = e.name;
  }

  if (!selectedElement) {
    return (
      <div className="text-xs text-muted-foreground p-3 text-center">
        Selecciona una clase o relacion en el lienzo para ver y editar sus propiedades.
      </div>
    );
  }

  if (selectedElement.type === 'classifier') {
    return (
      <ClassifierInspector
        cls={selectedElement.element as UMLClass}
        onApplyOperation={onApplyOperation}
        typeNames={typeNames}
      />
    );
  }

  if (selectedElement.type === 'relationship') {
    return (
      <RelationshipInspector
        rel={selectedElement.element as UMLRelationship}
        onApplyOperation={onApplyOperation}
      />
    );
  }

  return null;
}
