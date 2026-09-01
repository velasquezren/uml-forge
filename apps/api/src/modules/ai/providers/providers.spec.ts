import { describe, expect, it, vi } from 'vitest';
import type { ApiConfigService } from '../../../config/config.service';
import { mapAiOperationsToUmlOperations } from '../ai-operation-mapper';
import { GeminiProvider } from './gemini.provider';
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

  it('comprueba conexion a Ollama mediante ping a /api/tags', async () => {
    const configMock = {
      ollamaBaseUrl: 'http://localhost:11434',
      ollamaModel: 'deepseek-r1:8b',
    } as unknown as ApiConfigService;

    const provider = new OllamaProvider(configMock);

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ models: [{ name: 'deepseek-r1:8b' }] }),
    } as unknown as Response);

    const available = await provider.isAvailable();
    expect(available).toBe(true);
    expect(fetchSpy).toHaveBeenCalled();
  });
});
