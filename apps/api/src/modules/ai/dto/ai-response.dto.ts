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
    description: 'Modelo de lenguaje configurado',
    example: 'gemini-2.5-flash',
  })
  model!: string;
}
