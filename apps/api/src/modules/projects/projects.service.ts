import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ProjectRole } from '@prisma/client';
import { createEmptyModel, toYDoc } from '@uml-forge/uml-core';
import * as Y from 'yjs';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectResponseDto } from './dto/project-response.dto';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateProjectDto): Promise<ProjectResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, createdAt: true, updatedAt: true },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const emptyModel = createEmptyModel(dto.name);
    const ydoc = toYDoc(emptyModel);
    const encodedState = Buffer.from(Y.encodeStateAsUpdate(ydoc));

    const project = await this.prisma.project.create({
      data: {
        name: dto.name,
        description: dto.description ?? null,
        ownerId: userId,
        members: {
          create: {
            userId,
            role: ProjectRole.OWNER,
          },
        },
        ydocState: {
          create: {
            state: encodedState,
            version: 1,
          },
        },
      },
      include: {
        owner: {
          select: { id: true, email: true, name: true, createdAt: true, updatedAt: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, email: true, name: true, createdAt: true, updatedAt: true },
            },
          },
        },
      },
    });

    return {
      id: project.id,
      name: project.name,
      description: project.description,
      ownerId: project.ownerId,
      owner: project.owner,
      currentUserRole: ProjectRole.OWNER,
      members: project.members.map((m) => ({
        id: m.id,
        projectId: m.projectId,
        userId: m.userId,
        role: m.role,
        user: m.user,
        createdAt: m.createdAt,
      })),
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };
  }

  async findAllForUser(userId: string): Promise<ProjectResponseDto[]> {
    const projects = await this.prisma.project.findMany({
      where: {
        OR: [{ ownerId: userId }, { members: { some: { userId } } }],
      },
      include: {
        owner: {
          select: { id: true, email: true, name: true, createdAt: true, updatedAt: true },
        },
        members: {
          where: { userId },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return projects.map((p) => {
      let role: ProjectRole = ProjectRole.VIEWER;
      if (p.ownerId === userId) {
        role = ProjectRole.OWNER;
      } else if (p.members.length > 0 && p.members[0]) {
        role = p.members[0].role;
      }

      return {
        id: p.id,
        name: p.name,
        description: p.description,
        ownerId: p.ownerId,
        owner: p.owner,
        currentUserRole: role,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      };
    });
  }

  async findOne(id: string, userId: string): Promise<ProjectResponseDto> {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        owner: {
          select: { id: true, email: true, name: true, createdAt: true, updatedAt: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, email: true, name: true, createdAt: true, updatedAt: true },
            },
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Proyecto no encontrado');
    }

    let role: ProjectRole | null = null;
    if (project.ownerId === userId) {
      role = ProjectRole.OWNER;
    } else {
      const member = project.members.find((m) => m.userId === userId);
      if (member) {
        role = member.role;
      }
    }

    if (!role) {
      throw new ForbiddenException('No tienes acceso a este proyecto');
    }

    return {
      id: project.id,
      name: project.name,
      description: project.description,
      ownerId: project.ownerId,
      owner: project.owner,
      currentUserRole: role,
      members: project.members.map((m) => ({
        id: m.id,
        projectId: m.projectId,
        userId: m.userId,
        role: m.role,
        user: m.user,
        createdAt: m.createdAt,
      })),
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };
  }

  async update(id: string, userId: string, dto: UpdateProjectDto): Promise<ProjectResponseDto> {
    await this.findOne(id, userId);

    const updated = await this.prisma.project.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
      },
      include: {
        owner: {
          select: { id: true, email: true, name: true, createdAt: true, updatedAt: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, email: true, name: true, createdAt: true, updatedAt: true },
            },
          },
        },
      },
    });

    let role: ProjectRole = ProjectRole.VIEWER;
    if (updated.ownerId === userId) {
      role = ProjectRole.OWNER;
    } else {
      const m = updated.members.find((item) => item.userId === userId);
      if (m) role = m.role;
    }

    return {
      id: updated.id,
      name: updated.name,
      description: updated.description,
      ownerId: updated.ownerId,
      owner: updated.owner,
      currentUserRole: role,
      members: updated.members.map((m) => ({
        id: m.id,
        projectId: m.projectId,
        userId: m.userId,
        role: m.role,
        user: m.user,
        createdAt: m.createdAt,
      })),
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  async remove(id: string): Promise<{ message: string }> {
    await this.prisma.project.delete({ where: { id } });
    return { message: 'Proyecto eliminado exitosamente' };
  }
}
