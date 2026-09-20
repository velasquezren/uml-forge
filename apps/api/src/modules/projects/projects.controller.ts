import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ProjectRole } from '@prisma/client';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../common/decorators/current-user.decorator';
import { RequireProjectRoles } from '../../common/decorators/project-role.decorator';
import { ProjectRoleGuard } from '../../common/guards/project-role.guard';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { AddMemberDto, UpdateMemberRoleDto } from './dto/add-member.dto';
import { ProjectResponseDto } from './dto/project-response.dto';
import { ProjectMemberResponseDto } from './dto/project-member-response.dto';
import { MessageResponseDto } from '../auth/dto/auth-response.dto';
import { ProjectsService } from './projects.service';
import { ProjectMembersService } from './project-members.service';

@ApiTags('Proyectos')
@ApiBearerAuth('JWT')
@Controller('projects')
export class ProjectsController {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly projectMembersService: ProjectMembersService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear un nuevo proyecto UML' })
  @ApiResponse({ status: 201, description: 'Proyecto creado', type: ProjectResponseDto })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateProjectDto,
  ): Promise<ProjectResponseDto> {
    return this.projectsService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos los proyectos donde el usuario es propietario o miembro' })
  @ApiResponse({ status: 200, description: 'Lista de proyectos', type: [ProjectResponseDto] })
  async findAll(@CurrentUser() user: AuthenticatedUser): Promise<ProjectResponseDto[]> {
    return this.projectsService.findAllForUser(user.id);
  }

  @Get(':id')
  @RequireProjectRoles(ProjectRole.VIEWER)
  @UseGuards(ProjectRoleGuard)
  @ApiOperation({ summary: 'Obtener detalles de un proyecto por ID' })
  @ApiResponse({ status: 200, description: 'Detalle del proyecto', type: ProjectResponseDto })
  @ApiResponse({ status: 403, description: 'Permisos insuficientes' })
  @ApiResponse({ status: 404, description: 'Proyecto no encontrado' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ProjectResponseDto> {
    return this.projectsService.findOne(id, user.id);
  }

  @Patch(':id')
  @RequireProjectRoles(ProjectRole.EDITOR)
  @UseGuards(ProjectRoleGuard)
  @ApiOperation({ summary: 'Actualizar nombre o descripcion del proyecto' })
  @ApiResponse({ status: 200, description: 'Proyecto actualizado', type: ProjectResponseDto })
  @ApiResponse({ status: 403, description: 'Permisos insuficientes (requiere EDITOR u OWNER)' })
  @ApiResponse({ status: 404, description: 'Proyecto no encontrado' })
  async update(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProjectDto,
  ): Promise<ProjectResponseDto> {
    return this.projectsService.update(id, user.id, dto);
  }

  @Delete(':id')
  @RequireProjectRoles(ProjectRole.OWNER)
  @UseGuards(ProjectRoleGuard)
  @ApiOperation({ summary: 'Eliminar proyecto (solo el propietario)' })
  @ApiResponse({ status: 200, description: 'Proyecto eliminado', type: MessageResponseDto })
  @ApiResponse({ status: 403, description: 'Permisos insuficientes (requiere OWNER)' })
  @ApiResponse({ status: 404, description: 'Proyecto no encontrado' })
  async remove(@Param('id') id: string): Promise<MessageResponseDto> {
    return this.projectsService.remove(id);
  }

  @Post(':id/members')
  @RequireProjectRoles(ProjectRole.OWNER)
  @UseGuards(ProjectRoleGuard)
  @ApiOperation({ summary: 'Agregar un colaborador al proyecto' })
  @ApiResponse({ status: 201, description: 'Miembro anadido', type: ProjectMemberResponseDto })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  @ApiResponse({ status: 409, description: 'El usuario ya es miembro' })
  async addMember(
    @Param('id') id: string,
    @Body() dto: AddMemberDto,
  ): Promise<ProjectMemberResponseDto> {
    return this.projectMembersService.addMember(id, dto);
  }

  @Patch(':id/members/:userId')
  @RequireProjectRoles(ProjectRole.OWNER)
  @UseGuards(ProjectRoleGuard)
  @ApiOperation({ summary: 'Actualizar rol de un miembro en el proyecto' })
  @ApiResponse({ status: 200, description: 'Rol actualizado', type: ProjectMemberResponseDto })
  @ApiResponse({ status: 400, description: 'No se puede modificar al propietario' })
  @ApiResponse({ status: 404, description: 'Membresia no encontrada' })
  async updateMemberRole(
    @Param('id') id: string,
    @Param('userId') targetUserId: string,
    @Body() dto: UpdateMemberRoleDto,
  ): Promise<ProjectMemberResponseDto> {
    return this.projectMembersService.updateMemberRole(id, targetUserId, dto);
  }

  @Delete(':id/members/:userId')
  @RequireProjectRoles(ProjectRole.OWNER)
  @UseGuards(ProjectRoleGuard)
  @ApiOperation({ summary: 'Eliminar un miembro del proyecto' })
  @ApiResponse({ status: 200, description: 'Miembro eliminado', type: MessageResponseDto })
  @ApiResponse({ status: 400, description: 'No se puede eliminar al propietario' })
  @ApiResponse({ status: 404, description: 'Membresia no encontrada' })
  async removeMember(
    @Param('id') id: string,
    @Param('userId') targetUserId: string,
  ): Promise<MessageResponseDto> {
    return this.projectMembersService.removeMember(id, targetUserId);
  }
}
