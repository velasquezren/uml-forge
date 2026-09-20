import { describe, expect, it, vi } from 'vitest';
import { ProjectRole } from '@prisma/client';
import { ProjectsService } from './projects.service';
import { type PrismaService } from '../../prisma/prisma.service';

describe('ProjectsService', () => {
  const prismaMock = {
    user: { findUnique: vi.fn() },
    project: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  } as unknown as PrismaService;

  const service = new ProjectsService(prismaMock);

  it('crea un proyecto con estado inicial y membresia de propietario', async () => {
    vi.spyOn(prismaMock.user, 'findUnique').mockResolvedValue({
      id: 'user-1',
      email: 'owner@test.com',
      name: 'Owner',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    vi.spyOn(prismaMock.project, 'create').mockResolvedValue({
      id: 'proj-1',
      name: 'Veterinaria',
      description: 'Desc',
      ownerId: 'user-1',
      owner: {
        id: 'user-1',
        email: 'owner@test.com',
        name: 'Owner',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      members: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    const project = await service.create('user-1', { name: 'Veterinaria', description: 'Desc' });
    expect(project.id).toBe('proj-1');
    expect(project.currentUserRole).toBe(ProjectRole.OWNER);
  });

  it('lista los proyectos del usuario', async () => {
    vi.spyOn(prismaMock.project, 'findMany').mockResolvedValue([
      {
        id: 'proj-1',
        name: 'Veterinaria',
        description: null,
        ownerId: 'user-1',
        owner: {
          id: 'user-1',
          email: 'owner@test.com',
          name: 'Owner',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        members: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ] as never);

    const projects = await service.findAllForUser('user-1');
    expect(projects).toHaveLength(1);
    expect(projects[0]?.name).toBe('Veterinaria');
  });

  it('elimina un proyecto exitosamente', async () => {
    vi.spyOn(prismaMock.project, 'delete').mockResolvedValue({ id: 'proj-1' } as never);

    const result = await service.remove('proj-1');
    expect(result.message).toMatch(/eliminado/i);
  });
});
