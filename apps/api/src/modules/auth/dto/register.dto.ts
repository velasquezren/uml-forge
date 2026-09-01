import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({
    example: 'usuario@umlforge.dev',
    description: 'Correo electronico unico del usuario',
  })
  @IsEmail({}, { message: 'El correo electronico no es valido' })
  @IsNotEmpty({ message: 'El correo electronico es obligatorio' })
  email!: string;

  @ApiProperty({
    example: 'ContrasenaSegura123!',
    description: 'Contrasena de acceso (minimo 8 caracteres)',
  })
  @IsString({ message: 'La contrasena debe ser una cadena de texto' })
  @MinLength(8, { message: 'La contrasena debe tener al menos 8 caracteres' })
  password!: string;

  @ApiProperty({ example: 'Ada Lovelace', description: 'Nombre completo del usuario' })
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  name!: string;
}
