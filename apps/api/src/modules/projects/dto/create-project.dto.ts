import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateProjectDto {
  @ApiProperty({ example: 'Sistema de Veterinaria', description: 'Nombre del proyecto UML' })
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @MaxLength(100, { message: 'El nombre no puede exceder los 100 caracteres' })
  name!: string;

  @ApiPropertyOptional({
    example: 'Diagrama de clases para gestion de mascotas y duenos',
    description: 'Descripcion del proyecto',
  })
  @IsOptional()
  @IsString({ message: 'La descripcion debe ser una cadena de texto' })
  @MaxLength(500, { message: 'La descripcion no puede exceder los 500 caracteres' })
  description?: string;
}
