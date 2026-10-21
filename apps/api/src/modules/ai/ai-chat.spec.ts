import { describe, expect, it } from 'vitest';
import { applyOperations, createEmptyModel } from '@uml-forge/uml-core';
import { CHAT_HISTORY_LIMIT, formatChatRequest } from './ai-chat-prompt';
import { parseChatReply } from './ai-chat-reply';

describe('respuesta de la IA en el chat', () => {
  it('separa la respuesta de la propuesta y normaliza las operaciones', () => {
    const raw = JSON.stringify({
      reply: 'Ana, te propongo la clase Factura.',
      proposal: {
        explanation: 'Clase Factura',
        classes: [{ name: 'Factura', attributes: [{ name: 'total', type: 'decimal' }] }],
        enums: [],
        relationships: [],
      },
    });

    const result = parseChatReply(raw, createEmptyModel('Tienda'));
    expect(result.reply).toBe('Ana, te propongo la clase Factura.');
    expect(result.proposal?.explanation).toBe('Clase Factura');
    // Clase, su id anadido por la normalizacion y el atributo con tipo traducido.
    const applied = applyOperations(createEmptyModel('Tienda'), result.proposal?.operations ?? []);
    expect(applied.ok).toBe(true);
    if (applied.ok) {
      expect(applied.value.classes[0]?.attributes.map((a) => `${a.name}:${a.type}`)).toEqual([
        'id:Long',
        'total:BigDecimal',
      ]);
    }
  });

  it('una respuesta sin cambios no lleva propuesta', () => {
    const result = parseChatReply('{"reply":"Luis, el modelo tiene 3 clases."}');
    expect(result).toEqual({ reply: 'Luis, el modelo tiene 3 clases.', proposal: null });
  });

  it('acepta la propuesta en la raiz y el texto suelto de modelos locales', () => {
    const root = parseChatReply('{"reply":"Hecho","classes":[{"name":"Cliente"}]}');
    expect(root.proposal?.operations.some((op) => op.type === 'addClass')).toBe(true);

    expect(parseChatReply('Hola, no entendi la pregunta').reply).toBe(
      'Hola, no entendi la pregunta',
    );
  });
});

describe('contexto que recibe la IA del chat', () => {
  it('incluye quien pregunta, quien esta conectado y la conversacion reciente', () => {
    const history = Array.from({ length: CHAT_HISTORY_LIMIT + 5 }, (_, index) => ({
      author: index % 2 === 0 ? 'Ana' : 'Luis',
      fromAssistant: index === 3,
      content: `mensaje ${index}`,
    }));
    const prompt = formatChatRequest({
      askedBy: 'Ana',
      message: '@ia que le falta al modelo?',
      history,
      participants: ['Ana', 'Luis'],
    });

    expect(prompt).toContain('Participantes conectados: Ana, Luis.');
    expect(prompt).toContain('Mensaje de Ana que debes responder:\n@ia que le falta al modelo?');
    // Solo los ultimos mensajes, para no desbordar el contexto.
    expect(prompt).not.toContain('mensaje 0\n');
    expect(prompt).toContain(`mensaje ${CHAT_HISTORY_LIMIT + 4}`);
  });
});
