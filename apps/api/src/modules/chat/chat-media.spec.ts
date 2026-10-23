import { UnprocessableEntityException } from '@nestjs/common';
import { ChatAttachmentKind, ChatAuthorKind } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { extractPartialReply } from '../ai/ai-chat-draft';
import { thinkingFor } from '../ai/providers/gemini-client';
import { createDraftThrottle, toHistoryTurns } from './chat-assistant-context';
import { validateAttachment } from './chat-attachments';

describe('respuesta de la IA mientras se escribe', () => {
  it('saca el texto de reply aunque el JSON llegue cortado', () => {
    expect(extractPartialReply('{"rep')).toBeNull();
    expect(extractPartialReply('{"reply": "Ana, el mod')).toBe('Ana, el mod');
    expect(extractPartialReply('{"reply":"linea\\nsegunda \\"cita\\" y \\u00f1')).toBe(
      'linea\nsegunda "cita" y ñ',
    );
    // Un escape cortado entre dos trozos no se muestra a medias.
    expect(extractPartialReply('{"reply":"hola \\')).toBe('hola ');
    expect(extractPartialReply('{"reply":"fin","proposal":{"x":"no"}}')).toBe('fin');
  });

  it('avisa como mucho cada 300 ms y solo si el texto cambia', () => {
    let clock = 0;
    const publish = vi.fn();
    const onDraft = createDraftThrottle(publish, () => clock);

    onDraft('A');
    clock = 100;
    onDraft('An');
    clock = 400;
    onDraft('Ana');
    onDraft('Ana');
    expect(publish.mock.calls.map((call) => call[0])).toEqual(['A', 'Ana']);

    clock = 800;
    onDraft('x'.repeat(5000));
    expect((publish.mock.calls.at(-1)?.[0] as string).length).toBeLessThan(2600);
  });
});

describe('razonamiento segun el modelo', () => {
  it('usa niveles en Gemini 3 y presupuesto en Gemini 2.5', () => {
    expect(thinkingFor('gemini-3.5-flash', 'low')).toEqual({ thinkingLevel: 'LOW' });
    expect(thinkingFor('gemini-3.5-flash', 'minimal')).toEqual({ thinkingLevel: 'MINIMAL' });
    expect(thinkingFor('gemini-2.5-flash', 'minimal')).toEqual({ thinkingBudget: 0 });
    expect(thinkingFor('gemini-2.5-pro', 'minimal')).toEqual({ thinkingBudget: 128 });
    expect(thinkingFor('gemini-flash-latest', 'low')).toBeUndefined();
    expect(thinkingFor('gemini-3.5-flash', 'default')).toBeUndefined();
  });
});

describe('historial con adjuntos', () => {
  it('menciona las imagenes y cuenta las notas de voz por su transcripcion', () => {
    const turns = toHistoryTurns([
      {
        kind: ChatAuthorKind.USER,
        content: 'mirad esto',
        transcript: null,
        author: { name: 'Ana' },
        attachment: { kind: ChatAttachmentKind.IMAGE },
      },
      {
        kind: ChatAuthorKind.USER,
        content: '',
        transcript: 'falta la clase factura',
        author: { name: 'Luis' },
        attachment: { kind: ChatAttachmentKind.AUDIO },
      },
    ]);
    expect(turns.map((turn) => turn.content)).toEqual([
      '[imagen adjunta] mirad esto',
      '[nota de voz] falta la clase factura',
    ]);
  });
});

describe('validacion de adjuntos', () => {
  const tiny = Buffer.from('datos').toString('base64');

  it('acepta el audio de Chrome y quita los parametros del tipo', () => {
    const result = validateAttachment({
      kind: 'audio',
      mimeType: 'audio/webm;codecs=opus',
      dataBase64: tiny,
      durationMs: 4200.6,
    });
    expect(result).toMatchObject({ mimeType: 'audio/webm', durationMs: 4201 });
  });

  it('rechaza formatos ajenos, adjuntos vacios y audios demasiado largos', () => {
    expect(() =>
      validateAttachment({ kind: 'image', mimeType: 'image/svg+xml', dataBase64: tiny }),
    ).toThrow(UnprocessableEntityException);
    expect(() =>
      validateAttachment({ kind: 'image', mimeType: 'image/png', dataBase64: '' }),
    ).toThrow('El adjunto esta vacio');
    expect(() =>
      validateAttachment({
        kind: 'audio',
        mimeType: 'audio/webm',
        dataBase64: tiny,
        durationMs: 6 * 60 * 1000,
      }),
    ).toThrow('La nota de voz supera los 5 minutos');
  });
});
