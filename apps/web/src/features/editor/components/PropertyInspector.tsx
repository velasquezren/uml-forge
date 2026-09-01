import type { UMLClass, UMLRelationship, UmlOperationInput } from '@uml-forge/uml-core';
import { ClassifierInspector } from './ClassifierInspector';
import { RelationshipInspector } from './RelationshipInspector';
import type { SelectedElement } from '../types';

interface PropertyInspectorProps {
  selectedElement: SelectedElement | null;
  onApplyOperation: (op: UmlOperationInput) => void;
}

export function PropertyInspector({ selectedElement, onApplyOperation }: PropertyInspectorProps) {
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
