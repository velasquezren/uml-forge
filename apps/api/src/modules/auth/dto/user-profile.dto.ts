import { ApiProperty } from '@nestjs/swagger';

export class UserProfileDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Identificador unico del usuario',
  })
  id!: string;

  @ApiProperty({ example: 'usuario@umlforge.dev', description: 'Correo electronico' })
  email!: string;

  @ApiProperty({ example: 'Ada Lovelace', description: 'Nombre del usuario' })
  name!: string;

  @ApiProperty({
    example: '2026-08-30T00:00:00.000Z',
    description: 'Fecha de creacion de la cuenta',
  })
  createdAt!: Date;

  @ApiProperty({
    example: '2026-08-30T00:00:00.000Z',
    description: 'Fecha de ultima actualizacion',
  })
  updatedAt!: Date;
}
