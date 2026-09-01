import { describe, expect, it, vi } from 'vitest';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { type JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { AuthService } from './auth.service';
import { type ApiConfigService } from '../../config/config.service';
import { type PrismaService } from '../../prisma/prisma.service';

describe('AuthService', () => {
  const prismaMock = {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    refreshToken: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  } as unknown as PrismaService;

  const jwtMock = {
    signAsync: vi.fn().mockResolvedValue('mocked.jwt.token'),
    verifyAsync: vi.fn(),
    decode: vi.fn(),
  } as unknown as JwtService;

  const configMock = {
    jwtAccessSecret: 'test-access-secret-1234567890',
    jwtAccessExpiresIn: '15m',
    jwtRefreshSecret: 'test-refresh-secret-1234567890',
    jwtRefreshExpiresIn: '7d',
  } as unknown as ApiConfigService;

  const service = new AuthService(prismaMock, jwtMock, configMock);

  it('registra un usuario nuevo y devuelve tokens', async () => {
    vi.spyOn(prismaMock.user, 'findUnique').mockResolvedValue(null);
    vi.spyOn(prismaMock.user, 'create').mockResolvedValue({
      id: 'user-1',
      email: 'ada@test.com',
      name: 'Ada Lovelace',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);
    vi.spyOn(prismaMock.refreshToken, 'create').mockResolvedValue({} as never);

    const result = await service.register({
      email: 'ada@test.com',
      password: 'password123',
      name: 'Ada Lovelace',
    });

    expect(result.accessToken).toBe('mocked.jwt.token');
    expect(result.user.email).toBe('ada@test.com');
  });

  it('lanza ConflictException si el email ya existe', async () => {
    vi.spyOn(prismaMock.user, 'findUnique').mockResolvedValue({ id: 'user-1' } as never);

    await expect(
      service.register({ email: 'ada@test.com', password: 'password123', name: 'Ada' }),
    ).rejects.toThrow(ConflictException);
  });

  it('inicia sesion correctamente con credenciales validas', async () => {
    const passwordHash = await argon2.hash('password123', { type: argon2.argon2id });
    vi.spyOn(prismaMock.user, 'findUnique').mockResolvedValue({
      id: 'user-1',
      email: 'ada@test.com',
      name: 'Ada',
      passwordHash,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.spyOn(prismaMock.refreshToken, 'create').mockResolvedValue({} as never);

    const result = await service.login({ email: 'ada@test.com', password: 'password123' });
    expect(result.accessToken).toBe('mocked.jwt.token');
    expect(result.user.id).toBe('user-1');
  });

  it('lanza UnauthorizedException si la contrasena no coincide', async () => {
    const passwordHash = await argon2.hash('correct_password', { type: argon2.argon2id });
    vi.spyOn(prismaMock.user, 'findUnique').mockResolvedValue({
      id: 'user-1',
      email: 'ada@test.com',
      passwordHash,
    } as never);

    await expect(
      service.login({ email: 'ada@test.com', password: 'wrong_password' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('detecta reutilizacion de token revocado e invalida toda la familia', async () => {
    vi.spyOn(jwtMock, 'verifyAsync').mockResolvedValue({
      sub: 'user-1',
      jti: 'token-revoked',
      familyId: 'family-1',
    });

    vi.spyOn(prismaMock.refreshToken, 'findUnique').mockResolvedValue({
      id: 'token-revoked',
      isRevoked: true,
      familyId: 'family-1',
    } as never);

    const updateManySpy = vi
      .spyOn(prismaMock.refreshToken, 'updateMany')
      .mockResolvedValue({ count: 2 });

    await expect(service.refreshToken('some.token')).rejects.toThrow(UnauthorizedException);
    expect(updateManySpy).toHaveBeenCalledWith({
      where: { familyId: 'family-1' },
      data: { isRevoked: true },
    });
  });
});
