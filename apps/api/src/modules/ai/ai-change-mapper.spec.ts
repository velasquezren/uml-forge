import { describe, expect, it } from 'vitest';
import { applyOperations, createEmptyModel, type UMLModel } from '@uml-forge/uml-core';
import { summarizeOperations } from '../chat/chat-proposal';
import { mapAiOperationsToUmlOperations } from './ai-operation-mapper';
import { normalizeAiOperations } from './ai-operation-normalizer';
import { isNetworkError } from './providers/gemini-errors';

const BASE = '10000000-0000-4000-8000-000000000001';
const USER = '10000000-0000-4000-8000-000000000002';
const ADMIN = '10000000-0000-4000-8000-000000000003';
const IDENT = '10000000-0000-4000-8000-000000000004';
const STATE = '10000000-0000-4000-8000-000000000005';

/**
 * El caso que llego del chat: EntidadBase, Usuario, Administrador, la interfaz
 * Identificable y la enumeracion Estado646, con la primera propuesta ya
 * aplicada (id, estado y las dos herencias).
 */
function chatModel(): UMLModel {
  const result = applyOperations(createEmptyModel('Usuarios'), [
    { type: 'addClass', class: { id: BASE, name: 'EntidadBase', isAbstract: true } },
    { type: 'addClass', class: { id: USER, name: 'Usuario' } },
    { type: 'addClass', class: { id: ADMIN, name: 'Administrador' } },
    { type: 'addClass', class: { id: IDENT, name: 'Identificable', isInterface: true } },
    { type: 'addEnum', enum: { id: STATE, name: 'Estado646', literals: ['ACTIVO', 'INACTIVO'] } },
    {
      type: 'addAttribute',
      classId: BASE,
      attribute: {
        id: '20000000-0000-4000-8000-000000000001',
        name: 'id',
        type: 'Long',
        isIdentifier: true,
      },
    },
    {
      type: 'addAttribute',
      classId: USER,
      attribute: { id: '20000000-0000-4000-8000-000000000002', name: 'estado', type: STATE },
    },
    {
      type: 'addAttribute',
      classId: USER,
      attribute: { id: '20000000-0000-4000-8000-000000000003', name: 'correo', type: 'String' },
    },
    {
      type: 'addRelationship',
      relationship: {
        id: '30000000-0000-4000-8000-000000000001',
        kind: 'generalization',
        sourceId: USER,
        targetId: BASE,
      },
    },
    {
      type: 'addRelationship',
      relationship: {
        id: '30000000-0000-4000-8000-000000000002',
        kind: 'generalization',
        sourceId: ADMIN,
        targetId: USER,
      },
    },
  ]);
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
}

/** Aplica la propuesta entera; falla la prueba si alguna operacion no entra. */
function applyAll(model: UMLModel, raw: unknown): UMLModel {
  const result = applyOperations(model, mapAiOperationsToUmlOperations(raw, model));
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
}

describe('propuesta repetida sobre un modelo que ya cambio', () => {
  it('solo deja lo que falta: ni atributos ni herencias duplicados', () => {
    const model = chatModel();
    const secondProposal = {
      classes: [
        { name: 'EntidadBase', attributes: [{ name: 'id', type: 'UUID', isIdentifier: true }] },
        { name: 'Usuario', attributes: [{ name: 'estado', type: 'Estado646' }] },
      ],
      enums: [],
      relationships: [
        { source: 'Usuario', target: 'EntidadBase', kind: 'generalization' },
        { source: 'EntidadBase', target: 'Identificable', kind: 'realization' },
        { source: 'Administrador', target: 'Usuario', kind: 'generalization' },
      ],
    };
    const operations = mapAiOperationsToUmlOperations(secondProposal, model);
    expect(operations.map((op) => op.type)).toEqual(['addRelationship']);
  });

  it('al aplicar se vuelve a normalizar: lo que ya entro se descarta', () => {
    const model = chatModel();
    const proposal = mapAiOperationsToUmlOperations(
      { changes: [{ action: 'delete', element: 'class', className: 'Administrador' }] },
      model,
    );
    const applied = applyOperations(model, proposal);
    if (!applied.ok) throw new Error(applied.error.message);
    expect(normalizeAiOperations(proposal, applied.value)).toEqual([]);
  });
});

describe('cambios de la IA sobre lo que ya existe', () => {
  it('renombra, cambia tipos, elimina clases y relaciones', () => {
    const result = applyAll(chatModel(), {
      changes: [
        { action: 'rename', element: 'class', className: 'usuario', newName: 'Cliente' },
        {
          action: 'update',
          element: 'attribute',
          className: 'EntidadBase',
          memberName: 'id',
          type: 'UUID',
        },
        {
          action: 'rename',
          element: 'attribute',
          className: 'Usuario',
          memberName: 'correo',
          newName: 'email',
        },
        { action: 'delete', element: 'class', className: 'Administrador' },
        { action: 'rename', element: 'enum', className: 'Estado646', newName: 'EstadoUsuario' },
        { action: 'delete', element: 'relationship', className: 'EntidadBase', target: 'Usuario' },
        { action: 'delete', element: 'class', className: 'NoExiste' },
      ],
    });

    expect(result.classes.map((c) => c.name)).toEqual(['EntidadBase', 'Cliente', 'Identificable']);
    expect(result.classes[0]?.attributes[0]?.type).toBe('UUID');
    expect(result.classes[1]?.attributes.map((a) => a.name)).toEqual(['estado', 'email']);
    expect(result.enums[0]?.name).toBe('EstadoUsuario');
    expect(result.relationships).toEqual([]);
  });

  it('lo que se anade a una clase renombrada va a esa clase, no a una nueva', () => {
    const result = applyAll(chatModel(), {
      changes: [{ action: 'rename', element: 'class', className: 'Usuario', newName: 'Cliente' }],
      classes: [{ name: 'Cliente', attributes: [{ name: 'telefono', type: 'String' }] }],
    });
    expect(result.classes.filter((c) => c.name === 'Cliente')).toHaveLength(1);
    expect(result.classes.find((c) => c.id === USER)?.attributes.map((a) => a.name)).toContain(
      'telefono',
    );
  });

  it('tras renombrar una clase acepta tanto su nombre nuevo como el viejo', () => {
    const model = chatModel();
    const withAddress = applyOperations(model, [
      {
        type: 'addClass',
        class: { id: '10000000-0000-4000-8000-000000000006', name: 'Direccion' },
      },
      {
        type: 'addRelationship',
        relationship: {
          id: '30000000-0000-4000-8000-000000000003',
          kind: 'association',
          sourceId: USER,
          targetId: '10000000-0000-4000-8000-000000000006',
        },
      },
    ]);
    if (!withAddress.ok) throw new Error(withAddress.error.message);
    const result = applyAll(withAddress.value, {
      changes: [
        { action: 'rename', element: 'class', className: 'Usuario', newName: 'Cliente' },
        {
          action: 'rename',
          element: 'attribute',
          className: 'Cliente',
          memberName: 'correo',
          newName: 'email',
        },
        {
          action: 'update',
          element: 'attribute',
          className: 'Usuario',
          memberName: 'email',
          isUnique: true,
        },
        { action: 'delete', element: 'relationship', className: 'Cliente', target: 'Direccion' },
      ],
    });
    const client = result.classes.find((c) => c.id === USER);
    expect(client?.name).toBe('Cliente');
    expect(client?.attributes.find((a) => a.name === 'email')?.isUnique).toBe(true);
    expect(result.relationships.some((r) => r.kind === 'association')).toBe(false);
  });

  it('cambia el tipo de una relacion y hace abstracta una clase', () => {
    const result = applyAll(chatModel(), {
      changes: [
        { action: 'update', element: 'class', className: 'Usuario', isAbstract: true },
        {
          action: 'update',
          element: 'relationship',
          className: 'Usuario',
          target: 'EntidadBase',
          newKind: 'dependency',
        },
      ],
    });
    expect(result.classes.find((c) => c.id === USER)?.isAbstract).toBe(true);
    expect(result.relationships.find((r) => r.sourceId === USER)?.kind).toBe('dependency');
  });

  it('resume cada cambio con el nombre que el elemento tiene ahora', () => {
    const model = chatModel();
    const operations = mapAiOperationsToUmlOperations(
      {
        changes: [
          { action: 'rename', element: 'class', className: 'Usuario', newName: 'Cliente' },
          {
            action: 'update',
            element: 'attribute',
            className: 'EntidadBase',
            memberName: 'id',
            type: 'UUID',
          },
          { action: 'delete', element: 'attribute', className: 'Usuario', memberName: 'correo' },
          {
            action: 'delete',
            element: 'relationship',
            className: 'Administrador',
            target: 'Usuario',
          },
        ],
      },
      model,
    );
    expect(summarizeOperations(operations, model)).toEqual([
      'Clase Usuario: renombrar a Cliente',
      'EntidadBase.id: tipo UUID',
      'Usuario: - correo',
      'Eliminar la relacion generalization Administrador -> Usuario',
    ]);
  });
});

describe('fallos de red al llamar a Gemini', () => {
  it('reconoce "fetch failed" y los cortes de conexion, no los errores de la API', () => {
    expect(isNetworkError(new TypeError('fetch failed'))).toBe(true);
    expect(isNetworkError(new Error('request failed', { cause: { code: 'ECONNRESET' } }))).toBe(
      true,
    );
    expect(isNetworkError(new Error('Clave invalida'))).toBe(false);
  });
});
