import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import type { UMLModel } from '@uml-forge/uml-core';

export class GeneratePromptDto {
  @ApiProperty({
    description: 'Instruccion en lenguaje natural para generar o modificar el modelo UML',
    example: 'Crea un sistema de comercio electronico con usuarios, productos, pedidos y pagos',
  })
  @IsString()
  @IsNotEmpty()
  prompt!: string;

  @ApiPropertyOptional({
    description: 'Estado actual del modelo UML sobre el cual aplicar los cambios',
  })
  @IsOptional()
  currentModel?: UMLModel;
}
