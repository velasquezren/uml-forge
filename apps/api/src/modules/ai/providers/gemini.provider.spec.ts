import { ApiError } from '@google/genai';
import { describe, expect, it } from 'vitest';
import { formatModelContext } from '../ai-prompts';
import { describeGeminiError } from './gemini.provider';

describe('errores de Gemini', () => {
  const model = 'gemini-2.5-flash';

  it('traduce cada fallo de la API a una accion concreta', () => {
    expect(
      describeGeminiError(new ApiError({ status: 400, message: 'API key not valid' }), model),
    ).toContain('GEMINI_API_KEY no es valida');
    expect(describeGeminiError(new ApiError({ status: 403, message: 'denied' }), model)).toContain(
      'permiso',
    );
    expect(describeGeminiError(new ApiError({ status: 404, message: 'nope' }), model)).toContain(
      'GEMINI_MODEL',
    );
    expect(describeGeminiError(new ApiError({ status: 429, message: 'quota' }), model)).toContain(
      'cuota',
    );
    expect(describeGeminiError(new ApiError({ status: 503, message: 'busy' }), model)).toContain(
      'no esta disponible',
    );
    expect(describeGeminiError(new Error('Request timeout'), model)).toContain('tardo demasiado');
  });
});

describe('contexto del modelo para la IA', () => {
  it('muestra los tipos por nombre, no por identificador', () => {
    const enumId = '44444444-4444-4444-8444-444444444444';
    const context = formatModelContext({
      id: '10000000-0000-4000-8000-000000000001',
      name: 'Tienda',
      createdAt: '2026-09-27T00:00:00.000Z',
      updatedAt: '2026-09-27T00:00:00.000Z',
      enums: [{ id: enumId, name: 'Estado', literals: ['NUEVO'], position: { x: 0, y: 0 } }],
      relationships: [],
      classes: [
        {
          id: '11111111-1111-4111-8111-111111111111',
          name: 'Pedido',
          isAbstract: false,
          isInterface: false,
          stereotypes: [],
          position: { x: 0, y: 0 },
          operations: [],
          attributes: [
            {
              id: '22222222-2222-4222-8222-222222222222',
              name: 'estado',
              type: enumId,
              visibility: 'private',
              multiplicity: '1',
              isStatic: false,
              isDerived: false,
              isUnique: false,
              isNullable: false,
              isIdentifier: false,
              defaultValue: null,
            },
          ],
        },
      ],
    });

    expect(context).toContain('Clase Pedido { estado: Estado }');
    expect(context).not.toContain(enumId);
  });
});
