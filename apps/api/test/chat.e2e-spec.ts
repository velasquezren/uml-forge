import type { AddressInfo } from 'node:net';
import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { UMLModel } from '@uml-forge/uml-core';
import { AppModule } from '../src/app.module';
import { mapAiOperationsToUmlOperations } from '../src/modules/ai/ai-operation-mapper';
import type {
  AiChatReply,
  AiChatRequest,
  AiGenerationResult,
  AiProvider,
} from '../src/modules/ai/interfaces/ai-provider.interface';
import { GeminiProvider } from '../src/modules/ai/providers/gemini.provider';
import { OllamaProvider } from '../src/modules/ai/providers/ollama.provider';
import { ChatAssistantService } from '../src/modules/chat/chat-assistant.service';
import { CollabService } from '../src/modules/collab/collab.service';
import { PrismaService } from '../src/prisma/prisma.service';

/** IA de pega: responde por su nombre a quien pregunta y propone una clase. */
class ChatFakeProvider implements AiProvider {
  readonly providerName = 'gemini';
  lastRequest: AiChatRequest | null = null;

  isAvailable(): Promise<boolean> {
    return Promise.resolve(true);
  }
  converse(request: AiChatRequest): Promise<AiChatReply> {
    this.lastRequest = request;
    const operations = mapAiOperationsToUmlOperations(
      { classes: [{ name: 'Factura', attributes: [{ name: 'total', type: 'decimal' }] }] },
      request.model,
    );
    return Promise.resolve({
      reply: `${request.askedBy}, te propongo la clase Factura.`,
      proposal: { explanation: 'Clase Factura', operations },
    });
  }
  private empty(): Promise<AiGenerationResult> {
    return Promise.resolve({ explanation: '', operations: [] });
  }
  generateFromPrompt(_prompt: string, _model?: UMLModel): Promise<AiGenerationResult> {
    return this.empty();
  }
  generateFromImage(): Promise<AiGenerationResult> {
    return this.empty();
  }
  suggestRefinements(): Promise<AiGenerationResult> {
    return this.empty();
  }
}

describe('Chat de grupo con IA E2E (/api/projects/:id/chat)', () => {
  let app: INestApplication;
  let baseUrl: string;
  let token: string;
  let projectId: string;
  const ai = new ChatFakeProvider();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(GeminiProvider)
      .useValue(ai)
      .overrideProvider(OllamaProvider)
      .useValue(ai)
      .compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser('test_secret_key_1234567890'));
    app.setGlobalPrefix('api', { exclude: ['health', 'docs'] });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    await app.listen(0);
    baseUrl = `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}`;
    await app.get(PrismaService).cleanDatabase();

    const register = await request(app.getHttpServer()).post('/api/auth/register').send({
      email: 'chat@umlforge.dev',
      password: 'Password123!',
      name: 'Ana',
    });
    token = register.body.accessToken as string;
    const project = await request(app.getHttpServer())
      .post('/api/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Tienda chat' });
    projectId = project.body.id as string;
  });

  afterAll(async () => {
    await app.close();
  });

  const api = () => request(app.getHttpServer());
  const headers = () => ({ Authorization: `Bearer ${token}` });

  it('un mensaje normal no despierta a la IA', async () => {
    const res = await api()
      .post(`/api/projects/${projectId}/chat/messages`)
      .set(headers())
      .send({ content: 'Hola equipo' });
    expect(res.status).toBe(201);
    expect(res.body.mentionsAi).toBe(false);
  });

  it('el flujo en tiempo real entrega la pregunta y la respuesta de la IA', async () => {
    const controller = new AbortController();
    const stream = await fetch(`${baseUrl}/api/projects/${projectId}/chat/stream`, {
      headers: headers(),
      signal: controller.signal,
    });
    expect(stream.headers.get('content-type')).toContain('text/event-stream');

    const received: string[] = [];
    const reading = (async () => {
      const reader = stream.body!.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) return;
        received.push(decoder.decode(value));
        if (received.join('').includes('te propongo la clase Factura')) return;
      }
    })();

    await new Promise((resolve) => setTimeout(resolve, 200));
    await api()
      .post(`/api/projects/${projectId}/chat/messages`)
      .set(headers())
      .send({ content: '@ia necesitamos facturar los pedidos' });
    await app.get(ChatAssistantService).drain(projectId);
    await Promise.race([reading, new Promise((resolve) => setTimeout(resolve, 5000))]);
    controller.abort();

    const text = received.join('');
    expect(text).toContain('event: ready');
    expect(text).toContain('event: assistant');
    expect(text).toContain('Ana, te propongo la clase Factura.');
    expect(ai.lastRequest?.history.map((turn) => turn.content)).toEqual(['Hola equipo']);
  });

  it('el historial muestra la propuesta pendiente con su resumen', async () => {
    const res = await api().get(`/api/projects/${projectId}/chat/messages`).set(headers());
    expect(res.status).toBe(200);
    const reply = (
      res.body.messages as { kind: string; proposal: { status: string; summary: string[] } }[]
    ).find((message) => message.kind === 'ASSISTANT');
    expect(reply?.proposal.status).toBe('PENDING');
    expect(reply?.proposal.summary).toContain('Nueva clase Factura');
  });

  it('aplicar la propuesta cambia el modelo compartido y solo se puede una vez', async () => {
    const page = await api().get(`/api/projects/${projectId}/chat/messages`).set(headers());
    const reply = (page.body.messages as { id: string; kind: string }[]).find(
      (message) => message.kind === 'ASSISTANT',
    );

    const applied = await api()
      .post(`/api/projects/${projectId}/chat/messages/${reply!.id}/proposal/apply`)
      .set(headers());
    expect(applied.status).toBe(200);
    expect(applied.body.proposal.status).toBe('APPLIED');
    expect(applied.body.proposal.resolvedBy.name).toBe('Ana');

    const model = await app.get(CollabService).currentModel(projectId);
    expect(model?.classes.map((c) => c.name)).toEqual(['Factura']);

    const again = await api()
      .post(`/api/projects/${projectId}/chat/messages/${reply!.id}/proposal/apply`)
      .set(headers());
    expect(again.status).toBe(409);
  });

  it('rechaza a quien no es miembro del proyecto', async () => {
    const other = await api().post('/api/auth/register').send({
      email: 'ajeno@umlforge.dev',
      password: 'Password123!',
      name: 'Ajeno',
    });
    const res = await api()
      .get(`/api/projects/${projectId}/chat/messages`)
      .set('Authorization', `Bearer ${other.body.accessToken as string}`);
    expect(res.status).toBe(403);
  });
});
