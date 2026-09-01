import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'usuario@umlforge.dev', description: 'Correo electronico registrado' })
  @IsEmail({}, { message: 'El correo electronico no es valido' })
  @IsNotEmpty({ message: 'El correo electronico es obligatorio' })
  email!: string;

  @ApiProperty({ example: 'ContrasenaSegura123!', description: 'Contrasena de acceso' })
  @IsString({ message: 'La contrasena debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La contrasena es obligatoria' })
  password!: string;
}
