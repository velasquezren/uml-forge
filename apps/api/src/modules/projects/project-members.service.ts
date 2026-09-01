import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AddMemberDto, UpdateMemberRoleDto } from './dto/add-member.dto';
import { ProjectMemberResponseDto } from './dto/project-member-response.dto';

@Injectable()
export class ProjectMembersService {
  constructor(private readonly prisma: PrismaService) {}

  async addMember(projectId: string, dto: AddMemberDto): Promise<ProjectMemberResponseDto> {
    const targetUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      select: { id: true, email: true, name: true, createdAt: true, updatedAt: true },
    });

    if (!targetUser) {
      throw new NotFoundException('No existe ningun usuario con ese correo electronico');
    }

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { members: true },
    });

    if (!project) {
      throw new NotFoundException('Proyecto no encontrado');
    }

    if (project.ownerId === targetUser.id) {
      throw new ConflictException('El usuario ya es el propietario del proyecto');
    }

    const existingMember = project.members.find((m) => m.userId === targetUser.id);
    if (existingMember) {
      throw new ConflictException('El usuario ya es miembro de este proyecto');
    }

    const member = await this.prisma.projectMember.create({
      data: {
        projectId,
        userId: targetUser.id,
        role: dto.role,
      },
      include: {
        user: {
          select: { id: true, email: true, name: true, createdAt: true, updatedAt: true },
        },
      },
    });

    return {
      id: member.id,
      projectId: member.projectId,
      userId: member.userId,
      role: member.role,
      user: member.user,
      createdAt: member.createdAt,
    };
  }

  async updateMemberRole(
    projectId: string,
    targetUserId: string,
    dto: UpdateMemberRoleDto,
  ): Promise<ProjectMemberResponseDto> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Proyecto no encontrado');
    }

    if (project.ownerId === targetUserId) {
      throw new BadRequestException('No se puede modificar el rol del propietario');
    }

    const member = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId: targetUserId,
        },
      },
    });

    if (!member) {
      throw new NotFoundException('El usuario no es miembro de este proyecto');
    }

    const updated = await this.prisma.projectMember.update({
      where: { id: member.id },
      data: { role: dto.role },
      include: {
        user: {
          select: { id: true, email: true, name: true, createdAt: true, updatedAt: true },
        },
      },
    });

    return {
      id: updated.id,
      projectId: updated.projectId,
      userId: updated.userId,
      role: updated.role,
      user: updated.user,
      createdAt: updated.createdAt,
    };
  }

  async removeMember(projectId: string, targetUserId: string): Promise<{ message: string }> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Proyecto no encontrado');
    }

    if (project.ownerId === targetUserId) {
      throw new BadRequestException('No se puede eliminar al propietario del proyecto');
    }

    const member = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId: targetUserId,
        },
      },
    });

    if (!member) {
      throw new NotFoundException('El usuario no es miembro de este proyecto');
    }

    await this.prisma.projectMember.delete({
      where: { id: member.id },
    });

    return { message: 'Miembro eliminado exitosamente del proyecto' };
  }
}
