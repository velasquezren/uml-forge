import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBase64,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

/** Imagen o nota de voz adjunta, en base64 (ADR 0044). */
export class ChatAttachmentInputDto {
  @ApiProperty({ enum: ['image', 'audio'] })
  @IsIn(['image', 'audio'])
  kind!: 'image' | 'audio';

  @ApiProperty({ example: 'audio/webm' })
  @IsString()
  @MaxLength(100)
  mimeType!: string;

  @ApiProperty({ description: 'Contenido del fichero en base64, sin prefijo data:' })
  @IsBase64()
  dataBase64!: string;

  @ApiPropertyOptional({ description: 'Duracion de la nota de voz en milisegundos' })
  @IsOptional()
  @IsInt()
  @Min(0)
  durationMs?: number;
}

export class SendChatMessageDto {
  @ApiPropertyOptional({
    description: 'Texto del mensaje; puede ir vacio si lleva adjunto',
    example: '@ia anade una clase Factura',
  })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  content?: string;

  @ApiPropertyOptional({
    description: 'Pedir respuesta a la IA aunque el texto no la mencione con @ia',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  askAi?: boolean;

  @ApiPropertyOptional({ type: ChatAttachmentInputDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ChatAttachmentInputDto)
  attachment?: ChatAttachmentInputDto;
}
