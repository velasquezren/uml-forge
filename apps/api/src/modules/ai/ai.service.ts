import { Injectable, Logger } from '@nestjs/common';
import { ApiConfigService } from '../../config/config.service';
import type { AiResponseDto, AiStatusDto } from './dto/ai-response.dto';
import type { GenerateImageDto } from './dto/generate-image.dto';
import type { GeneratePromptDto } from './dto/generate-prompt.dto';
import type { RefineModelDto } from './dto/refine-model.dto';
import type { AiProvider } from './interfaces/ai-provider.interface';
import { GeminiProvider } from './providers/gemini.provider';
import { OllamaProvider } from './providers/ollama.provider';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly config: ApiConfigService,
    private readonly geminiProvider: GeminiProvider,
    private readonly ollamaProvider: OllamaProvider,
  ) {}

  getActiveProvider(): AiProvider {
    const configured = this.config.aiProvider;
    return configured === 'gemini' ? this.geminiProvider : this.ollamaProvider;
  }

  getSecondaryProvider(): AiProvider {
    const configured = this.config.aiProvider;
    return configured === 'gemini' ? this.ollamaProvider : this.geminiProvider;
  }

  async getStatus(): Promise<AiStatusDto> {
    const primary = this.getActiveProvider();
    if (await primary.isAvailable()) {
      const model =
        primary.providerName === 'gemini' ? this.config.geminiModel : this.config.ollamaModel;
      return {
        provider: primary.providerName,
        available: true,
        model,
      };
    }

    const secondary = this.getSecondaryProvider();
    if (await secondary.isAvailable()) {
      const model =
        secondary.providerName === 'gemini' ? this.config.geminiModel : this.config.ollamaModel;
      return {
        provider: secondary.providerName,
        available: true,
        model,
      };
    }

    const model =
      this.config.aiProvider === 'gemini' ? this.config.geminiModel : this.config.ollamaModel;
    return {
      provider: primary.providerName,
      available: false,
      model,
    };
  }

  async generateFromPrompt(dto: GeneratePromptDto): Promise<AiResponseDto> {
    const primary = this.getActiveProvider();
    const secondary = this.getSecondaryProvider();

    try {
      if (await primary.isAvailable()) {
        const result = await primary.generateFromPrompt(dto.prompt, dto.currentModel);
        return {
          explanation: result.explanation,
          operations: [...result.operations],
        };
      }
    } catch (primaryError) {
      this.logger.warn(
        `Fallo el proveedor primario ${primary.providerName}, intentando respaldo con ${secondary.providerName}: ${String(primaryError)}`,
      );
    }

    if (await secondary.isAvailable()) {
      const result = await secondary.generateFromPrompt(dto.prompt, dto.currentModel);
      return {
        explanation: `[Respaldo ${secondary.providerName}] ${result.explanation}`,
        operations: [...result.operations],
      };
    }

    // Si ningun proveedor esta configurado, devolver respuesta vacia con mensaje informativo
    return {
      explanation:
        'No hay ningun proveedor de IA disponible (verifique GEMINI_API_KEY o el servicio Ollama).',
      operations: [],
    };
  }

  async generateFromImage(dto: GenerateImageDto): Promise<AiResponseDto> {
    const primary = this.getActiveProvider();
    const secondary = this.getSecondaryProvider();
    const buffer = Buffer.from(dto.imageBase64, 'base64');
    const mime = dto.mimeType || 'image/png';

    try {
      if (await primary.isAvailable()) {
        const result = await primary.generateFromImage(buffer, mime, dto.prompt, dto.currentModel);
        return {
          explanation: result.explanation,
          operations: [...result.operations],
        };
      }
    } catch (primaryError) {
      this.logger.warn(
        `Fallo el proveedor primario ${primary.providerName} en imagen, intentando respaldo con ${secondary.providerName}: ${String(primaryError)}`,
      );
    }

    if (await secondary.isAvailable()) {
      const result = await secondary.generateFromImage(buffer, mime, dto.prompt, dto.currentModel);
      return {
        explanation: `[Respaldo ${secondary.providerName}] ${result.explanation}`,
        operations: [...result.operations],
      };
    }

    return {
      explanation: 'No hay ningun proveedor de IA disponible para vision multimodal.',
      operations: [],
    };
  }

  async refineModel(dto: RefineModelDto): Promise<AiResponseDto> {
    const primary = this.getActiveProvider();
    const secondary = this.getSecondaryProvider();

    try {
      if (await primary.isAvailable()) {
        const result = await primary.suggestRefinements(dto.model, dto.context);
        return {
          explanation: result.explanation,
          operations: [...result.operations],
        };
      }
    } catch (primaryError) {
      this.logger.warn(
        `Fallo el proveedor primario ${primary.providerName} en refinamiento: ${String(primaryError)}`,
      );
    }

    if (await secondary.isAvailable()) {
      const result = await secondary.suggestRefinements(dto.model, dto.context);
      return {
        explanation: `[Respaldo ${secondary.providerName}] ${result.explanation}`,
        operations: [...result.operations],
      };
    }

    return {
      explanation: 'No hay proveedor de IA disponible para auditar el modelo.',
      operations: [],
    };
  }
}
