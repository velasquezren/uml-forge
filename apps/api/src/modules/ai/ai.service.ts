import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ApiConfigService } from '../../config/config.service';
import type { AiResponseDto, AiStatusDto } from './dto/ai-response.dto';
import type { GenerateImageDto } from './dto/generate-image.dto';
import type { GeneratePromptDto } from './dto/generate-prompt.dto';
import type { RefineModelDto } from './dto/refine-model.dto';
import type { AiGenerationResult, AiProvider } from './interfaces/ai-provider.interface';
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
    for (const provider of [this.getActiveProvider(), this.getSecondaryProvider()]) {
      if (await provider.isAvailable()) {
        return this.describe(provider, true);
      }
    }
    return this.describe(this.getActiveProvider(), false);
  }

  private async describe(provider: AiProvider, available: boolean): Promise<AiStatusDto> {
    const isOllama = provider.providerName === 'ollama';
    const visionAvailable =
      available && (isOllama ? await this.ollamaProvider.isVisionAvailable() : true);
    return {
      provider: provider.providerName,
      available,
      model: isOllama ? this.config.ollamaModel : this.config.geminiModel,
      visionModel: isOllama ? this.config.ollamaVisionModel : this.config.geminiModel,
      visionAvailable,
    };
  }

  generateFromPrompt(dto: GeneratePromptDto): Promise<AiResponseDto> {
    return this.withFallback('texto', (provider) =>
      provider.generateFromPrompt(dto.prompt, dto.currentModel),
    );
  }

  generateFromImage(dto: GenerateImageDto): Promise<AiResponseDto> {
    const buffer = Buffer.from(dto.imageBase64, 'base64');
    const mime = dto.mimeType || 'image/png';
    return this.withFallback('imagen', (provider) =>
      provider.generateFromImage(buffer, mime, dto.prompt, dto.currentModel),
    );
  }

  refineModel(dto: RefineModelDto): Promise<AiResponseDto> {
    return this.withFallback('refinamiento', (provider) =>
      provider.suggestRefinements(dto.model, dto.context),
    );
  }

  /**
   * Intenta el proveedor configurado y, si falla o no esta disponible, el de
   * respaldo. Si ninguno responde se devuelve un 503 con el motivo real del
   * primero (clave invalida, cuota agotada...), que es lo que la persona
   * necesita saber para arreglarlo; antes se perdia tras un mensaje generico.
   */
  private async withFallback(
    task: string,
    run: (provider: AiProvider) => Promise<AiGenerationResult>,
  ): Promise<AiResponseDto> {
    const primary = this.getActiveProvider();
    const secondary = this.getSecondaryProvider();
    let primaryError: string | null = null;

    if (await primary.isAvailable()) {
      try {
        const result = await run(primary);
        return { explanation: result.explanation, operations: [...result.operations] };
      } catch (error) {
        primaryError = error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `Fallo ${primary.providerName} (${task}); se intenta ${secondary.providerName}: ${primaryError}`,
        );
      }
    }

    if (await secondary.isAvailable()) {
      try {
        const result = await run(secondary);
        return {
          explanation: `[Respaldo ${secondary.providerName}] ${result.explanation}`,
          operations: [...result.operations],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Fallo tambien ${secondary.providerName} (${task}): ${message}`);
        primaryError ??= message;
      }
    }

    throw new ServiceUnavailableException(
      primaryError ??
        'No hay ningun proveedor de IA disponible: configura GEMINI_API_KEY o arranca Ollama.',
    );
  }
}
