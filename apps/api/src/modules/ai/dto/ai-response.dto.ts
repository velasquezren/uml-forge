import { ApiProperty } from '@nestjs/swagger';
import type { UmlOperation } from '@uml-forge/uml-core';

export class AiResponseDto {
  @ApiProperty({
    description: 'Explicacion razonada de los cambios y decisiones de diseno propuestas',
    example:
      'Se han creado las clases User, Order y Product con relaciones de cardinalidad 1:N y N:M.',
  })
  explanation!: string;

  @ApiProperty({
    description: 'Lista ordenada de operaciones atomicas a aplicar sobre el modelo UML',
    type: 'array',
    items: { type: 'object' },
  })
  operations!: UmlOperation[];
}

export class AiStatusDto {
  @ApiProperty({
    description: 'Nombre del proveedor de IA activo',
    example: 'gemini',
  })
  provider!: string;

  @ApiProperty({
    description: 'Indica si el proveedor esta disponible para procesar peticiones',
    example: true,
  })
  available!: boolean;

  @ApiProperty({
    description: 'Modelo de lenguaje configurado para texto',
    example: 'qwen2.5:3b',
  })
  model!: string;

  @ApiProperty({
    description: 'Modelo multimodal configurado para vision e imagenes',
    example: 'llava:7b',
    required: false,
  })
  visionModel?: string;

  @ApiProperty({
    description: 'Indica si el modelo de vision esta descargado y disponible',
    example: true,
    required: false,
  })
  visionAvailable?: boolean;
}
