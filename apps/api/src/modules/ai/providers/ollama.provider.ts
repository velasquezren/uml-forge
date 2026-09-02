import { Injectable, Logger } from '@nestjs/common';
import type { UMLModel } from '@uml-forge/uml-core';
import { ApiConfigService } from '../../../config/config.service';
import { formatModelContext, UML_SYSTEM_PROMPT } from '../ai-prompts';
import { mapAiOperationsToUmlOperations } from '../ai-operation-mapper';
import { extractJsonObject } from './json-extraction';
import type { AiGenerationResult, AiProvider } from '../interfaces/ai-provider.interface';

/** Un modelo local en CPU tarda mucho mas que una API remota. */
const GENERATION_TIMEOUT_MS = 180000;

/** El sondeo de disponibilidad no debe bloquear la peticion del usuario. */
const AVAILABILITY_TIMEOUT_MS = 2000;

interface OllamaTagsResponse {
  models?: { name?: string }[];
}

@Injectable()
export class OllamaProvider implements AiProvider {
  readonly providerName = 'ollama';
  private readonly logger = new Logger(OllamaProvider.name);

  constructor(private readonly config: ApiConfigService) {}

  /**
   * Hay servidor y el modelo de texto esta descargado. Comprobar el modelo
   * evita el fallo mas comun al probar en local: Ollama arrancado pero sin
   * haber hecho `ollama pull`, que devolveria un 404 en mitad de la peticion.
   */
  async isAvailable(): Promise<boolean> {
    const installed = await this.installedModels();
    if (installed === null) {
      return false;
    }

    if (!hasModel(installed, this.config.ollamaModel)) {
      this.logger.warn(
        `Ollama responde pero no tiene el modelo ${this.config.ollamaModel}. ` +
          `Descargalo con: ollama pull ${this.config.ollamaModel}`,
      );
      return false;
    }

    return true;
  }

  async generateFromPrompt(prompt: string, currentModel?: UMLModel): Promise<AiGenerationResult> {
    const userPrompt = `${formatModelContext(currentModel)}\n\nSolicitud del usuario:\n${prompt}`;

    const rawText = await this.generate({
      model: this.config.ollamaModel,
      system: UML_SYSTEM_PROMPT,
      prompt: userPrompt,
      format: 'json',
      stream: false,
      options: { temperature: 0.2 },
    });

    return this.parseAiResponse(rawText, currentModel);
  }

  async generateFromImage(
    imageBuffer: Buffer,
    _mimeType: string,
    prompt?: string,
    currentModel?: UMLModel,
  ): Promise<AiGenerationResult> {
    const instruction =
      prompt ?? 'Interpreta este boceto o diagrama UML y extrae las clases y relaciones';

    // La vision necesita un modelo multimodal distinto al de texto.
    const rawText = await this.generate({
      model: this.config.ollamaVisionModel,
      system: UML_SYSTEM_PROMPT,
      prompt: `${formatModelContext(currentModel)}\n\n${instruction}`,
      images: [imageBuffer.toString('base64')],
      format: 'json',
      stream: false,
    });

    return this.parseAiResponse(rawText, currentModel);
  }

  async suggestRefinements(model: UMLModel, context?: string): Promise<AiGenerationResult> {
    const prompt =
      'Analiza el modelo UML adjunto y sugiere refinamientos arquitectonicos y buenas practicas.\n' +
      `Contexto: ${context ?? 'Mejora general'}`;
    return this.generateFromPrompt(prompt, model);
  }

  /** Modelos descargados, o null si el servidor no responde. */
  private async installedModels(): Promise<string[] | null> {
    try {
      const response = await fetch(`${this.config.ollamaBaseUrl}/api/tags`, {
        signal: AbortSignal.timeout(AVAILABILITY_TIMEOUT_MS),
      });
      if (!response.ok) {
        return null;
      }
      const data = (await response.json()) as OllamaTagsResponse;
      return (data.models ?? []).map((entry) => entry.name ?? '').filter((name) => name.length > 0);
    } catch {
      return null;
    }
  }

  /** Llamada a `/api/generate` con limite de tiempo y errores explicitos. */
  private async generate(body: Record<string, unknown>): Promise<string> {
    try {
      const response = await fetch(`${this.config.ollamaBaseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(GENERATION_TIMEOUT_MS),
      });

      if (!response.ok) {
        const detail = response.status === 404 ? `: falta 'ollama pull ${String(body.model)}'` : '';
        throw new Error(`Ollama respondio con estado HTTP ${response.status}${detail}`);
      }

      const data = (await response.json()) as { response?: string };
      return data.response ?? '{}';
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error en la llamada a Ollama: ${message}`);
      throw error instanceof Error ? error : new Error(message);
    }
  }

  private parseAiResponse(jsonText: string, currentModel?: UMLModel): AiGenerationResult {
    const candidate = extractJsonObject(jsonText);
    if (candidate === null) {
      this.logger.warn('Ollama no devolvio ningun objeto JSON reconocible');
      return { explanation: 'Ollama no retorno un JSON estructurado valido.', operations: [] };
    }

    try {
      const parsed = JSON.parse(candidate) as { explanation?: string; operations?: unknown[] };
      const rawOps = Array.isArray(parsed.operations) ? parsed.operations : [];

      return {
        explanation: parsed.explanation ?? 'Operaciones UML generadas mediante Ollama.',
        operations: mapAiOperationsToUmlOperations(rawOps, currentModel),
      };
    } catch (error) {
      this.logger.warn(`No se pudo interpretar el JSON de Ollama: ${String(error)}`);
      return { explanation: 'Ollama no retorno un JSON estructurado valido.', operations: [] };
    }
  }
}

/** Compara ignorando la etiqueta `:latest`, que Ollama anade sola. */
function hasModel(installed: readonly string[], wanted: string): boolean {
  const normalize = (name: string): string => name.replace(/:latest$/u, '');
  return installed.some((name) => normalize(name) === normalize(wanted));
}
