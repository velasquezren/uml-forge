# 0019. Proveedor de IA por defecto con Gemini Developer API y respaldo local en Ollama

Fecha: 2026-08-30
Estado: Aceptado

## Contexto

El diseno del servicio de IA en backend (`/api/ai`) requiere interpretar
comandos en lenguaje natural y bocetos/imagenes para convertirlos en operaciones
validas del metamodelo UML 2.5 (`@uml-forge/uml-core`).

Inicialmente se considero Ollama como unico motor en servidor. Sin embargo, para
el entorno de produccion y desarrollo cloud, la API de Gemini ofrece mayor
velocidad, capacidad multimodal superior para bocetos y garantiza salidas
estructuradas fiables. A la vez, es indispensable contar con un respaldo local
(Ollama) para operar en entornos sin conexion o en demostraciones desconectadas.

## Decision

1. **Adopcion del SDK unificado `@google/genai`**:
   - Se utiliza `@google/genai` con autenticacion por API Key (`GEMINI_API_KEY`).
   - Se descarta Vertex AI para evitar dependencias de proyectos GCP y service
     accounts (el SDK unificado permite migrar posteriormente modificando unicamente
     la inicializacion del cliente si fuera necesario).
   - El modelo se configura exclusivamente mediante la variable de entorno
     `GEMINI_MODEL` (nunca fijado en codigo).

2. **Salida estructurada obligatoria**:
   - Todas las llamadas a Gemini configuran `responseMimeType: 'application/json'`
     junto con `responseSchema` derivado de los esquemas Zod de `@uml-forge/uml-core`,
     tanto para entradas de texto como de imagenes/bocetos.

3. **Arquitectura desacoplada con `AiProvider` y doble implementacion**:
   - Se define la interfaz comun `AiProvider` en `apps/api`.
   - Implementaciones:
     - `GeminiProvider`: Proveedor por defecto (`AI_PROVIDER=gemini`).
     - `OllamaProvider`: Proveedor de respaldo local (`AI_PROVIDER=ollama`).
   - Ambas implementaciones deben satisfacer el mismo conjunto de **pruebas de
     contrato** (contract tests) para garantizar intercambiabilidad transparente.

## Consecuencias

- Excelente precision multimodal y velocidad mediante Gemini Developer API.
- Capacidad de funcionamiento 100% desconectado conmutando a Ollama vía configuracion.
- Flexibilidad de arquitectura sin acoplamiento a un unico proveedor de IA.
