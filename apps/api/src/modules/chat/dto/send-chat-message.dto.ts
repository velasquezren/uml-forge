import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class SendChatMessageDto {
  @ApiProperty({ description: 'Texto del mensaje', example: '@ia anade una clase Factura' })
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  content!: string;

  @ApiPropertyOptional({
    description: 'Pedir respuesta a la IA aunque el texto no la mencione con @ia',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  askAi?: boolean;
}
