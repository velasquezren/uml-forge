import { ApiProperty } from '@nestjs/swagger';
import { ProjectRole } from '@prisma/client';
import { IsEmail, IsEnum, IsNotEmpty } from 'class-validator';

export class AddMemberDto {
  @ApiProperty({
    example: 'colaborador@umlforge.dev',
    description: 'Correo electronico del usuario a invitar',
  })
  @IsEmail({}, { message: 'El correo electronico no es valido' })
  @IsNotEmpty({ message: 'El correo electronico es obligatorio' })
  email!: string;

  @ApiProperty({
    enum: ProjectRole,
    default: ProjectRole.VIEWER,
    description: 'Rol asignado al colaborador',
  })
  @IsEnum(ProjectRole, { message: 'El rol debe ser OWNER, EDITOR o VIEWER' })
  role!: ProjectRole;
}

export class UpdateMemberRoleDto {
  @ApiProperty({ enum: ProjectRole, description: 'Nuevo rol del colaborador' })
  @IsEnum(ProjectRole, { message: 'El rol debe ser OWNER, EDITOR o VIEWER' })
  role!: ProjectRole;
}
