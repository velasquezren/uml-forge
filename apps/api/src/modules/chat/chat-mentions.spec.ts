import { describe, expect, it } from 'vitest';
import { FOLLOW_UP_WINDOW_MS, isFollowUpToAssistant, mentionsAi } from './chat-mentions';

const now = new Date('2026-10-22T10:00:00Z');
const aiQuestion = {
  kind: 'ASSISTANT' as const,
  content: 'Ana, el modelo tiene 4 clases. ¿Deseas anadir algo mas?',
  isError: false,
  createdAt: new Date(now.getTime() - 60_000),
  replyTo: { authorId: 'ana' },
};

describe('cuando debe responder la IA', () => {
  it('detecta @ia como palabra, no dentro de un correo', () => {
    expect(mentionsAi('@IA ayuda')).toBe(true);
    expect(mentionsAi('oye (@ia) mira')).toBe(true);
    expect(mentionsAi('escribe a soporte@ia.com')).toBe(false);
  });

  it('sigue la conversacion si la IA acaba de preguntar a esa persona', () => {
    expect(isFollowUpToAssistant(aiQuestion, 'ana', now)).toBe(true);
  });

  it('no se mete si contesta otra persona, si no pregunto o si paso el tiempo', () => {
    expect(isFollowUpToAssistant(aiQuestion, 'luis', now)).toBe(false);
    expect(
      isFollowUpToAssistant({ ...aiQuestion, content: 'Ana, propuesta lista.' }, 'ana', now),
    ).toBe(false);
    const old = new Date(now.getTime() - FOLLOW_UP_WINDOW_MS - 1000);
    expect(isFollowUpToAssistant({ ...aiQuestion, createdAt: old }, 'ana', now)).toBe(false);
    expect(isFollowUpToAssistant({ ...aiQuestion, isError: true }, 'ana', now)).toBe(false);
    expect(isFollowUpToAssistant({ ...aiQuestion, kind: 'USER' }, 'ana', now)).toBe(false);
    expect(isFollowUpToAssistant(null, 'ana', now)).toBe(false);
  });
});
