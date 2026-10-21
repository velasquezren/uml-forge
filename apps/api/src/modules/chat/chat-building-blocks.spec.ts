import { describe, expect, it, vi } from 'vitest';
import * as Y from 'yjs';
import {
  createEmptyModel,
  fromYDoc,
  readRevision,
  writeModel,
  type UmlOperation,
} from '@uml-forge/uml-core';
import { applyOperationsToDoc, participantNames } from '../collab/live-document';
import { readStoredProposal, summarizeOperations } from './chat-proposal';
import { parseChatBusEvent } from './events/chat-event-bus';
import { InMemoryChatEventBus } from './events/in-memory-chat-event-bus';

const CLASS_ID = '11111111-1111-4111-8111-111111111111';
const ATTR_ID = '22222222-2222-4222-8222-222222222222';

const operations: UmlOperation[] = [
  {
    type: 'addClass',
    class: {
      id: CLASS_ID,
      name: 'Factura',
      isAbstract: false,
      isInterface: false,
      stereotypes: [],
      position: { x: 0, y: 0 },
    },
  },
  {
    type: 'addAttribute',
    classId: CLASS_ID,
    attribute: {
      id: ATTR_ID,
      name: 'total',
      type: 'BigDecimal',
      visibility: 'private',
      multiplicity: '1',
      isStatic: false,
      isDerived: false,
      isUnique: false,
      isNullable: false,
      isIdentifier: false,
      defaultValue: null,
    },
  },
];

describe('bus de eventos del chat', () => {
  it('reparte los eventos y permite darse de baja', async () => {
    const bus = new InMemoryChatEventBus();
    const listener = vi.fn();
    const unsubscribe = bus.subscribe(listener);
    await bus.publish({ type: 'message', projectId: 'p', messageId: 'm' });
    unsubscribe();
    await bus.publish({ type: 'message', projectId: 'p', messageId: 'm2' });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('solo acepta eventos bien formados llegados por la red', () => {
    expect(parseChatBusEvent('{"type":"message","projectId":"p","messageId":"m"}')).toEqual({
      type: 'message',
      projectId: 'p',
      messageId: 'm',
    });
    expect(parseChatBusEvent('{"type":"assistant","projectId":"p","state":"thinking"}')).toEqual({
      type: 'assistant',
      projectId: 'p',
      state: 'thinking',
      askedBy: null,
    });
    expect(parseChatBusEvent('{"type":"otro","projectId":"p"}')).toBeNull();
    expect(parseChatBusEvent('no es json')).toBeNull();
  });
});

describe('propuestas de la IA', () => {
  it('resume cada cambio con nombres legibles', () => {
    expect(summarizeOperations(operations, null)).toEqual([
      'Nueva clase Factura',
      'Factura: + total (BigDecimal)',
    ]);
  });

  it('valida la propuesta guardada antes de aplicarla', () => {
    const stored = { explanation: 'x', operations, summary: ['a'] };
    expect(readStoredProposal(stored)?.operations).toHaveLength(2);
    expect(
      readStoredProposal({ explanation: 'x', operations: [{ type: 'borrarTodo' }] }),
    ).toBeNull();
  });
});

describe('aplicacion en el documento compartido', () => {
  it('aplica las operaciones, cuenta las rechazadas y sube la revision', () => {
    const doc = new Y.Doc();
    writeModel(doc, createEmptyModel('Tienda'));
    const broken: UmlOperation = {
      type: 'deleteClass',
      id: '33333333-3333-4333-8333-333333333333',
    };

    const report = applyOperationsToDoc(doc, [...operations, broken], 'Tienda', CLASS_ID);
    expect(report.applied).toBe(2);
    expect(report.failed).toBe(1);
    expect(readRevision(doc)).toBe(1);
    const model = fromYDoc(doc);
    expect(model.ok && model.value.classes[0]?.name).toBe('Factura');
  });

  it('crea el modelo si el proyecto aun no tenia ninguno', () => {
    const doc = new Y.Doc();
    const report = applyOperationsToDoc(
      doc,
      operations,
      'Proyecto nuevo',
      '44444444-4444-4444-8444-444444444444',
    );
    expect(report.applied).toBe(2);
    const model = fromYDoc(doc);
    expect(model.ok && model.value.name).toBe('Proyecto nuevo');
  });

  it('lee los nombres de quien esta conectado sin repetirlos', () => {
    const states = [
      { user: { name: 'Ana' } },
      { user: { name: 'Ana' } },
      { user: { name: 'Luis' } },
      { cursor: { x: 1 } },
    ];
    expect(participantNames(states)).toEqual(['Ana', 'Luis']);
  });
});
