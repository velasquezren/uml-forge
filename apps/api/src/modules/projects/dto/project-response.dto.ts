import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProjectRole } from '@prisma/client';
import { UserProfileDto } from '../../auth/dto/user-profile.dto';
import { ProjectMemberResponseDto } from './project-member-response.dto';

export class ProjectResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'ID del proyecto' })
  id!: string;

  @ApiProperty({ example: 'Sistema de Veterinaria', description: 'Nombre del proyecto' })
  name!: string;

  @ApiPropertyOptional({ example: 'Diagrama de clases', description: 'Descripcion del proyecto' })
  description!: string | null;

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'ID del usuario propietario',
  })
  ownerId!: string;

  @ApiProperty({ type: () => UserProfileDto, description: 'Datos del propietario' })
  owner!: UserProfileDto;

  @ApiProperty({
    enum: ProjectRole,
    example: ProjectRole.OWNER,
    description: 'Rol del usuario solicitante en este proyecto',
  })
  currentUserRole!: ProjectRole;

  @ApiPropertyOptional({
    type: () => [ProjectMemberResponseDto],
    description: 'Lista de miembros colaboradores',
  })
  members?: ProjectMemberResponseDto[];

  @ApiProperty({ example: '2026-08-30T00:00:00.000Z', description: 'Fecha de creacion' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-08-30T00:00:00.000Z', description: 'Fecha de ultima modificacion' })
  updatedAt!: Date;
}
