import { describe, expect, it, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { type PrismaService } from '../../prisma/prisma.service';

describe('UsersService', () => {
  const prismaMock = {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  } as unknown as PrismaService;

  const service = new UsersService(prismaMock);

  it('retorna el perfil de usuario si existe', async () => {
    const mockUser = {
      id: 'user-1',
      email: 'user@test.com',
      name: 'Usuario Test',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    vi.spyOn(prismaMock.user, 'findUnique').mockResolvedValue(mockUser as never);

    const result = await service.findById('user-1');
    expect(result.id).toBe('user-1');
    expect(result.email).toBe('user@test.com');
  });

  it('lanza NotFoundException si el usuario no existe', async () => {
    vi.spyOn(prismaMock.user, 'findUnique').mockResolvedValue(null);

    await expect(service.findById('non-existent')).rejects.toThrow(NotFoundException);
  });

  it('actualiza el perfil del usuario', async () => {
    vi.spyOn(prismaMock.user, 'findUnique').mockResolvedValue({ id: 'user-1' } as never);
    vi.spyOn(prismaMock.user, 'update').mockResolvedValue({
      id: 'user-1',
      email: 'user@test.com',
      name: 'Nuevo Nombre',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    const updated = await service.updateProfile('user-1', { name: 'Nuevo Nombre' });
    expect(updated.name).toBe('Nuevo Nombre');
  });
});
