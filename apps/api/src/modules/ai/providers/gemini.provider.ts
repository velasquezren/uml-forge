import { ApiError, GoogleGenAI, type Part, type Schema } from '@google/genai';
import { Injectable, Logger } from '@nestjs/common';
import type { UMLModel } from '@uml-forge/uml-core';
import { ApiConfigService } from '../../../config/config.service';
import {
  formatModelContext,
  UML_REFINE_INSTRUCTION,
  UML_SYSTEM_PROMPT,
  UML_VISION_PROMPT,
} from '../ai-prompts';
import { CHAT_SYSTEM_PROMPT, formatChatRequest } from '../ai-chat-prompt';
import { parseChatReply } from '../ai-chat-reply';
import { mapAiOperationsToUmlOperations, parseUmlFromFreeformText } from '../ai-operation-mapper';
import type {
  AiChatReply,
  AiChatRequest,
  AiGenerationResult,
  AiProvider,
} from '../interfaces/ai-provider.interface';
import { CHAT_RESPONSE_SCHEMA, UML_RESPONSE_SCHEMA } from './gemini-schema';
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

  /**
   * Cliente del SDK. Con `GEMINI_USE_VERTEXAI=true` se usa Vertex AI con las
   * credenciales de Google Cloud (la cuenta de servicio en Cloud Run, o
   * `gcloud auth application-default login` en local) y no hace falta clave;
   * si no, la Gemini Developer API con `GEMINI_API_KEY` (ADR 0040).
   */
  private getClient(): GoogleGenAI | null {
    const httpOptions = {
      timeout: REQUEST_TIMEOUT_MS,
      retryOptions: { attempts: 3, initialDelay: 1, maxDelay: 8 },
    };

    if (this.config.geminiUseVertexAi) {
      const project = this.config.googleCloudProject.trim();
      const location = this.config.googleCloudLocation.trim() || 'global';
      if (!project) {
        return null;
      }
      const key = `vertex:${project}:${location}`;
      if (this.client?.key !== key) {
        this.client = {
          key,
          instance: new GoogleGenAI({ vertexai: true, project, location, httpOptions }),
        };
      }
      return this.client.instance;
    }

    const apiKey = this.config.geminiApiKey.trim();
    if (!apiKey || apiKey === 'tu_api_key_de_google_ai_studio') {
      return null;
    }
    if (this.client?.key !== apiKey) {
      this.client = { key: apiKey, instance: new GoogleGenAI({ apiKey, httpOptions }) };
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

  async converse(request: AiChatRequest): Promise<AiChatReply> {
    // Algo mas de temperatura que al generar modelos: la respuesta es texto.
    const text = await this.requestJson(
      CHAT_SYSTEM_PROMPT,
      [{ text: formatChatRequest(request) }],
      CHAT_RESPONSE_SCHEMA,
      0.4,
    );
    return parseChatReply(text, request.model);
  }

  private async generate(
    systemInstruction: string,
    parts: Part[],
    currentModel?: UMLModel,
  ): Promise<AiGenerationResult> {
    const text = await this.requestJson(systemInstruction, parts, UML_RESPONSE_SCHEMA, 0.2);
    return this.parseAiResponse(text, currentModel);
  }

  /**
   * Una llamada con salida JSON y esquema. Prueba el modelo principal y, si esta
   * saturado o sin cuota, el de reserva; devuelve el texto JSON de la respuesta.
   */
  private async requestJson(
    systemInstruction: string,
    parts: Part[],
    responseSchema: Schema,
    temperature: number,
  ): Promise<string> {
    const client = this.getClient();
    if (!client) {
      throw new Error(
        this.config.geminiUseVertexAi
          ? 'GOOGLE_CLOUD_PROJECT no esta configurado para Vertex AI'
          : 'GEMINI_API_KEY no esta configurada',
      );
    }

    const models = [this.config.geminiModel, this.config.geminiFallbackModel.trim()].filter(
      (model, index, all) => model !== '' && all.indexOf(model) === index,
    );

    let lastError: unknown = null;
    for (const model of models) {
      try {
        const response = await client.models.generateContent({
          model,
          contents: [{ role: 'user', parts }],
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema,
            temperature,
          },
        });
        return response.text ?? '{}';
      } catch (error) {
        lastError = error;
        this.logger.warn(`Gemini (${model}): ${describeGeminiError(error, model)}`);
        // Solo la saturacion o la cuota del modelo justifican probar otro: una
        // clave invalida o una peticion mal formada fallaria igual.
        if (!isModelCapacityError(error)) {
          break;
        }
      }
    }

    const message = describeGeminiError(lastError, this.config.geminiModel);
    this.logger.error(`Error en llamada a Gemini: ${message}`);
    throw new Error(message);
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

/** Modelo saturado, sin cuota o retirado: otro modelo de Gemini si puede responder. */
export function isModelCapacityError(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    (error.status === 404 || error.status === 429 || error.status >= 500)
  );
}

/** Traduce los errores de la API a un mensaje que la persona pueda resolver. */
export function describeGeminiError(error: unknown, model: string): string {
  if (error instanceof ApiError) {
    const detail = error.message.toLowerCase();
    if (error.status === 400 && detail.includes('api key')) {
      return 'La clave GEMINI_API_KEY no es valida. Revisala en Google AI Studio.';
    }
    if (error.status === 401 || error.status === 403) {
      return detail.includes('aiplatform')
        ? 'La cuenta de servicio no tiene permiso para Vertex AI (rol roles/aiplatform.user).'
        : 'La clave GEMINI_API_KEY no tiene permiso para usar la Gemini API.';
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
