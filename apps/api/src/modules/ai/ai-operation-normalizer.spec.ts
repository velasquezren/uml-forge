import { describe, expect, it } from 'vitest';
import { applyOperations, createEmptyModel, type UMLModel } from '@uml-forge/uml-core';
import { mapAiOperationsToUmlOperations } from './ai-operation-mapper';

/** Modelo en el lienzo con una clase Cliente (con id y email) y un enum Estado. */
function existingModel(): UMLModel {
  const base = createEmptyModel('Tienda');
  const result = applyOperations(base, [
    {
      type: 'addClass',
      class: {
        id: '11111111-1111-4111-8111-111111111111',
        name: 'Cliente',
        position: { x: 100, y: 100 },
      },
    },
    {
      type: 'addAttribute',
      classId: '11111111-1111-4111-8111-111111111111',
      attribute: {
        id: '22222222-2222-4222-8222-222222222222',
        name: 'id',
        type: 'Long',
        isIdentifier: true,
      },
    },
    {
      type: 'addAttribute',
      classId: '11111111-1111-4111-8111-111111111111',
      attribute: { id: '33333333-3333-4333-8333-333333333333', name: 'email', type: 'String' },
    },
    {
      type: 'addEnum',
      enum: {
        id: '44444444-4444-4444-8444-444444444444',
        name: 'EstadoPedido',
        literals: ['PENDIENTE'],
        position: { x: 500, y: 100 },
      },
    },
  ]);
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
}

/** Respuesta tipica de la IA: repite Cliente y usa nombres de tipo en crudo. */
const aiResponse = {
  explanation: 'Pedidos del cliente',
  classes: [
    {
      name: 'Cliente',
      attributes: [
        { name: 'email', type: 'String' },
        { name: 'telefono', type: 'string' },
      ],
    },
    {
      name: 'Pedido',
      attributes: [
        { name: 'id', type: 'Long', isIdentifier: true },
        { name: 'unidades', type: 'int' },
        { name: 'fecha', type: 'LocalDateTime' },
        { name: 'estado', type: 'EstadoPedido' },
        { name: 'etiquetas', type: 'List<String>' },
      ],
      methods: [{ name: 'total', returnType: 'BigDecimal' }],
    },
  ],
  enums: [{ name: 'EstadoPedido', literals: ['PENDIENTE', 'ENVIADO'] }],
  relationships: [
    { source: 'Cliente', target: 'Pedido', kind: 'association', targetMultiplicity: '0..*' },
    { source: 'Cliente', target: 'Pedido', kind: 'association' },
    { source: 'Pedido', target: 'EstadoPedido', kind: 'association' },
  ],
};

describe('normalizacion de la propuesta de la IA', () => {
  const model = existingModel();
  const operations = mapAiOperationsToUmlOperations(aiResponse, model);

  it('todas las operaciones se aplican sin error sobre el modelo existente', () => {
    const applied = applyOperations(model, operations);
    expect(applied.ok).toBe(true);
  });

  it('reutiliza Cliente en lugar de duplicarlo y no repite sus atributos', () => {
    const applied = applyOperations(model, operations);
    if (!applied.ok) return;

    const clientes = applied.value.classes.filter((c) => c.name === 'Cliente');
    expect(clientes).toHaveLength(1);
    expect(clientes[0]?.attributes.map((a) => a.name)).toEqual(['id', 'email', 'telefono']);
  });

  it('traduce los tipos a primitivos o a la enumeracion existente', () => {
    const applied = applyOperations(model, operations);
    if (!applied.ok) return;

    const pedido = applied.value.classes.find((c) => c.name === 'Pedido');
    const types = Object.fromEntries(pedido?.attributes.map((a) => [a.name, a.type]) ?? []);
    expect(types.unidades).toBe('Integer');
    expect(types.fecha).toBe('DateTime');
    expect(types.estado).toBe('44444444-4444-4444-8444-444444444444');
    expect(pedido?.attributes.find((a) => a.name === 'etiquetas')?.multiplicity).toBe('0..*');
  });

  it('amplia la enumeracion existente en vez de crear otra', () => {
    const applied = applyOperations(model, operations);
    if (!applied.ok) return;

    expect(applied.value.enums).toHaveLength(1);
    expect(applied.value.enums[0]?.literals).toEqual(['PENDIENTE', 'ENVIADO']);
  });

  it('no duplica relaciones y no relaciona clases con enumeraciones', () => {
    const applied = applyOperations(model, operations);
    if (!applied.ok) return;

    expect(applied.value.relationships).toHaveLength(1);
    // El atributo `estado` ya cubria la relacion con EstadoPedido.
    const pedido = applied.value.classes.find((c) => c.name === 'Pedido');
    expect(pedido?.attributes.filter((a) => a.type === applied.value.enums[0]?.id)).toHaveLength(1);
  });

  it('coloca lo nuevo debajo del diagrama existente', () => {
    const applied = applyOperations(model, operations);
    if (!applied.ok) return;

    const pedido = applied.value.classes.find((c) => c.name === 'Pedido');
    expect(pedido?.position.y).toBeGreaterThan(200);
  });
});

describe('identificadores de las clases nuevas', () => {
  it('anade id a la clase concreta y no a la subclase ni a la interfaz', () => {
    const operations = mapAiOperationsToUmlOperations({
      classes: [
        { name: 'Persona', attributes: [{ name: 'nombre', type: 'String' }] },
        { name: 'Empleado', attributes: [{ name: 'sueldo', type: 'decimal' }] },
        { name: 'Pagable', isInterface: true, methods: [{ name: 'pagar' }] },
      ],
      relationships: [{ source: 'Empleado', target: 'Persona', kind: 'generalization' }],
    });

    const applied = applyOperations(createEmptyModel('Rrhh'), operations);
    expect(applied.ok).toBe(true);
    if (!applied.ok) return;

    const byName = new Map(applied.value.classes.map((c) => [c.name, c]));
    expect(byName.get('Persona')?.attributes.some((a) => a.isIdentifier)).toBe(true);
    expect(byName.get('Empleado')?.attributes.some((a) => a.isIdentifier)).toBe(false);
    expect(byName.get('Pagable')?.attributes).toEqual([]);

    // La superclase queda por encima de la subclase.
    expect(byName.get('Persona')?.position.y).toBeLessThan(byName.get('Empleado')?.position.y ?? 0);
  });
});
