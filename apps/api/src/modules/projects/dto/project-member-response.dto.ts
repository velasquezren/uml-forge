import { ApiProperty } from '@nestjs/swagger';
import { ProjectRole } from '@prisma/client';
import { UserProfileDto } from '../../auth/dto/user-profile.dto';

export class ProjectMemberResponseDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'ID de la membresia',
  })
  id!: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'ID del proyecto' })
  projectId!: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'ID del usuario' })
  userId!: string;

  @ApiProperty({
    enum: ProjectRole,
    example: ProjectRole.EDITOR,
    description: 'Rol del usuario en el proyecto',
  })
  role!: ProjectRole;

  @ApiProperty({ type: () => UserProfileDto, description: 'Datos del usuario miembro' })
  user!: UserProfileDto;

  @ApiProperty({ example: '2026-08-30T00:00:00.000Z', description: 'Fecha de adicion al proyecto' })
  createdAt!: Date;
}
