import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';
import type { UMLModel } from '@uml-forge/uml-core';

export class RefineModelDto {
  @ApiProperty({
    description: 'Modelo UML completo a refinar o auditar arquitectonicamente',
  })
  @IsObject()
  @IsNotEmpty()
  model!: UMLModel;

  @ApiPropertyOptional({
    description: 'Objetivo de refinamiento o contexto de negocio especifico',
    example: 'Asegura que todas las entidades tengan claves primarias y campos de auditoria',
  })
  @IsString()
  @IsOptional()
  context?: string;
}
