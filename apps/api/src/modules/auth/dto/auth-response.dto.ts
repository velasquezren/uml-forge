import { ApiProperty } from '@nestjs/swagger';
import { UserProfileDto } from './user-profile.dto';

export class AuthResponseDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT Access Token de 15 minutos',
  })
  accessToken!: string;

  @ApiProperty({ type: () => UserProfileDto, description: 'Datos del usuario autenticado' })
  user!: UserProfileDto;
}

export class MessageResponseDto {
  @ApiProperty({ example: 'Operacion realizada con exito', description: 'Mensaje descriptivo' })
  message!: string;
}
