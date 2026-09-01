import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReactFlowProvider } from '@xyflow/react';
import { UmlClassNode } from './UmlClassNode';
import { Palette } from './Palette';
import { PropertyInspector } from './PropertyInspector';

describe('Editor Components', () => {
  describe('UmlClassNode', () => {
    it('renderiza nombre, estereotipos, atributos y metodos con sus visibilidades', () => {
      render(
        <ReactFlowProvider>
          <UmlClassNode
            id="cls-1"
            type="umlClass"
            selected={false}
            zIndex={1}
            isConnectable={true}
            positionAbsoluteX={0}
            positionAbsoluteY={0}
            dragging={false}
            selectable={true}
            deletable={true}
            draggable={true}
            data={{
              classifierId: 'cls-1',
              name: 'Cliente',
              isAbstract: true,
              isInterface: false,
              stereotypes: ['entity'],
              attributes: [
                {
                  id: 'attr-1',
                  name: 'email',
                  type: 'String',
                  visibility: 'private',
                  multiplicity: '1',
                  isStatic: false,
                  isDerived: false,
                  isUnique: true,
                  isNullable: false,
                  isIdentifier: false,
                  defaultValue: null,
                },
              ],
              operations: [
                {
                  id: 'op-1',
                  name: 'autenticar',
                  returnType: 'boolean',
                  visibility: 'public',
                  isAbstract: false,
                  isStatic: false,
                  parameters: [],
                },
              ],
            }}
          />
        </ReactFlowProvider>,
      );

      expect(screen.getByText('Cliente')).toBeInTheDocument();
      expect(screen.getByText('«entity»')).toBeInTheDocument();
      expect(screen.getByText('email')).toBeInTheDocument();
      expect(screen.getByText('autenticar')).toBeInTheDocument();
    });
  });

  describe('Palette', () => {
    it('emite operacion addClass al hacer clic en Nueva Clase', () => {
      const applyOp = vi.fn();
      render(<Palette onApplyOperation={applyOp} />);

      const btn = screen.getByRole('button', { name: /\+ Nueva Clase/i });
      fireEvent.click(btn);

      expect(applyOp).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'addClass',
        }),
      );
    });
  });

  describe('PropertyInspector', () => {
    it('permite cambiar el nombre de una clase y emite updateClass', () => {
      const applyOp = vi.fn();
      render(
        <PropertyInspector
          selectedElement={{
            type: 'classifier',
            id: 'cls-1',
            element: {
              id: 'cls-1',
              name: 'Veterinario',
              isAbstract: false,
              isInterface: false,
              stereotypes: [],
              position: { x: 0, y: 0 },
              attributes: [],
              operations: [],
            },
          }}
          onApplyOperation={applyOp}
        />,
      );

      const input = screen.getByDisplayValue('Veterinario');
      fireEvent.change(input, { target: { value: 'MedicoVeterinario' } });

      expect(applyOp).toHaveBeenCalledWith({
        type: 'updateClass',
        id: 'cls-1',
        changes: { name: 'MedicoVeterinario' },
      });
    });
  });
});
