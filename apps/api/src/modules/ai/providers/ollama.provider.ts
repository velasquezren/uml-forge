import { Injectable, Logger } from '@nestjs/common';
import type { UMLModel } from '@uml-forge/uml-core';
import { ApiConfigService } from '../../../config/config.service';
import { formatModelContext, UML_SYSTEM_PROMPT, UML_VISION_PROMPT } from '../ai-prompts';
import { mapAiOperationsToUmlOperations, parseUmlFromFreeformText } from '../ai-operation-mapper';
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
   * Comprueba si el servidor esta activo y el modelo de texto descargado.
   */
  async isAvailable(): Promise<boolean> {
    const installed = await this.installedModels();
    if (installed === null) {
      return false;
    }

    if (!hasModel(installed, this.config.ollamaModel)) {
      this.logger.warn(
        `Ollama responde pero no tiene el modelo de texto '${this.config.ollamaModel}'. ` +
          `Descargalo con: ollama pull ${this.config.ollamaModel}`,
      );
      return false;
    }

    return true;
  }

  /**
   * Comprueba si el modelo de vision multimodal para diagramas e imagenes esta descargado.
   */
  async isVisionAvailable(): Promise<boolean> {
    const installed = await this.installedModels();
    if (installed === null) {
      return false;
    }
    return hasModel(installed, this.config.ollamaVisionModel);
  }

  async generateFromPrompt(prompt: string, currentModel?: UMLModel): Promise<AiGenerationResult> {
    const userPrompt = `${formatModelContext(currentModel)}\n\nSolicitud del usuario:\n${prompt}`;

    const rawText = await this.generate({
      model: this.config.ollamaModel,
      system: UML_SYSTEM_PROMPT,
      prompt: userPrompt,
      format: 'json',
      stream: false,
      options: {
        num_ctx: 4096,
        temperature: 0.1,
        top_p: 0.9,
        num_predict: 2048,
      },
    });

    return this.parseAiResponse(rawText, currentModel, false);
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
      system: UML_VISION_PROMPT,
      prompt: `${formatModelContext(currentModel)}\n\n${instruction}`,
      images: [imageBuffer.toString('base64')],
      format: 'json',
      stream: false,
      options: {
        num_ctx: 4096,
        temperature: 0.1,
        top_p: 0.9,
        num_predict: 2048,
      },
    });

    return this.parseAiResponse(rawText, currentModel, true);
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

  private parseAiResponse(
    jsonText: string,
    currentModel?: UMLModel,
    isVision = false,
  ): AiGenerationResult {
    const candidate = extractJsonObject(jsonText);

    if (candidate !== null) {
      try {
        const parsed = JSON.parse(candidate) as Record<string, unknown>;
        const defaultExplanation = isVision
          ? 'Diagrama UML interpretado desde la imagen.'
          : 'Operaciones UML generadas mediante Ollama.';
        const explanation =
          typeof parsed.explanation === 'string' ? parsed.explanation : defaultExplanation;

        const operations = mapAiOperationsToUmlOperations(parsed, currentModel);
        if (operations.length > 0) {
          return { explanation, operations };
        }
      } catch (error) {
        this.logger.warn(`No se pudo interpretar el JSON de Ollama: ${String(error)}`);
      }
    }

    // Si el modelo local devolvió texto explicativo o markdown (muy común en Llava), intentar extraer clases por regex
    const freeformOps = parseUmlFromFreeformText(jsonText, currentModel);
    if (freeformOps.length > 0) {
      return {
        explanation: 'Operaciones UML extraídas a partir del análisis del modelo.',
        operations: freeformOps,
      };
    }

    this.logger.warn('Ollama no devolvio ninguna especificacion UML reconocible');
    return { explanation: 'Ollama no retorno un JSON estructurado valido.', operations: [] };
  }
}

/** Resuelve el nombre exacto registrado en Ollama para evitar errores 404 por discrepancias de tags (:latest vs :3b vs sin tag). */
export function resolveModelName(installed: readonly string[], wanted: string): string {
  const cleanWanted = wanted.trim().toLowerCase();
  const wantedBase = cleanWanted.split(':')[0] ?? '';

  // 1. Coincidencia exacta
  const exact = installed.find((m) => m.toLowerCase() === cleanWanted);
  if (exact) return exact;

  // 2. Coincidencia ignorando sufijo :latest
  const withoutLatest = installed.find(
    (m) => m.replace(/:latest$/u, '').toLowerCase() === cleanWanted.replace(/:latest$/u, ''),
  );
  if (withoutLatest) return withoutLatest;

  // 3. Coincidencia por familia base (ej: wanted='llava:7b', instalado='llava:latest' o 'llava')
  const familyMatch = installed.find((m) => {
    const base = m.split(':')[0]?.toLowerCase() ?? '';
    return base === wantedBase;
  });
  if (familyMatch) return familyMatch;

  return wanted;
}

/** Comprueba si el modelo solicitado o una variante compatible esta descargada. */
export function hasModel(installed: readonly string[], wanted: string): boolean {
  const cleanWanted = wanted.trim().toLowerCase();
  const wantedBase = cleanWanted.split(':')[0] ?? '';

  return installed.some((installedName) => {
    const cleanInstalled = installedName.trim().toLowerCase();
    const installedBase = cleanInstalled.split(':')[0] ?? '';

    if (cleanInstalled === cleanWanted) return true;
    if (cleanInstalled.replace(/:latest$/u, '') === cleanWanted.replace(/:latest$/u, ''))
      return true;
    if (wantedBase.length > 0 && wantedBase === installedBase) {
      const wantedTag = cleanWanted.includes(':') ? (cleanWanted.split(':')[1] ?? '') : '';
      const installedTag = cleanInstalled.includes(':') ? (cleanInstalled.split(':')[1] ?? '') : '';
      if (!wantedTag || !installedTag || wantedTag === 'latest' || installedTag === 'latest') {
        return true;
      }
      return wantedTag === installedTag;
    }
    return false;
  });
}
