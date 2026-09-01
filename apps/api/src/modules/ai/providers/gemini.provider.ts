import { GoogleGenAI } from '@google/genai';
import { Injectable, Logger } from '@nestjs/common';
import type { UMLModel } from '@uml-forge/uml-core';
import { ApiConfigService } from '../../../config/config.service';
import { formatModelContext, UML_SYSTEM_PROMPT } from '../ai-prompts';
import { mapAiOperationsToUmlOperations } from '../ai-operation-mapper';
import type { AiGenerationResult, AiProvider } from '../interfaces/ai-provider.interface';

@Injectable()
export class GeminiProvider implements AiProvider {
  readonly providerName = 'gemini';
  private readonly logger = new Logger(GeminiProvider.name);

  constructor(private readonly config: ApiConfigService) {}

  private getClient(): GoogleGenAI | null {
    const apiKey = this.config.geminiApiKey;
    if (!apiKey || apiKey === 'tu_api_key_de_google_ai_studio') {
      return null;
    }
    return new GoogleGenAI({ apiKey });
  }

  isAvailable(): Promise<boolean> {
    return Promise.resolve(this.getClient() !== null);
  }

  async generateFromPrompt(prompt: string, currentModel?: UMLModel): Promise<AiGenerationResult> {
    const client = this.getClient();
    if (!client) {
      throw new Error('GEMINI_API_KEY no esta configurada o es invalida');
    }

    const contextStr = formatModelContext(currentModel);
    const userPrompt = `${contextStr}\n\nSolicitud del usuario:\n${prompt}`;

    try {
      const response = await client.models.generateContent({
        model: this.config.geminiModel,
        contents: [{ role: 'user', parts: [{ text: `${UML_SYSTEM_PROMPT}\n\n${userPrompt}` }] }],
        config: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      });

      const text = response.text ?? '{}';
      return this.parseAiResponse(text, currentModel);
    } catch (error) {
      this.logger.error(
        `Error en llamada a Gemini: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  async generateFromImage(
    imageBuffer: Buffer,
    mimeType: string,
    prompt?: string,
    currentModel?: UMLModel,
  ): Promise<AiGenerationResult> {
    const client = this.getClient();
    if (!client) {
      throw new Error('GEMINI_API_KEY no esta configurada o es invalida');
    }

    const contextStr = formatModelContext(currentModel);
    const userInstruction =
      prompt ||
      'Interpreta este diagrama o boceto UML y extrae las clases, atributos, metodos y relaciones';

    try {
      const response = await client.models.generateContent({
        model: this.config.geminiModel,
        contents: [
          {
            role: 'user',
            parts: [
              { text: `${UML_SYSTEM_PROMPT}\n\n${contextStr}\n\n${userInstruction}` },
              {
                inlineData: {
                  data: imageBuffer.toString('base64'),
                  mimeType: mimeType || 'image/png',
                },
              },
            ],
          },
        ],
        config: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      });

      const text = response.text ?? '{}';
      return this.parseAiResponse(text, currentModel);
    } catch (error) {
      this.logger.error(
        `Error en Gemini Multimodal: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  async suggestRefinements(model: UMLModel, context?: string): Promise<AiGenerationResult> {
    const prompt = `Analiza el modelo UML adjunto y sugiere refinamientos arquitectonicos (patrones, identificadores, tipos precisos, normalizacion de relaciones, eliminacion de redundancias).\nContexto adicional: ${context || 'Mejora general y buenas practicas'}`;
    return this.generateFromPrompt(prompt, model);
  }

  private parseAiResponse(jsonText: string, currentModel?: UMLModel): AiGenerationResult {
    try {
      const cleanJson = jsonText
        .replace(/^```json\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();
      const parsed = JSON.parse(cleanJson) as { explanation?: string; operations?: unknown[] };
      const explanation = parsed.explanation || 'Operaciones UML generadas mediante Gemini AI.';
      const rawOps = Array.isArray(parsed.operations) ? parsed.operations : [];
      const operations = mapAiOperationsToUmlOperations(rawOps, currentModel);

      return { explanation, operations };
    } catch (e) {
      this.logger.warn(
        `No se pudo parsear el JSON de Gemini, retornando resultado vacio: ${String(e)}`,
      );
      return {
        explanation: 'El modelo no retorno un JSON estructurado valido.',
        operations: [],
      };
    }
  }
}
