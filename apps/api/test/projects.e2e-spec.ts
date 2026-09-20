import { describe, beforeAll, afterAll, it, expect, beforeEach } from 'vitest';
import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ProjectRole } from '@prisma/client';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Projects E2E (/api/projects)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let ownerToken: string;
  let collaboratorToken: string;
  let externalToken: string;
  let collaboratorId: string;

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
  });

  beforeEach(async () => {
    await prisma.cleanDatabase();

    const ownerRes = await request(app.getHttpServer()).post('/api/auth/register').send({
      email: 'owner@umlforge.dev',
      password: 'Password123!',
      name: 'Propietario',
    });
    ownerToken = ownerRes.body.accessToken as string;

    const collabRes = await request(app.getHttpServer()).post('/api/auth/register').send({
      email: 'collab@umlforge.dev',
      password: 'Password123!',
      name: 'Colaborador',
    });
    collaboratorToken = collabRes.body.accessToken as string;
    collaboratorId = collabRes.body.user.id as string;

    const extRes = await request(app.getHttpServer()).post('/api/auth/register').send({
      email: 'external@umlforge.dev',
      password: 'Password123!',
      name: 'Externo',
    });
    externalToken = extRes.body.accessToken as string;
  });

  afterAll(async () => {
    await app.close();
  });

  it('crea un proyecto con documento YDoc persistido en binario', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/projects')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Sistema de Veterinaria',
        description: 'Modelo de clases UML para clinica veterinaria',
      })
      .expect(201);

    expect(res.body.id).toBeDefined();
    expect(res.body.name).toBe('Sistema de Veterinaria');
    expect(res.body.currentUserRole).toBe(ProjectRole.OWNER);

    // Verifica que el YDocState existe en la base de datos y es binario
    const ydoc = await prisma.yDocState.findUnique({
      where: { projectId: res.body.id as string },
    });
    expect(ydoc).toBeDefined();
    expect(ydoc?.state).toBeInstanceOf(Uint8Array);
  });

  it('permite listar y consultar detalles de proyectos accesibles', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/api/projects')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Proyecto 1' })
      .expect(201);

    const projectId = createRes.body.id as string;

    // Listar proyectos
    const listRes = await request(app.getHttpServer())
      .get('/api/projects')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(Array.isArray(listRes.body)).toBe(true);
    expect(listRes.body).toHaveLength(1);
    expect(listRes.body[0].id).toBe(projectId);

    // Obtener por ID
    const getRes = await request(app.getHttpServer())
      .get(`/api/projects/${projectId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(getRes.body.name).toBe('Proyecto 1');
  });

  it('gestiona miembros y hace cumplir los roles de seguridad', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/api/projects')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Proyecto Colaborativo' })
      .expect(201);

    const projectId = createRes.body.id as string;

    // Un usuario externo no puede acceder al proyecto
    await request(app.getHttpServer())
      .get(`/api/projects/${projectId}`)
      .set('Authorization', `Bearer ${externalToken}`)
      .expect(403);

    // Anadir al colaborador con rol VIEWER
    const addMemberRes = await request(app.getHttpServer())
      .post(`/api/projects/${projectId}/members`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        email: 'collab@umlforge.dev',
        role: ProjectRole.VIEWER,
      })
      .expect(201);

    expect(addMemberRes.body.role).toBe(ProjectRole.VIEWER);

    // El VIEWER puede leer el proyecto
    await request(app.getHttpServer())
      .get(`/api/projects/${projectId}`)
      .set('Authorization', `Bearer ${collaboratorToken}`)
      .expect(200);

    // El VIEWER NO puede modificar el proyecto (requiere EDITOR)
    await request(app.getHttpServer())
      .patch(`/api/projects/${projectId}`)
      .set('Authorization', `Bearer ${collaboratorToken}`)
      .send({ name: 'Nombre Modificado por Viewer' })
      .expect(403);

    // Ascender al colaborador a EDITOR
    await request(app.getHttpServer())
      .patch(`/api/projects/${projectId}/members/${collaboratorId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ role: ProjectRole.EDITOR })
      .expect(200);

    // Ahora el EDITOR si puede modificar el proyecto
    await request(app.getHttpServer())
      .patch(`/api/projects/${projectId}`)
      .set('Authorization', `Bearer ${collaboratorToken}`)
      .send({ name: 'Nombre Modificado por Editor' })
      .expect(200);

    // El EDITOR NO puede eliminar el proyecto (requiere OWNER)
    await request(app.getHttpServer())
      .delete(`/api/projects/${projectId}`)
      .set('Authorization', `Bearer ${collaboratorToken}`)
      .expect(403);

    // El OWNER elimina el proyecto exitosamente
    await request(app.getHttpServer())
      .delete(`/api/projects/${projectId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
  });
});
