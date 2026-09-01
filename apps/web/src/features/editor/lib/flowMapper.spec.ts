import { describe, expect, it } from 'vitest';
import type { UMLModel } from '@uml-forge/uml-core';
import { modelToNodes, modelToEdges } from './flowMapper';

describe('flowMapper', () => {
  const sampleModel: UMLModel = {
    id: 'mod-1',
    name: 'Clinica Veterinaria',
    createdAt: '2026-08-30T00:00:00Z',
    updatedAt: '2026-08-30T00:00:00Z',
    classes: [
      {
        id: 'cls-1',
        name: 'Animal',
        isAbstract: true,
        isInterface: false,
        stereotypes: ['entity'],
        position: { x: 150, y: 200 },
        attributes: [
          {
            id: 'attr-1',
            name: 'nombre',
            type: 'String',
            visibility: 'protected',
            multiplicity: '1',
            isStatic: false,
            isDerived: false,
            isUnique: false,
            isNullable: false,
            isIdentifier: false,
            defaultValue: null,
          },
        ],
        operations: [
          {
            id: 'op-1',
            name: 'hacerSonido',
            returnType: null,
            visibility: 'public',
            isAbstract: true,
            isStatic: false,
            parameters: [],
          },
        ],
      },
      {
        id: 'cls-2',
        name: 'Perro',
        isAbstract: false,
        isInterface: false,
        stereotypes: [],
        position: { x: 150, y: 400 },
        attributes: [],
        operations: [],
      },
    ],
    enums: [
      {
        id: 'enm-1',
        name: 'EstadoCita',
        literals: ['PENDIENTE', 'CONFIRMADA', 'CANCELADA'],
        position: { x: 520, y: 300 },
      },
    ],
    relationships: [
      {
        id: 'rel-1',
        kind: 'generalization',
        name: '',
        sourceId: 'cls-2',
        targetId: 'cls-1',
        sourceEnd: { name: '', role: '', multiplicity: '1', navigable: true },
        targetEnd: { name: '', role: '', multiplicity: '1', navigable: true },
      },
    ],
  };

  it('transforma clases y enumeraciones a nodos de React Flow', () => {
    const nodes = modelToNodes(sampleModel);
    expect(nodes).toHaveLength(3); // 2 clases + 1 enum

    const animalNode = nodes.find((n) => n.id === 'cls-1');
    expect(animalNode).toBeDefined();
    expect(animalNode?.data.name).toBe('Animal');
    expect(animalNode?.data.isAbstract).toBe(true);
    expect(animalNode?.position).toEqual({ x: 150, y: 200 });

    const enumNode = nodes.find((n) => n.id === 'enm-1');
    expect(enumNode).toBeDefined();
    expect(enumNode?.data.isEnum).toBe(true);
    // La enumeracion conserva su posicion del modelo, no una calculada al vuelo
    expect(enumNode?.position).toEqual({ x: 520, y: 300 });
  });

  it('transforma relaciones del metamodelo a aristas de React Flow', () => {
    const edges = modelToEdges(sampleModel);
    expect(edges).toHaveLength(1);
    expect(edges[0]?.source).toBe('cls-2');
    expect(edges[0]?.target).toBe('cls-1');
    expect(edges[0]?.data?.type).toBe('generalization');
  });
});
