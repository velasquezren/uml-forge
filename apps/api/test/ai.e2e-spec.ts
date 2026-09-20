import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('AI Endpoints E2E (/api/ai)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

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

  it('POST /api/ai/generate genera operaciones o retorna mensaje informativo', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/ai/generate')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        prompt: 'Crea una clase Student con un atributo name de tipo String',
      });

    expect(res.status).toBe(200);
    expect(res.body.explanation).toBeDefined();
    expect(Array.isArray(res.body.operations)).toBe(true);
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
});
