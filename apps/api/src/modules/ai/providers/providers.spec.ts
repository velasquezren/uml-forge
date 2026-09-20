import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiConfigService } from '../../../config/config.service';
import { mapAiOperationsToUmlOperations } from '../ai-operation-mapper';
import { GeminiProvider } from './gemini.provider';
import { extractJsonObject } from './json-extraction';
import { OllamaProvider } from './ollama.provider';

describe('AI Providers & Operation Mapper', () => {
  it('mapea correctamente operaciones variadas en formato flexible a UmlOperation estricto', () => {
    const rawOps = [
      {
        type: 'add_class',
        name: 'Account',
        isAbstract: false,
        isInterface: false,
      },
      {
        type: 'add_enum',
        name: 'AccountType',
        literals: ['SAVINGS', 'CHECKING'],
      },
      {
        type: 'add_attribute',
        target: 'Account',
        name: 'balance',
        propertyType: 'BigDecimal',
        visibility: 'private',
        multiplicity: '1',
      },
      {
        type: 'add_operation',
        target: 'Account',
        name: 'deposit',
        returnType: 'void',
        parameters: [{ name: 'amount', type: 'BigDecimal', direction: 'in' }],
      },
      {
        type: 'add_relationship',
        kind: 'composition',
        source: 'Account',
        target: 'Account',
        sourceRole: 'parent',
        targetRole: 'child',
      },
    ];

    const mapped = mapAiOperationsToUmlOperations(rawOps);
    expect(mapped).toHaveLength(5);
    expect(mapped[0]?.type).toBe('addClass');
    expect(mapped[1]?.type).toBe('addEnum');
    expect(mapped[2]?.type).toBe('addAttribute');
    expect(mapped[3]?.type).toBe('addOperation');
    expect(mapped[4]?.type).toBe('addRelationship');
  });

  it('comprueba disponibilidad de Gemini segun GEMINI_API_KEY', async () => {
    const configMock1 = {
      geminiApiKey: '',
      geminiModel: 'gemini-2.5-flash',
    } as unknown as ApiConfigService;

    const providerNoKey = new GeminiProvider(configMock1);
    expect(await providerNoKey.isAvailable()).toBe(false);

    const configMock2 = {
      geminiApiKey: 'valid_api_key_12345',
      geminiModel: 'gemini-2.5-flash',
    } as unknown as ApiConfigService;

    const providerWithKey = new GeminiProvider(configMock2);
    expect(await providerWithKey.isAvailable()).toBe(true);
  });

  describe('OllamaProvider', () => {
    const configMock = {
      ollamaBaseUrl: 'http://localhost:11434',
      ollamaModel: 'qwen2.5:3b',
      ollamaVisionModel: 'llava:7b',
    } as unknown as ApiConfigService;

    beforeEach(() => {
      vi.restoreAllMocks();
    });

    function mockTags(models: string[]): void {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ models: models.map((name) => ({ name })) }),
      } as unknown as Response);
    }

    it('esta disponible cuando el servidor responde y el modelo esta descargado', async () => {
      mockTags(['qwen2.5:3b']);

      await expect(new OllamaProvider(configMock).isAvailable()).resolves.toBe(true);
    });

    it('admite la etiqueta latest que anade Ollama', async () => {
      const bareConfig = { ...configMock, ollamaModel: 'llama3.2' } as unknown as ApiConfigService;
      mockTags(['llama3.2:latest']);

      await expect(new OllamaProvider(bareConfig).isAvailable()).resolves.toBe(true);
    });

    it('no esta disponible si el modelo configurado no se ha descargado', async () => {
      mockTags(['llama3.2:3b']);

      await expect(new OllamaProvider(configMock).isAvailable()).resolves.toBe(false);
    });

    it('no esta disponible si el servidor no responde', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('conexion rechazada'));

      await expect(new OllamaProvider(configMock).isAvailable()).resolves.toBe(false);
    });

    it('interpreta la respuesta aunque el modelo la envuelva en texto', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            response:
              '<think>Primero identifico las clases</think>\n' +
              'Aqui tienes el resultado:\n' +
              '```json\n{"explanation":"Dos clases","operations":[' +
              '{"type":"add_class","name":"Owner"}]}\n```',
          }),
      } as unknown as Response);

      const result = await new OllamaProvider(configMock).generateFromPrompt('una veterinaria');

      expect(result.explanation).toBe('Dos clases');
      expect(result.operations).toHaveLength(1);
      expect(result.operations[0]?.type).toBe('addClass');
    });

    it('explica el fallo cuando falta el modelo en tiempo de generacion', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as unknown as Response);

      await expect(
        new OllamaProvider(configMock).generateFromPrompt('una veterinaria'),
      ).rejects.toThrow(/ollama pull qwen2.5:3b/u);
    });

    it('usa el modelo multimodal para leer una imagen', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ response: '{"explanation":"ok","operations":[]}' }),
      } as unknown as Response);

      await new OllamaProvider(configMock).generateFromImage(Buffer.from('imagen'), 'image/png');

      const sentBody = fetchSpy.mock.calls[0]?.[1]?.body;
      const body = JSON.parse(typeof sentBody === 'string' ? sentBody : '{}') as { model?: string };
      expect(body.model).toBe('llava:7b');
    });
  });

  describe('extractJsonObject', () => {
    it('descarta la deliberacion de los modelos de razonamiento', () => {
      expect(extractJsonObject('<think>dudo</think> {"a":1}')).toBe('{"a":1}');
    });

    it('devuelve null si no hay ningun objeto', () => {
      expect(extractJsonObject('no he podido generarlo')).toBeNull();
    });
  });
});
