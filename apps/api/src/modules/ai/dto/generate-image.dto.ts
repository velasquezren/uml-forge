import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import type { UMLModel } from '@uml-forge/uml-core';

export class GenerateImageDto {
  @ApiProperty({
    description: 'Imagen codificada en Base64 (boceto, diagrama manuscrito o captura)',
    example:
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  })
  @IsString()
  @IsNotEmpty()
  imageBase64!: string;

  @ApiPropertyOptional({
    description: 'Tipo MIME de la imagen (por ejemplo image/png, image/jpeg, image/webp)',
    default: 'image/png',
  })
  @IsString()
  @IsOptional()
  mimeType?: string;

  @ApiPropertyOptional({
    description: 'Instruccion textual complementaria para guiar la interpretacion del boceto',
    example: 'Identifica las clases principales y anade atributos estandar de auditoria',
  })
  @IsString()
  @IsOptional()
  prompt?: string;

  @ApiPropertyOptional({
    description: 'Estado actual del modelo UML',
  })
  @IsOptional()
  currentModel?: UMLModel;
}
