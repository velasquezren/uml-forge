import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ProjectRole } from '@prisma/client';
import { PROJECT_ROLES_KEY } from '../constants/roles';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../decorators/current-user.decorator';

@Injectable()
export class ProjectRoleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<ProjectRole[]>(PROJECT_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      user?: AuthenticatedUser;
      params?: { id?: string; projectId?: string };
    }>();

    const user = request.user;
    if (!user) {
      throw new ForbiddenException('Usuario no autenticado');
    }

    const projectId = request.params?.id ?? request.params?.projectId;
    if (!projectId) {
      return true;
    }

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: {
          where: { userId: user.id },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Proyecto no encontrado');
    }

    let userRole: ProjectRole | null = null;
    if (project.ownerId === user.id) {
      userRole = ProjectRole.OWNER;
    } else if (project.members.length > 0 && project.members[0]) {
      userRole = project.members[0].role;
    }

    if (!userRole) {
      throw new ForbiddenException('No tienes acceso a este proyecto');
    }

    const roleRank: Record<ProjectRole, number> = {
      [ProjectRole.VIEWER]: 1,
      [ProjectRole.EDITOR]: 2,
      [ProjectRole.OWNER]: 3,
    };

    const minRequiredRank = Math.min(...requiredRoles.map((role) => roleRank[role] ?? 1));

    const userRank = roleRank[userRole] ?? 0;
    if (userRank < minRequiredRank) {
      throw new ForbiddenException('Permisos insuficientes en este proyecto');
    }

    return true;
  }
}
