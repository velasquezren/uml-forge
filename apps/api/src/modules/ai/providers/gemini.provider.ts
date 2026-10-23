import type { Part, Schema } from '@google/genai';
import { Injectable, Logger } from '@nestjs/common';
import type { UMLModel } from '@uml-forge/uml-core';
import { ApiConfigService } from '../../../config/config.service';
import {
  formatModelContext,
  UML_REFINE_INSTRUCTION,
  UML_SYSTEM_PROMPT,
  UML_VISION_PROMPT,
} from '../ai-prompts';
import { extractPartialReply } from '../ai-chat-draft';
import { CHAT_SYSTEM_PROMPT, formatChatRequest } from '../ai-chat-prompt';
import { parseChatReply } from '../ai-chat-reply';
import { mapAiOperationsToUmlOperations, parseUmlFromFreeformText } from '../ai-operation-mapper';
import type {
  AiChatReply,
  AiChatRequest,
  AiDraftListener,
  AiGenerationResult,
  AiProvider,
} from '../interfaces/ai-provider.interface';
import { GeminiClient, thinkingFor } from './gemini-client';
import { CHAT_RESPONSE_SCHEMA, UML_RESPONSE_SCHEMA } from './gemini-schema';
import { extractJsonObject } from './json-extraction';

export { describeGeminiError, isModelCapacityError } from './gemini-errors';

/** Instruccion para pasar una nota de voz a texto. */
const TRANSCRIBE_PROMPT =
  'Transcribe literalmente esta nota de voz, en el idioma en que se habla. Devuelve solo la transcripcion, sin comillas ni comentarios. Si no se entiende nada, devuelve una cadena vacia.';

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
  private readonly gemini: GeminiClient;

  constructor(config: ApiConfigService) {
    this.gemini = new GeminiClient(config);
  }

  isAvailable(): Promise<boolean> {
    return Promise.resolve(this.gemini.instance() !== null);
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

  /**
   * Respuesta del chat en streaming: el texto de `reply` se va avisando por
   * `onDraft` mientras llega, y al final se interpreta el JSON completo. El
   * razonamiento va acotado porque en un chat la espera se nota (ADR 0044).
   */
  async converse(request: AiChatRequest, onDraft?: AiDraftListener): Promise<AiChatReply> {
    const parts: Part[] = [{ text: formatChatRequest(request) }];
    if (request.attachment !== undefined) {
      parts.push({
        inlineData: {
          data: request.attachment.data.toString('base64'),
          mimeType: request.attachment.mimeType,
        },
      });
    }

    const text = await this.gemini.call(async (client, model) => {
      const stream = await client.models.generateContentStream({
        model,
        contents: [{ role: 'user', parts }],
        config: {
          systemInstruction: CHAT_SYSTEM_PROMPT,
          responseMimeType: 'application/json',
          responseSchema: CHAT_RESPONSE_SCHEMA,
          temperature: 0.4,
          thinkingConfig: thinkingFor(model, 'low'),
        },
      });
      let accumulated = '';
      for await (const chunk of stream) {
        accumulated += chunk.text ?? '';
        const draft = onDraft ? extractPartialReply(accumulated) : null;
        if (draft) onDraft?.(draft);
      }
      return accumulated || '{}';
    });
    return parseChatReply(text, request.model);
  }

  async transcribe(audio: Buffer, mimeType: string): Promise<string> {
    return this.gemini.call(async (client, model) => {
      const response = await client.models.generateContent({
        model,
        contents: [
          {
            role: 'user',
            parts: [
              { text: TRANSCRIBE_PROMPT },
              { inlineData: { data: audio.toString('base64'), mimeType } },
            ],
          },
        ],
        config: { temperature: 0, thinkingConfig: thinkingFor(model, 'minimal') },
      });
      return (response.text ?? '').trim();
    });
  }

  private async generate(
    systemInstruction: string,
    parts: Part[],
    currentModel?: UMLModel,
  ): Promise<AiGenerationResult> {
    const text = await this.requestJson(systemInstruction, parts, UML_RESPONSE_SCHEMA, 0.2);
    return this.parseAiResponse(text, currentModel);
  }

  /** Una llamada con salida JSON y esquema; devuelve el texto JSON de la respuesta. */
  private requestJson(
    systemInstruction: string,
    parts: Part[],
    responseSchema: Schema,
    temperature: number,
  ): Promise<string> {
    return this.gemini.call(async (client, model) => {
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
    });
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
