import { ConflictException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../prisma/prisma.service';
import type { AiService } from '../ai/ai.service';
import type { CollabService } from '../collab/collab.service';
import { ChatAssistantService } from './chat-assistant.service';
import { ChatService } from './chat.service';
import { InMemoryChatEventBus } from './events/in-memory-chat-event-bus';

const PROJECT = '10000000-0000-4000-8000-000000000001';

function record(overrides: Record<string, unknown> = {}) {
  return {
    id: 'm1',
    projectId: PROJECT,
    kind: 'USER',
    author: { id: 'u1', name: 'Ana' },
    authorId: 'u1',
    content: 'hola',
    mentionsAi: false,
    isError: false,
    replyTo: null,
    replyToId: null,
    proposal: null,
    proposalStatus: null,
    proposalResolvedBy: null,
    proposalResolvedById: null,
    proposalResolvedAt: null,
    createdAt: new Date('2026-10-20T10:00:00Z'),
    ...overrides,
  };
}

function chatService(prisma: unknown, enqueue = vi.fn()) {
  const assistant = { enqueue } as unknown as ChatAssistantService;
  const service = new ChatService(
    prisma as PrismaService,
    {} as CollabService,
    assistant,
    new InMemoryChatEventBus(),
  );
  return { service, enqueue };
}

describe('ChatService', () => {
  it('llama a la IA con @ia o con askAi, y no en una conversacion normal', async () => {
    const create = vi.fn((args: { data: { content: string; mentionsAi: boolean } }) =>
      Promise.resolve(record({ content: args.data.content, mentionsAi: args.data.mentionsAi })),
    );
    const { service, enqueue } = chatService({ chatMessage: { create } });
    const author = { id: 'u1', name: 'Ana' };

    await service.send(PROJECT, author, { content: 'Luis, revisas tu la clase Pedido?' });
    expect(enqueue).not.toHaveBeenCalled();

    await service.send(PROJECT, author, { content: '@IA que le falta al modelo?' });
    await service.send(PROJECT, author, { content: 'oye (@ia) ayuda' });
    await service.send(PROJECT, author, { content: 'sin mencion', askAi: true });
    expect(enqueue).toHaveBeenCalledTimes(3);
    expect(enqueue).toHaveBeenCalledWith(PROJECT, 'm1', 'Ana');

    // Un correo no es una mencion.
    await service.send(PROJECT, author, { content: 'escribe a soporte@ia.com' });
    expect(enqueue).toHaveBeenCalledTimes(3);
  });

  it('no aplica dos veces una propuesta que ya resolvio otra persona', async () => {
    const prisma = {
      chatMessage: {
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        findFirst: vi.fn().mockResolvedValue(
          record({
            kind: 'ASSISTANT',
            proposalStatus: 'APPLIED',
            proposalResolvedBy: { id: 'u2', name: 'Luis' },
          }),
        ),
      },
    };
    const { service } = chatService(prisma);

    const attempt = service.applyProposal(PROJECT, 'm1', 'u1');
    await expect(attempt).rejects.toBeInstanceOf(ConflictException);
    await expect(service.applyProposal(PROJECT, 'm1', 'u1')).rejects.toThrow(
      'La propuesta ya la aplico Luis',
    );
  });
});

describe('ChatAssistantService', () => {
  function assistantWith(converse: AiService['converse']) {
    const created: { content: string; isError: boolean; replyToId: string }[] = [];
    const prisma = {
      chatMessage: {
        findUnique: vi.fn(({ where }: { where: { id: string } }) =>
          Promise.resolve(record({ id: where.id, content: `pregunta ${where.id}` })),
        ),
        findMany: vi.fn().mockResolvedValue([]),
        create: vi.fn(
          ({ data }: { data: { content: string; isError: boolean; replyToId: string } }) => {
            created.push(data);
            return Promise.resolve({ id: `r${created.length}` });
          },
        ),
      },
    };
    const collab = {
      currentModel: vi.fn().mockResolvedValue(null),
      participants: vi.fn().mockReturnValue(['Ana']),
    };
    const bus = new InMemoryChatEventBus();
    const events: string[] = [];
    bus.subscribe((event) => events.push(event.type === 'assistant' ? event.state : 'message'));
    const assistant = new ChatAssistantService(
      prisma as unknown as PrismaService,
      { converse } as unknown as AiService,
      collab as unknown as CollabService,
      bus,
    );
    return { assistant, created, events };
  }

  it('responde en orden a las preguntas de un mismo proyecto', async () => {
    const converse = vi.fn(async (request: { message: string }) => {
      // La primera tarda mas: aun asi su respuesta debe salir antes.
      await new Promise((resolve) => setTimeout(resolve, request.message.endsWith('q1') ? 30 : 1));
      return { reply: `respuesta a ${request.message}`, proposal: null };
    });
    const { assistant, created, events } = assistantWith(converse);

    assistant.enqueue(PROJECT, 'q1', 'Ana');
    assistant.enqueue(PROJECT, 'q2', 'Luis');
    await assistant.drain(PROJECT);

    expect(created.map((message) => message.replyToId)).toEqual(['q1', 'q2']);
    expect(created[0]?.content).toBe('respuesta a pregunta q1');
    expect(events.filter((event) => event === 'thinking')).toHaveLength(2);
    expect(events.at(-1)).toBe('idle');
  });

  it('si la IA falla, todos ven un mensaje de error dirigido a quien pregunto', async () => {
    const { assistant, created } = assistantWith(() => Promise.reject(new Error('Cuota agotada')));

    assistant.enqueue(PROJECT, 'q1', 'Ana');
    await assistant.drain(PROJECT);

    expect(created[0]).toMatchObject({ isError: true, replyToId: 'q1' });
    expect(created[0]?.content).toBe('Ana, no he podido responder: Cuota agotada');
  });
});
