import { describe, beforeAll, afterAll, beforeEach, it, expect } from 'vitest';
import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { createId } from '@uml-forge/uml-core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

/** Acumula la respuesta binaria del ZIP en un Buffer. */
function binaryParser(
  res: request.Response,
  callback: (err: Error | null, body: Buffer) => void,
): void {
  // En Node la respuesta que recibe el parser es el flujo entrante de http.
  const stream = res as unknown as NodeJS.ReadableStream;
  const chunks: Buffer[] = [];
  stream.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
  stream.on('end', () => callback(null, Buffer.concat(chunks)));
}

describe('Codegen E2E (/api/projects/:id/codegen)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ownerToken: string;
  let externalToken: string;
  let projectId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser('test_secret_key_1234567890'));
    app.setGlobalPrefix('api', { exclude: ['health', 'docs'] });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await prisma.cleanDatabase();

    const ownerRes = await request(app.getHttpServer()).post('/api/auth/register').send({
      email: 'codegen-owner@umlforge.dev',
      password: 'Password123!',
      name: 'Propietario',
    });
    ownerToken = ownerRes.body.accessToken as string;

    const externalRes = await request(app.getHttpServer()).post('/api/auth/register').send({
      email: 'codegen-external@umlforge.dev',
      password: 'Password123!',
      name: 'Externo',
    });
    externalToken = externalRes.body.accessToken as string;

    const projectRes = await request(app.getHttpServer())
      .post('/api/projects')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Clinica Veterinaria', description: 'Modelo de prueba' });
    projectId = projectRes.body.id as string;
  });

  /** Anade una clase con un atributo al modelo del proyecto. */
  async function seedModel(): Promise<void> {
    const classId = createId();
    await request(app.getHttpServer())
      .post(`/api/projects/${projectId}/operations`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        clientId: createId(),
        batchId: createId(),
        operations: [
          {
            seq: 1,
            op: {
              type: 'addClass',
              class: { id: classId, name: 'Owner', position: { x: 0, y: 0 } },
            },
          },
          {
            seq: 2,
            op: {
              type: 'addAttribute',
              classId,
              attribute: {
                id: createId(),
                name: 'fullName',
                type: 'String',
                visibility: 'private',
              },
            },
          },
        ],
      })
      .expect(200);
  }

  it('genera y descarga el proyecto Spring Boot del modelo', async () => {
    await seedModel();

    const res = await request(app.getHttpServer())
      .post(`/api/projects/${projectId}/codegen/springboot`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        groupId: 'com.umlforge',
        artifactId: 'veterinaria',
        packageName: 'com.umlforge.veterinaria',
      })
      .buffer()
      .parse(binaryParser)
      .expect(200);

    expect(res.headers['content-type']).toContain('application/zip');
    expect(res.headers['content-disposition']).toContain('veterinaria.zip');
    expect(Number(res.headers['x-generated-files'])).toBeGreaterThan(5);
    // Firma local de un fichero ZIP: PK\x03\x04
    expect(Buffer.from(res.body as Buffer).subarray(0, 4)).toEqual(
      Buffer.from([0x50, 0x4b, 0x03, 0x04]),
    );

    const jobs = await prisma.generationJob.findMany({ where: { projectId } });
    expect(jobs).toHaveLength(1);
    expect(jobs[0]?.status).toBe('COMPLETED');
  });

  it('rechaza la generacion cuando el modelo no tiene clases', async () => {
    await request(app.getHttpServer())
      .post(`/api/projects/${projectId}/codegen/springboot`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({})
      .expect(400);

    const jobs = await prisma.generationJob.findMany({ where: { projectId } });
    expect(jobs[0]?.status).toBe('FAILED');
  });

  it('impide generar el backend de un proyecto ajeno', async () => {
    await seedModel();

    await request(app.getHttpServer())
      .post(`/api/projects/${projectId}/codegen/springboot`)
      .set('Authorization', `Bearer ${externalToken}`)
      .send({})
      .expect(403);
  });

  it('exige autenticacion', async () => {
    await request(app.getHttpServer())
      .post(`/api/projects/${projectId}/codegen/springboot`)
      .send({})
      .expect(401);
  });
});
