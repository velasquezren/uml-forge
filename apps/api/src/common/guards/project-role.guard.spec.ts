import { describe, expect, it, vi } from 'vitest';
import { type ExecutionContext, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ProjectRole } from '@prisma/client';
import { ProjectRoleGuard } from './project-role.guard';
import { type PrismaService } from '../../prisma/prisma.service';

describe('ProjectRoleGuard', () => {
  const reflector = new Reflector();
  const prismaMock = {
    project: {
      findUnique: vi.fn(),
    },
  } as unknown as PrismaService;

  const guard = new ProjectRoleGuard(reflector, prismaMock);

  const createMockContext = (
    user: { id: string; email: string; name: string } | null,
    params: { id?: string; projectId?: string } = {},
  ): ExecutionContext => {
    return {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ user, params }),
      }),
    } as unknown as ExecutionContext;
  };

  it('permite acceso si no hay roles requeridos en la ruta', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const ctx = createMockContext({ id: 'user-1', email: 'test@dev.com', name: 'Test' });

    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
  });

  it('lanza ForbiddenException si el usuario no esta autenticado', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([ProjectRole.OWNER]);
    const ctx = createMockContext(null, { id: 'proj-1' });

    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('lanza NotFoundException si el proyecto no existe', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([ProjectRole.VIEWER]);
    vi.spyOn(prismaMock.project, 'findUnique').mockResolvedValue(null);
    const ctx = createMockContext(
      { id: 'user-1', email: 'test@dev.com', name: 'Test' },
      { id: 'proj-1' },
    );

    await expect(guard.canActivate(ctx)).rejects.toThrow(NotFoundException);
  });

  it('permite acceso al OWNER cuando se requiere VIEWER o EDITOR', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([ProjectRole.EDITOR]);
    vi.spyOn(prismaMock.project, 'findUnique').mockResolvedValue({
      id: 'proj-1',
      ownerId: 'user-1',
      members: [],
    } as never);
    const ctx = createMockContext(
      { id: 'user-1', email: 'test@dev.com', name: 'Test' },
      { id: 'proj-1' },
    );

    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
  });

  it('rechaza con ForbiddenException a un VIEWER cuando se requiere EDITOR', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([ProjectRole.EDITOR]);
    vi.spyOn(prismaMock.project, 'findUnique').mockResolvedValue({
      id: 'proj-1',
      ownerId: 'owner-id',
      members: [{ role: ProjectRole.VIEWER }],
    } as never);
    const ctx = createMockContext(
      { id: 'user-1', email: 'test@dev.com', name: 'Test' },
      { id: 'proj-1' },
    );

    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });
});
