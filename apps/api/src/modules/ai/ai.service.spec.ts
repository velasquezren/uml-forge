import { Test, type TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiConfigService } from '../../config/config.service';
import { AiService } from './ai.service';
import { GeminiProvider } from './providers/gemini.provider';
import { OllamaProvider } from './providers/ollama.provider';

describe('AiService', () => {
  let service: AiService;
  let configService: { aiProvider: 'gemini' | 'ollama'; geminiModel: string; ollamaModel: string };
  let geminiProvider: {
    providerName: string;
    isAvailable: ReturnType<typeof vi.fn>;
    generateFromPrompt: ReturnType<typeof vi.fn>;
    generateFromImage: ReturnType<typeof vi.fn>;
    suggestRefinements: ReturnType<typeof vi.fn>;
  };
  let ollamaProvider: {
    providerName: string;
    isAvailable: ReturnType<typeof vi.fn>;
    generateFromPrompt: ReturnType<typeof vi.fn>;
    generateFromImage: ReturnType<typeof vi.fn>;
    suggestRefinements: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    configService = {
      aiProvider: 'gemini',
      geminiModel: 'gemini-2.5-flash',
      ollamaModel: 'deepseek-r1:8b',
    };

    geminiProvider = {
      providerName: 'gemini',
      isAvailable: vi.fn().mockResolvedValue(true),
      generateFromPrompt: vi.fn().mockResolvedValue({
        explanation: 'Modelo generado con Gemini',
        operations: [{ type: 'addClass', class: { id: 'c1', name: 'User' } }],
      }),
      generateFromImage: vi.fn().mockResolvedValue({
        explanation: 'Boceto interpretado con Gemini',
        operations: [{ type: 'addClass', class: { id: 'c2', name: 'Product' } }],
      }),
      suggestRefinements: vi.fn().mockResolvedValue({
        explanation: 'Refinamiento sugerido',
        operations: [],
      }),
    };

    ollamaProvider = {
      providerName: 'ollama',
      isAvailable: vi.fn().mockResolvedValue(true),
      generateFromPrompt: vi.fn().mockResolvedValue({
        explanation: 'Modelo generado con Ollama',
        operations: [{ type: 'addClass', class: { id: 'c3', name: 'Order' } }],
      }),
      generateFromImage: vi.fn().mockResolvedValue({
        explanation: 'Boceto interpretado con Ollama',
        operations: [{ type: 'addClass', class: { id: 'c4', name: 'Invoice' } }],
      }),
      suggestRefinements: vi.fn().mockResolvedValue({
        explanation: 'Refinamiento con Ollama',
        operations: [],
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        { provide: ApiConfigService, useValue: configService },
        { provide: GeminiProvider, useValue: geminiProvider },
        { provide: OllamaProvider, useValue: ollamaProvider },
      ],
    }).compile();

    service = module.get<AiService>(AiService);
  });

  it('debe consultar el estado del proveedor activo', async () => {
    const status = await service.getStatus();
    expect(status.provider).toBe('gemini');
    expect(status.available).toBe(true);
    expect(status.model).toBe('gemini-2.5-flash');
  });

  it('debe generar operaciones a partir de texto usando el proveedor primario', async () => {
    const result = await service.generateFromPrompt({ prompt: 'Crea un modelo de usuarios' });
    expect(result.explanation).toBe('Modelo generado con Gemini');
    expect(result.operations).toHaveLength(1);
    expect(geminiProvider.generateFromPrompt).toHaveBeenCalled();
  });

  it('debe conmutar transparentemente a Ollama si Gemini falla', async () => {
    geminiProvider.generateFromPrompt.mockRejectedValueOnce(new Error('Quota exceeded'));
    const result = await service.generateFromPrompt({ prompt: 'Crea un modelo de usuarios' });

    expect(result.explanation).toContain('[Respaldo ollama]');
    expect(ollamaProvider.generateFromPrompt).toHaveBeenCalled();
  });

  it('debe interpretar imagenes correctamente', async () => {
    const result = await service.generateFromImage({
      imageBase64:
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      mimeType: 'image/png',
      prompt: 'Analiza el boceto',
    });

    expect(result.explanation).toBe('Boceto interpretado con Gemini');
    expect(result.operations).toHaveLength(1);
  });

  it('debe sugerir refinamientos sobre un modelo existente', async () => {
    const result = await service.refineModel({
      model: {
        id: 'm1',
        name: 'Test',
        classes: [],
        enums: [],
        relationships: [],
        createdAt: '2026-08-30T00:00:00Z',
        updatedAt: '2026-08-30T00:00:00Z',
      },
    });

    expect(result.explanation).toBe('Refinamiento sugerido');
  });
});
