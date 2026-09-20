import { describe, beforeAll, afterAll, it, expect, beforeEach } from 'vitest';
import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Auth E2E (/api/auth)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

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
  });

  afterAll(async () => {
    await app.close();
  });

  it('registra un usuario nuevo exitosamente y establece cookie de refresh token', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: 'ada@umlforge.dev',
        password: 'Password123!',
        name: 'Ada Lovelace',
      })
      .expect(201);

    expect(res.body.accessToken).toBeDefined();
    expect(res.body.user).toMatchObject({
      email: 'ada@umlforge.dev',
      name: 'Ada Lovelace',
    });
    expect(res.body.user.passwordHash).toBeUndefined();

    const cookies = res.headers['set-cookie'] as string[] | undefined;
    expect(cookies).toBeDefined();
    expect(cookies?.some((c) => c.startsWith('refresh_token='))).toBe(true);
  });

  it('rechaza registro con correo duplicado devolviendo 409 Conflict', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: 'duplicado@umlforge.dev',
        password: 'Password123!',
        name: 'Usuario Uno',
      })
      .expect(201);

    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: 'duplicado@umlforge.dev',
        password: 'OtraPassword123!',
        name: 'Usuario Dos',
      })
      .expect(409);

    expect(res.body.message).toMatch(/registrado/i);
  });

  it('inicia sesion con credenciales correctas y rechaza credenciales erroneas', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: 'login@umlforge.dev',
        password: 'Password123!',
        name: 'Usuario Login',
      })
      .expect(201);

    // Credenciales erroneas
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'login@umlforge.dev',
        password: 'PasswordIncorrecta!',
      })
      .expect(401);

    // Credenciales correctas
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'login@umlforge.dev',
        password: 'Password123!',
      })
      .expect(200);

    expect(res.body.accessToken).toBeDefined();
    expect(res.body.user.email).toBe('login@umlforge.dev');
  });

  it('renueva el access token y rota el refresh token con deteccion de reutilizacion', async () => {
    const registerRes = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: 'rotation@umlforge.dev',
        password: 'Password123!',
        name: 'Rotation Test',
      })
      .expect(201);

    const cookies1 = (registerRes.headers['set-cookie'] as unknown as string[]) ?? [];
    const refreshCookie1 = cookies1.find((c) => c.startsWith('refresh_token='))!;

    // Primera rotacion: debe ser exitosa y emitir una nueva cookie
    const refreshRes1 = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set('Cookie', [refreshCookie1])
      .expect(200);

    expect(refreshRes1.body.accessToken).toBeDefined();
    const cookies2 = (refreshRes1.headers['set-cookie'] as unknown as string[]) ?? [];
    const refreshCookie2 = cookies2.find((c) => c.startsWith('refresh_token='))!;
    expect(refreshCookie2).not.toEqual(refreshCookie1);

    // Intento de reutilizacion del PRIMER token (ya rotado): debe fallar y revocar toda la familia
    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set('Cookie', [refreshCookie1])
      .expect(401);

    // Debido a la deteccion de robo, el SEGUNDO token tambien debe haber sido revocado
    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set('Cookie', [refreshCookie2])
      .expect(401);
  });

  it('protege rutas privadas contra accesos sin token y permite con token valido', async () => {
    // Sin token
    await request(app.getHttpServer()).get('/api/users/me').expect(401);

    // Con token
    const registerRes = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: 'protected@umlforge.dev',
        password: 'Password123!',
        name: 'Protected User',
      })
      .expect(201);

    const token = registerRes.body.accessToken as string;

    const meRes = await request(app.getHttpServer())
      .get('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(meRes.body.email).toBe('protected@umlforge.dev');
  });

  it('cierra sesion limpiando cookies e invalidando tokens', async () => {
    const registerRes = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: 'logout@umlforge.dev',
        password: 'Password123!',
        name: 'Logout User',
      })
      .expect(201);

    const cookies = (registerRes.headers['set-cookie'] as unknown as string[]) ?? [];
    const refreshCookie = cookies.find((c) => c.startsWith('refresh_token='))!;

    const logoutRes = await request(app.getHttpServer())
      .post('/api/auth/logout')
      .set('Cookie', [refreshCookie])
      .expect(200);

    expect(logoutRes.body.message).toMatch(/cerrada/i);

    // El token ahora debe estar revocado
    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set('Cookie', [refreshCookie])
      .expect(401);
  });
});
