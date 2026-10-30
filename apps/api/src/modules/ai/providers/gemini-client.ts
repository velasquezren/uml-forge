import { GoogleGenAI, ThinkingLevel, type ThinkingConfig } from '@google/genai';
import { Logger } from '@nestjs/common';
import type { ApiConfigService } from '../../../config/config.service';
import { describeGeminiError, isModelCapacityError, isNetworkError } from './gemini-errors';

/** Limite por peticion: una imagen grande con un modelo con razonamiento tarda. */
const REQUEST_TIMEOUT_MS = 120_000;

/** Intentos con el mismo modelo cuando la conexion falla antes de responder. */
const NETWORK_ATTEMPTS = 3;
const NETWORK_RETRY_DELAY_MS = 1_000;

/** Cuanto razona el modelo antes de responder. */
export type ThinkingEffort = 'default' | 'low' | 'minimal';

/**
 * Razonamiento segun la familia del modelo (ADR 0044). Gemini 3 usa niveles y
 * rechaza el presupuesto en tokens; Gemini 2.5 usa presupuesto y rechaza los
 * niveles con un 400. Medido en Vertex con una pregunta tipica del chat: 7,2 s
 * por defecto, 5,7 s con `LOW` y 3,2 s con `MINIMAL`.
 */
export function thinkingFor(model: string, effort: ThinkingEffort): ThinkingConfig | undefined {
  if (effort === 'default') return undefined;
  if (/^gemini-([3-9]|\d{2,})/u.test(model)) {
    return { thinkingLevel: effort === 'minimal' ? ThinkingLevel.MINIMAL : ThinkingLevel.LOW };
  }
  if (/^gemini-2\.5/u.test(model)) {
    // El modelo pro no admite desactivar el razonamiento: su minimo es 128.
    const floor = model.includes('pro') ? 128 : 0;
    return { thinkingBudget: effort === 'minimal' ? floor : 1024 };
  }
  return undefined;
}

/**
 * Acceso al SDK `@google/genai`, por clave o por Vertex AI (ADR 0040), con
 * reintentos del propio SDK ante 408, 429 y 5xx y paso al modelo de reserva
 * si el principal esta saturado, sin cuota o retirado.
 */
export class GeminiClient {
  private readonly logger = new Logger(GeminiClient.name);
  private cached: { key: string; instance: GoogleGenAI } | null = null;

  constructor(private readonly config: ApiConfigService) {}

  /** Cliente configurado, o null si falta la clave o el proyecto de Vertex. */
  instance(): GoogleGenAI | null {
    const httpOptions = {
      timeout: REQUEST_TIMEOUT_MS,
      retryOptions: { attempts: 3, initialDelay: 1, maxDelay: 8 },
    };

    if (this.config.geminiUseVertexAi) {
      const project = this.config.googleCloudProject.trim();
      const location = this.config.googleCloudLocation.trim() || 'global';
      if (!project) return null;
      const key = `vertex:${project}:${location}`;
      if (this.cached?.key !== key) {
        this.cached = {
          key,
          instance: new GoogleGenAI({ vertexai: true, project, location, httpOptions }),
        };
      }
      return this.cached.instance;
    }

    const apiKey = this.config.geminiApiKey.trim();
    if (!apiKey || apiKey === 'tu_api_key_de_google_ai_studio') return null;
    if (this.cached?.key !== apiKey) {
      this.cached = { key: apiKey, instance: new GoogleGenAI({ apiKey, httpOptions }) };
    }
    return this.cached.instance;
  }

  /**
   * Ejecuta una llamada con el modelo principal y, solo si este no tiene
   * capacidad, con el de reserva. Los demas errores (clave invalida, peticion
   * mal formada) fallarian igual con otro modelo y se devuelven traducidos.
   */
  async call<T>(run: (client: GoogleGenAI, model: string) => Promise<T>): Promise<T> {
    const client = this.instance();
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
        return await this.withNetworkRetries(() => run(client, model));
      } catch (error) {
        lastError = error;
        this.logger.warn(`Gemini (${model}): ${describeGeminiError(error, model)}`);
        if (!isModelCapacityError(error)) break;
      }
    }

    const message = describeGeminiError(lastError, this.config.geminiModel);
    this.logger.error(`Error en llamada a Gemini: ${message}`);
    throw new Error(message);
  }

  /** Repite la llamada si la conexion se corta antes de llegar la respuesta. */
  private async withNetworkRetries<T>(attempt: () => Promise<T>): Promise<T> {
    for (let index = 1; ; index += 1) {
      try {
        return await attempt();
      } catch (error) {
        if (!isNetworkError(error) || index >= NETWORK_ATTEMPTS) throw error;
        await new Promise((resolve) => setTimeout(resolve, NETWORK_RETRY_DELAY_MS * index));
      }
    }
  }
}
