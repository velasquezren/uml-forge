import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AiService } from './ai.service';
import { AiResponseDto, AiStatusDto } from './dto/ai-response.dto';
import { GenerateImageDto } from './dto/generate-image.dto';
import { GeneratePromptDto } from './dto/generate-prompt.dto';
import { RefineModelDto } from './dto/refine-model.dto';

@ApiTags('ai')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Get('status')
  @ApiOperation({ summary: 'Consultar estado y disponibilidad del proveedor de IA' })
  @ApiResponse({ status: 200, description: 'Estado del motor de IA', type: AiStatusDto })
  async getStatus(): Promise<AiStatusDto> {
    return this.aiService.getStatus();
  }

  @Post('generate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generar operaciones UML a partir de instrucciones en lenguaje natural',
  })
  @ApiResponse({
    status: 200,
    description: 'Operaciones generadas con explicacion',
    type: AiResponseDto,
  })
  async generateFromPrompt(@Body() dto: GeneratePromptDto): Promise<AiResponseDto> {
    return this.aiService.generateFromPrompt(dto);
  }

  @Post('image')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Interpretar diagramas o bocetos en imagen y generar operaciones UML' })
  @ApiResponse({
    status: 200,
    description: 'Operaciones extraidas del boceto con explicacion',
    type: AiResponseDto,
  })
  async generateFromImage(@Body() dto: GenerateImageDto): Promise<AiResponseDto> {
    return this.aiService.generateFromImage(dto);
  }

  @Post('refine')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Auditar y sugerir refinamientos sobre un modelo UML existente' })
  @ApiResponse({
    status: 200,
    description: 'Sugerencias y operaciones de refinamiento',
    type: AiResponseDto,
  })
  async refineModel(@Body() dto: RefineModelDto): Promise<AiResponseDto> {
    return this.aiService.refineModel(dto);
  }
}
