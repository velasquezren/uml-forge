import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { UMLModel } from '@uml-forge/uml-core';
import { AppModule } from '../src/app.module';
import { mapAiOperationsToUmlOperations } from '../src/modules/ai/ai-operation-mapper';
import type {
  AiGenerationResult,
  AiProvider,
} from '../src/modules/ai/interfaces/ai-provider.interface';
import { GeminiProvider } from '../src/modules/ai/providers/gemini.provider';
import { OllamaProvider } from '../src/modules/ai/providers/ollama.provider';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Doble de un proveedor de IA. Las pruebas de extremo a extremo recorren la
 * tuberia HTTP real (guardas, validacion, servicio, respaldo y mapeador) sin
 * depender de una clave de Gemini ni de un Ollama arrancado: llamar a un
 * servicio externo desde la bateria de pruebas la haria lenta, no determinista
 * y gastaria la cuota de quien la ejecuta.
 */
class FakeProvider implements AiProvider {
  available = true;
  failure: string | null = null;

  constructor(readonly providerName: string) {}

  isAvailable(): Promise<boolean> {
    return Promise.resolve(this.available);
  }

  private answer(currentModel?: UMLModel): Promise<AiGenerationResult> {
    if (this.failure !== null) {
      return Promise.reject(new Error(this.failure));
    }
    const operations = mapAiOperationsToUmlOperations(
      { classes: [{ name: 'Student', attributes: [{ name: 'name', type: 'string' }] }] },
      currentModel,
    );
    return Promise.resolve({ explanation: `Respuesta de ${this.providerName}`, operations });
  }

  generateFromPrompt(_prompt: string, currentModel?: UMLModel): Promise<AiGenerationResult> {
    return this.answer(currentModel);
  }

  generateFromImage(
    _image: Buffer,
    _mime: string,
    _prompt?: string,
    currentModel?: UMLModel,
  ): Promise<AiGenerationResult> {
    return this.answer(currentModel);
  }

  suggestRefinements(model: UMLModel): Promise<AiGenerationResult> {
    return this.answer(model);
  }
}

describe('AI Endpoints E2E (/api/ai)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  const gemini = new FakeProvider('gemini');
  const ollama = Object.assign(new FakeProvider('ollama'), {
    isVisionAvailable: () => Promise.resolve(true),
  });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(GeminiProvider)
      .useValue(gemini)
      .overrideProvider(OllamaProvider)
      .useValue(ollama)
      .compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser('test_secret_key_1234567890'));
    app.setGlobalPrefix('api', { exclude: ['health', 'docs'] });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

    await app.init();
    prisma = app.get(PrismaService);
    await prisma.cleanDatabase();

    const regRes = await request(app.getHttpServer()).post('/api/auth/register').send({
      email: 'aiuser@umlforge.dev',
      password: 'Password123!',
      name: 'AI Tester',
    });
    authToken = regRes.body.accessToken as string;
  });

  beforeEach(() => {
    for (const provider of [gemini, ollama]) {
      provider.available = true;
      provider.failure = null;
    }
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/ai/status devuelve estado del proveedor de IA', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/ai/status')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.provider).toBeDefined();
    expect(typeof res.body.available).toBe('boolean');
    expect(res.body.model).toBeDefined();
  });

  it('POST /api/ai/generate devuelve operaciones listas para el lienzo', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/ai/generate')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ prompt: 'Crea una clase Student con un atributo name de tipo String' });

    expect(res.status).toBe(200);
    expect(typeof res.body.explanation).toBe('string');
    const types = (res.body.operations as { type: string }[]).map((op) => op.type);
    // Clase, su identificador anadido por la normalizacion y el atributo pedido.
    expect(types).toEqual(['addClass', 'addAttribute', 'addAttribute']);
  });

  it('POST /api/ai/image procesa imagenes codificadas en base64', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/ai/image')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        imageBase64:
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
        mimeType: 'image/png',
        prompt: 'Extrae clases del diagrama',
      });

    expect(res.status).toBe(200);
    expect(res.body.explanation).toBeDefined();
    expect(Array.isArray(res.body.operations)).toBe(true);
  });

  it('POST /api/ai/refine acepta un modelo UML y devuelve sugerencias', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/ai/refine')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        model: {
          id: '11111111-1111-1111-1111-111111111111',
          name: 'School',
          classes: [],
          enums: [],
          relationships: [],
          createdAt: '2026-08-30T00:00:00Z',
          updatedAt: '2026-08-30T00:00:00Z',
        },
        context: 'Mejora de claves primarias',
      });

    expect(res.status).toBe(200);
    expect(res.body.explanation).toBeDefined();
    expect(Array.isArray(res.body.operations)).toBe(true);
  });

  it('recurre al respaldo si el proveedor principal falla', async () => {
    const primary = process.env.AI_PROVIDER === 'ollama' ? ollama : gemini;
    primary.failure = 'Se agoto la cuota';

    const res = await request(app.getHttpServer())
      .post('/api/ai/generate')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ prompt: 'Una clase Student' });

    expect(res.status).toBe(200);
    expect(res.body.explanation).toMatch(/^\[Respaldo /u);
  });

  it('responde 503 con el motivo cuando ningun proveedor puede atender', async () => {
    gemini.available = false;
    ollama.available = false;

    const res = await request(app.getHttpServer())
      .post('/api/ai/generate')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ prompt: 'Una clase Student' });

    expect(res.status).toBe(503);
    expect(String(res.body.message)).toMatch(/GEMINI_API_KEY/u);
  });
});
