import { Injectable, Logger } from '@nestjs/common';
import type { UMLModel } from '@uml-forge/uml-core';
import { ApiConfigService } from '../../../config/config.service';
import { formatModelContext, UML_SYSTEM_PROMPT } from '../ai-prompts';
import { mapAiOperationsToUmlOperations } from '../ai-operation-mapper';
import type { AiGenerationResult, AiProvider } from '../interfaces/ai-provider.interface';

@Injectable()
export class OllamaProvider implements AiProvider {
  readonly providerName = 'ollama';
  private readonly logger = new Logger(OllamaProvider.name);

  constructor(private readonly config: ApiConfigService) {}

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.ollamaBaseUrl}/api/tags`, {
        signal: AbortSignal.timeout(2000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async generateFromPrompt(prompt: string, currentModel?: UMLModel): Promise<AiGenerationResult> {
    const contextStr = formatModelContext(currentModel);
    const userPrompt = `${contextStr}\n\nSolicitud del usuario:\n${prompt}`;

    try {
      const response = await fetch(`${this.config.ollamaBaseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.config.ollamaModel,
          system: UML_SYSTEM_PROMPT,
          prompt: userPrompt,
          format: 'json',
          stream: false,
          options: { temperature: 0.2 },
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama respondio con status HTTP ${response.status}`);
      }

      const data = (await response.json()) as { response?: string };
      const rawText = data.response ?? '{}';
      return this.parseAiResponse(rawText, currentModel);
    } catch (error) {
      this.logger.error(
        `Error en llamada a Ollama: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  async generateFromImage(
    imageBuffer: Buffer,
    _mimeType: string,
    prompt?: string,
    currentModel?: UMLModel,
  ): Promise<AiGenerationResult> {
    const contextStr = formatModelContext(currentModel);
    const userInstruction =
      prompt || 'Interpreta este boceto o diagrama UML y extrae las clases y relaciones';

    try {
      const response = await fetch(`${this.config.ollamaBaseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.config.ollamaModel,
          system: UML_SYSTEM_PROMPT,
          prompt: `${contextStr}\n\n${userInstruction}`,
          images: [imageBuffer.toString('base64')],
          format: 'json',
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama Vision respondio con status HTTP ${response.status}`);
      }

      const data = (await response.json()) as { response?: string };
      const rawText = data.response ?? '{}';
      return this.parseAiResponse(rawText, currentModel);
    } catch (error) {
      this.logger.error(
        `Error en Ollama Vision: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  async suggestRefinements(model: UMLModel, context?: string): Promise<AiGenerationResult> {
    const prompt = `Analiza el modelo UML adjunto y sugiere refinamientos arquitectonicos y buenas practicas.\nContexto: ${context || 'Mejora general'}`;
    return this.generateFromPrompt(prompt, model);
  }

  private parseAiResponse(jsonText: string, currentModel?: UMLModel): AiGenerationResult {
    try {
      const cleanJson = jsonText
        .replace(/^```json\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();
      const parsed = JSON.parse(cleanJson) as { explanation?: string; operations?: unknown[] };
      const explanation = parsed.explanation || 'Operaciones UML generadas mediante Ollama AI.';
      const rawOps = Array.isArray(parsed.operations) ? parsed.operations : [];
      const operations = mapAiOperationsToUmlOperations(rawOps, currentModel);

      return { explanation, operations };
    } catch (e) {
      this.logger.warn(`No se pudo parsear el JSON de Ollama: ${String(e)}`);
      return {
        explanation: 'Ollama no retorno un JSON estructurado valido.',
        operations: [],
      };
    }
  }
}
