import { describe, expect, it } from 'vitest';
import { Position, type InternalNode, type Node } from '@xyflow/react';
import type { UMLModel } from '@uml-forge/uml-core';
import { getEdgeAnchors } from './floatingEdge';
import { resolveSelection } from './selection';
import { EDGE_STYLE_BY_KIND, RELATIONSHIP_KINDS } from './edgeStyles';

/** Nodo medido minimo, con lo justo que consulta el calculo de anclajes. */
function fakeNode(id: string, x: number, y: number, width = 200, height = 100) {
  return {
    id,
    measured: { width, height },
    internals: { positionAbsolute: { x, y } },
  } as unknown as InternalNode<Node>;
}

describe('getEdgeAnchors', () => {
  it('ancla la arista en los lados que se miran cuando los nodos estan en horizontal', () => {
    // A ocupa de x=0 a x=200; B empieza en x=500. Se miran por derecha e izquierda.
    const anchors = getEdgeAnchors(fakeNode('a', 0, 0), fakeNode('b', 500, 0));

    expect(anchors).not.toBeNull();
    expect(anchors?.sourcePosition).toBe(Position.Right);
    expect(anchors?.targetPosition).toBe(Position.Left);
    expect(anchors?.sourceX).toBeCloseTo(200);
    expect(anchors?.targetX).toBeCloseTo(500);
  });

  it('ancla por arriba y por abajo cuando los nodos estan en vertical', () => {
    const anchors = getEdgeAnchors(fakeNode('a', 0, 0), fakeNode('b', 0, 400));

    expect(anchors?.sourcePosition).toBe(Position.Bottom);
    expect(anchors?.targetPosition).toBe(Position.Top);
    expect(anchors?.sourceY).toBeCloseTo(100);
    expect(anchors?.targetY).toBeCloseTo(400);
  });

  it('devuelve null mientras React Flow no conoce alguno de los extremos', () => {
    expect(getEdgeAnchors(undefined, fakeNode('b', 0, 0))).toBeNull();
    expect(getEdgeAnchors(fakeNode('a', 0, 0), undefined)).toBeNull();
  });

  it('no divide por cero cuando los dos nodos comparten centro', () => {
    const anchors = getEdgeAnchors(fakeNode('a', 0, 0), fakeNode('b', 0, 0));
    expect(Number.isFinite(anchors?.sourceX)).toBe(true);
    expect(Number.isFinite(anchors?.targetY)).toBe(true);
  });
});

describe('EDGE_STYLE_BY_KIND', () => {
  it('distingue visualmente las seis clases de relacion', () => {
    for (const kind of RELATIONSHIP_KINDS) {
      expect(EDGE_STYLE_BY_KIND[kind]).toBeDefined();
    }
    expect(EDGE_STYLE_BY_KIND.generalization.markerEnd).toContain('generalization');
    expect(EDGE_STYLE_BY_KIND.realization.strokeDasharray).toBeDefined();
    expect(EDGE_STYLE_BY_KIND.composition.markerStart).toContain('composition');
    expect(EDGE_STYLE_BY_KIND.aggregation.markerStart).toContain('aggregation');
    expect(EDGE_STYLE_BY_KIND.dependency.strokeDasharray).toBeDefined();
    // La asociacion decide su punta segun la navegabilidad, no de forma fija
    expect(EDGE_STYLE_BY_KIND.association.markerEnd).toBeUndefined();
  });
});

describe('resolveSelection', () => {
  const model: UMLModel = {
    id: '10000000-0000-0000-0000-000000000001',
    name: 'Modelo',
    createdAt: '2026-08-30T00:00:00.000Z',
    updatedAt: '2026-08-30T00:00:00.000Z',
    classes: [
      {
        id: 'cls-1',
        name: 'ClienteRenombrado',
        isAbstract: false,
        isInterface: false,
        stereotypes: [],
        position: { x: 0, y: 0 },
        attributes: [
          {
            id: 'attr-1',
            name: 'email',
            type: 'String',
            visibility: 'private',
            multiplicity: '1',
            isStatic: false,
            isDerived: false,
            isUnique: false,
            isNullable: true,
            isIdentifier: false,
            defaultValue: null,
          },
        ],
        operations: [],
      },
    ],
    enums: [{ id: 'enm-1', name: 'Estado', literals: ['A'], position: { x: 10, y: 20 } }],
    relationships: [
      {
        id: 'rel-1',
        kind: 'composition',
        name: 'contiene',
        sourceId: 'cls-1',
        targetId: 'cls-1',
        sourceEnd: { name: '', role: '', multiplicity: '1', navigable: true },
        targetEnd: { name: '', role: '', multiplicity: '1', navigable: true },
      },
    ],
  };

  it('devuelve la version viva del elemento, no la capturada al seleccionarlo', () => {
    const stale = {
      type: 'classifier' as const,
      id: 'cls-1',
      element: { ...model.classes[0]!, name: 'NombreAntiguo' },
    };

    expect(resolveSelection(model, stale)?.element).toHaveProperty('name', 'ClienteRenombrado');
  });

  it('resuelve enumeraciones, relaciones y miembros de una clase', () => {
    const enumSelection = { type: 'classifier' as const, id: 'enm-1', element: model.enums[0]! };
    expect(resolveSelection(model, enumSelection)?.element).toHaveProperty('name', 'Estado');

    const relSelection = {
      type: 'relationship' as const,
      id: 'rel-1',
      element: model.relationships[0]!,
    };
    expect(resolveSelection(model, relSelection)?.element).toHaveProperty('kind', 'composition');

    const attrSelection = {
      type: 'attribute' as const,
      id: 'attr-1',
      element: model.classes[0]!.attributes[0]!,
    };
    const resolvedAttribute = resolveSelection(model, attrSelection);
    expect(resolvedAttribute?.parentId).toBe('cls-1');
    expect(resolvedAttribute?.element).toHaveProperty('name', 'email');
  });

  it('devuelve null si el elemento ya no existe o no hay modelo todavia', () => {
    const missing = { type: 'classifier' as const, id: 'no-existe', element: model.classes[0]! };
    expect(resolveSelection(model, missing)).toBeNull();
    expect(resolveSelection(null, missing)).toBeNull();
    expect(resolveSelection(model, null)).toBeNull();
  });
});
