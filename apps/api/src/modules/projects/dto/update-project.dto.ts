import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateProjectDto {
  @ApiPropertyOptional({
    example: 'Sistema de Veterinaria v2',
    description: 'Nombre actualizado del proyecto',
  })
  @IsOptional()
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @MaxLength(100, { message: 'El nombre no puede exceder los 100 caracteres' })
  name?: string;

  @ApiPropertyOptional({
    example: 'Nueva descripcion ampliada',
    description: 'Descripcion actualizada',
  })
  @IsOptional()
  @IsString({ message: 'La descripcion debe ser una cadena de texto' })
  @MaxLength(500, { message: 'La descripcion no puede exceder los 500 caracteres' })
  description?: string;
}
