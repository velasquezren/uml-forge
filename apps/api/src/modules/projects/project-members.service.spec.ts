import { describe, expect, it, vi } from 'vitest';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { ProjectRole } from '@prisma/client';
import { ProjectMembersService } from './project-members.service';
import { type PrismaService } from '../../prisma/prisma.service';

describe('ProjectMembersService', () => {
  const prismaMock = {
    user: { findUnique: vi.fn() },
    project: {
      findUnique: vi.fn(),
    },
    projectMember: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  } as unknown as PrismaService;

  const service = new ProjectMembersService(prismaMock);

  it('anade un miembro con rol al proyecto', async () => {
    vi.spyOn(prismaMock.user, 'findUnique').mockResolvedValue({
      id: 'user-2',
      email: 'editor@test.com',
      name: 'Editor',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    vi.spyOn(prismaMock.project, 'findUnique').mockResolvedValue({
      id: 'proj-1',
      ownerId: 'user-1',
      members: [],
    } as never);

    vi.spyOn(prismaMock.projectMember, 'create').mockResolvedValue({
      id: 'member-1',
      projectId: 'proj-1',
      userId: 'user-2',
      role: ProjectRole.EDITOR,
      user: {
        id: 'user-2',
        email: 'editor@test.com',
        name: 'Editor',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    const member = await service.addMember('proj-1', {
      email: 'editor@test.com',
      role: ProjectRole.EDITOR,
    });

    expect(member.userId).toBe('user-2');
    expect(member.role).toBe(ProjectRole.EDITOR);
  });

  it('lanza ConflictException al anadir al propio propietario como miembro colaborador', async () => {
    vi.spyOn(prismaMock.user, 'findUnique').mockResolvedValue({
      id: 'user-1',
      email: 'owner@test.com',
    } as never);

    vi.spyOn(prismaMock.project, 'findUnique').mockResolvedValue({
      id: 'proj-1',
      ownerId: 'user-1',
      members: [],
    } as never);

    await expect(
      service.addMember('proj-1', { email: 'owner@test.com', role: ProjectRole.EDITOR }),
    ).rejects.toThrow(ConflictException);
  });

  it('lanza BadRequestException al intentar cambiar rol del propietario', async () => {
    vi.spyOn(prismaMock.project, 'findUnique').mockResolvedValue({
      id: 'proj-1',
      ownerId: 'user-1',
    } as never);

    await expect(
      service.updateMemberRole('proj-1', 'user-1', { role: ProjectRole.VIEWER }),
    ).rejects.toThrow(BadRequestException);
  });

  it('lanza NotFoundException al intentar modificar un miembro inexistente', async () => {
    vi.spyOn(prismaMock.project, 'findUnique').mockResolvedValue({
      id: 'proj-1',
      ownerId: 'user-owner',
    } as never);
    vi.spyOn(prismaMock.projectMember, 'findUnique').mockResolvedValue(null);

    await expect(
      service.updateMemberRole('proj-1', 'user-unknown', { role: ProjectRole.VIEWER }),
    ).rejects.toThrow(NotFoundException);
  });
});
