import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { UMLRelationship } from '@uml-forge/uml-core';
import { RelationshipInspector } from './RelationshipInspector';

const relationship: UMLRelationship = {
  id: '90000000-0000-4000-8000-000000000001',
  kind: 'association',
  name: 'tiene',
  sourceId: '90000000-0000-4000-8000-000000000002',
  targetId: '90000000-0000-4000-8000-000000000003',
  sourceEnd: { name: '', multiplicity: '1', navigable: true, role: 'dueno' },
  targetEnd: { name: '', multiplicity: '1', navigable: true, role: 'mascotas' },
};

describe('RelationshipInspector', () => {
  it('edita la cardinalidad del destino conservando el resto del extremo', () => {
    const onApplyOperation = vi.fn();
    render(<RelationshipInspector rel={relationship} onApplyOperation={onApplyOperation} />);

    fireEvent.change(screen.getByLabelText('Cardinalidad Destino'), {
      target: { value: '0..*' },
    });

    expect(onApplyOperation).toHaveBeenCalledWith({
      type: 'updateRelationship',
      id: relationship.id,
      changes: {
        targetEnd: { name: '', multiplicity: '0..*', navigable: true, role: 'mascotas' },
      },
    });
  });

  it('no toca el modelo mientras la cardinalidad esta a medio escribir', () => {
    const onApplyOperation = vi.fn();
    render(<RelationshipInspector rel={relationship} onApplyOperation={onApplyOperation} />);

    fireEvent.change(screen.getByLabelText('Cardinalidad Origen'), { target: { value: '0..' } });

    expect(onApplyOperation).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Cardinalidad Origen')).toHaveAttribute('aria-invalid', 'true');
  });

  it('aplica una cardinalidad habitual de un clic', () => {
    const onApplyOperation = vi.fn();
    render(<RelationshipInspector rel={relationship} onApplyOperation={onApplyOperation} />);

    const [sourcePreset] = screen.getAllByRole('button', { name: '1..*' });
    fireEvent.click(sourcePreset!);

    expect(onApplyOperation).toHaveBeenCalledWith({
      type: 'updateRelationship',
      id: relationship.id,
      changes: {
        sourceEnd: { name: '', multiplicity: '1..*', navigable: true, role: 'dueno' },
      },
    });
  });

  it('edita el rol del extremo', () => {
    const onApplyOperation = vi.fn();
    render(<RelationshipInspector rel={relationship} onApplyOperation={onApplyOperation} />);

    fireEvent.change(screen.getByLabelText('Rol Destino'), { target: { value: 'animales' } });

    expect(onApplyOperation).toHaveBeenCalledWith({
      type: 'updateRelationship',
      id: relationship.id,
      changes: {
        targetEnd: { name: '', multiplicity: '1', navigable: true, role: 'animales' },
      },
    });
  });
});
