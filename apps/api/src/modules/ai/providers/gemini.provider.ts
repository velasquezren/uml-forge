import { ApiError, GoogleGenAI, type Part } from '@google/genai';
import { Injectable, Logger } from '@nestjs/common';
import type { UMLModel } from '@uml-forge/uml-core';
import { ApiConfigService } from '../../../config/config.service';
import {
  formatModelContext,
  UML_REFINE_INSTRUCTION,
  UML_SYSTEM_PROMPT,
  UML_VISION_PROMPT,
} from '../ai-prompts';
import { mapAiOperationsToUmlOperations, parseUmlFromFreeformText } from '../ai-operation-mapper';
import type { AiGenerationResult, AiProvider } from '../interfaces/ai-provider.interface';
import { UML_RESPONSE_SCHEMA } from './gemini-schema';
import { extractJsonObject } from './json-extraction';

/** Limite por peticion: una imagen grande con un modelo con razonamiento tarda. */
const REQUEST_TIMEOUT_MS = 120_000;

/**
 * Proveedor principal de IA sobre la Gemini Developer API (ADR 0019). Usa el
 * SDK unificado `@google/genai` con instruccion de sistema, salida JSON con
 * esquema y reintentos automaticos ante 408, 429 y 5xx, que son los errores
 * transitorios tipicos de una API en la nube.
 */
@Injectable()
export class GeminiProvider implements AiProvider {
  readonly providerName = 'gemini';
  private readonly logger = new Logger(GeminiProvider.name);
  private client: { key: string; instance: GoogleGenAI } | null = null;

  constructor(private readonly config: ApiConfigService) {}

  private getClient(): GoogleGenAI | null {
    const apiKey = this.config.geminiApiKey.trim();
    if (!apiKey || apiKey === 'tu_api_key_de_google_ai_studio') {
      return null;
    }
    if (this.client?.key !== apiKey) {
      this.client = {
        key: apiKey,
        instance: new GoogleGenAI({
          apiKey,
          httpOptions: {
            timeout: REQUEST_TIMEOUT_MS,
            retryOptions: { attempts: 3, initialDelay: 1, maxDelay: 8 },
          },
        }),
      };
    }
    return this.client.instance;
  }

  isAvailable(): Promise<boolean> {
    return Promise.resolve(this.getClient() !== null);
  }

  generateFromPrompt(prompt: string, currentModel?: UMLModel): Promise<AiGenerationResult> {
    const userPrompt = `${formatModelContext(currentModel)}\n\nSolicitud del usuario:\n${prompt}`;
    return this.generate(UML_SYSTEM_PROMPT, [{ text: userPrompt }], currentModel);
  }

  generateFromImage(
    imageBuffer: Buffer,
    mimeType: string,
    prompt?: string,
    currentModel?: UMLModel,
  ): Promise<AiGenerationResult> {
    const instruction =
      prompt ||
      'Interpreta este diagrama o boceto UML y extrae las clases, atributos, metodos y relaciones';
    return this.generate(
      UML_VISION_PROMPT,
      [
        { text: `${formatModelContext(currentModel)}\n\n${instruction}` },
        { inlineData: { data: imageBuffer.toString('base64'), mimeType: mimeType || 'image/png' } },
      ],
      currentModel,
    );
  }

  suggestRefinements(model: UMLModel, context?: string): Promise<AiGenerationResult> {
    const prompt = `${UML_REFINE_INSTRUCTION}\nContexto adicional: ${context || 'Mejora general y buenas practicas'}`;
    return this.generateFromPrompt(prompt, model);
  }

  private async generate(
    systemInstruction: string,
    parts: Part[],
    currentModel?: UMLModel,
  ): Promise<AiGenerationResult> {
    const client = this.getClient();
    if (!client) {
      throw new Error('GEMINI_API_KEY no esta configurada');
    }

    try {
      const response = await client.models.generateContent({
        model: this.config.geminiModel,
        contents: [{ role: 'user', parts }],
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: UML_RESPONSE_SCHEMA,
          temperature: 0.2,
        },
      });
      return this.parseAiResponse(response.text ?? '{}', currentModel);
    } catch (error) {
      const message = describeGeminiError(error, this.config.geminiModel);
      this.logger.error(`Error en llamada a Gemini: ${message}`);
      throw new Error(message);
    }
  }

  private parseAiResponse(jsonText: string, currentModel?: UMLModel): AiGenerationResult {
    const candidate = extractJsonObject(jsonText);

    if (candidate !== null) {
      try {
        const parsed = JSON.parse(candidate) as Record<string, unknown>;
        const explanation =
          typeof parsed.explanation === 'string' && parsed.explanation.trim() !== ''
            ? parsed.explanation
            : 'Operaciones UML generadas mediante Gemini.';
        const operations = mapAiOperationsToUmlOperations(parsed, currentModel);
        // Sin operaciones la explicacion sigue siendo util: suele decir que el
        // modelo ya cumple lo pedido o por que no se puede hacer.
        return { explanation, operations };
      } catch (e) {
        this.logger.warn(`Error al evaluar JSON de Gemini: ${String(e)}`);
      }
    }

    const freeformOps = parseUmlFromFreeformText(jsonText, currentModel);
    if (freeformOps.length > 0) {
      return {
        explanation: 'Operaciones extraidas de la respuesta textual del modelo.',
        operations: freeformOps,
      };
    }

    return { explanation: 'El modelo no retorno un JSON estructurado valido.', operations: [] };
  }
}

/** Traduce los errores de la API a un mensaje que la persona pueda resolver. */
export function describeGeminiError(error: unknown, model: string): string {
  if (error instanceof ApiError) {
    const detail = error.message.toLowerCase();
    if (error.status === 400 && detail.includes('api key')) {
      return 'La clave GEMINI_API_KEY no es valida. Revisala en Google AI Studio.';
    }
    if (error.status === 401 || error.status === 403) {
      return 'La clave GEMINI_API_KEY no tiene permiso para usar la Gemini API.';
    }
    if (error.status === 404) {
      return `El modelo "${model}" no existe o no esta disponible. Revisa GEMINI_MODEL.`;
    }
    if (error.status === 429) {
      return 'Se agoto la cuota de Gemini. Espera un momento o revisa el plan de la clave.';
    }
    if (error.status >= 500) {
      return 'Gemini no esta disponible en este momento. Intentalo de nuevo en unos segundos.';
    }
    return `Gemini rechazo la solicitud (${error.status}): ${error.message}`;
  }
  if (error instanceof Error && /timeout|aborted/iu.test(error.message)) {
    return 'Gemini tardo demasiado en responder. Prueba con una instruccion mas concreta.';
  }
  return error instanceof Error ? error.message : String(error);
}
