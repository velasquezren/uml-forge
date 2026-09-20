# 0018. Eliminacion de IA local en navegador y uso exclusivo de IA en servidor

Fecha: 2026-08-30
Estado: Aceptado

## Contexto

El diseno inicial contemplaba una arquitectura dual con modelos de lenguaje
locales en el navegador (`@mlc-ai/web-llm` y `@huggingface/transformers` con
Web Workers) para ejecucion offline y una ruta dedicada `/assistant`.

Sin embargo, la ejecucion de LLMs y modelos de transcripcion locales en el
navegador introduce una sobrecarga masiva en memoria, descarga de gigabytes de
pesos y complejidad innecesaria. La IA local en dispositivo pertenece a un
proyecto movil separado, no a esta herramienta de escritorio/PWA.

## Decision

1. **Eliminacion de la IA local en el cliente**:
   - Queda estrictamente prohibido instalar o utilizar `@mlc-ai/web-llm` o
     `@huggingface/transformers`.
   - Se eliminan la ruta `/assistant`, el layout `AssistantLayout` y los Web
     Workers `whisper.worker.ts` y `webllm.worker.ts`.
   - Se eliminan las implementaciones `WebLlmClient` y `NoopClient`.

2. **IA centralizada en el servidor**:
   - Toda la IA de UML Forge corre en el servidor a traves de **Ollama** (Fase 8).
   - El cliente web se comunica exclusivamente con los endpoints de `/api/ai`.
   - Se conserva la abstraccion `AiClient` con su implementacion `ServerAiClient`
     para permitir sustituir o configurar proveedores compatibles con la API de
     OpenAI/Ollama en el backend sin afectar al cliente.

3. **Reconocimiento de voz nativo con Web Speech API**:
   - Para la entrada por voz se utiliza exclusivamente la API nativa del navegador
     (`webkitSpeechRecognition` / `SpeechRecognition`).
   - Se elimina la abstraccion con doble implementacion de reconocedores: queda una
     sola nativa. Si el navegador no la soporta, la interfaz degrada limpiamente
     a entrada directa de texto.
   - El dictado por voz asume conexion a la red para la interpretacion con el
     modelo del servidor.

4. **Reestructuracion del plan de fases**:
   - El proyecto pasa a constar de 10 fases (0 a 9).
   - La antigua Fase 9 (modo asistente local) queda eliminada.
   - La Fase 10 (cierre, datos semilla, tests E2E y documentacion) pasa a ser la **Fase 9**.

## Consecuencias

- Reduccion sustancial del peso del bundle del frontend y consumo de memoria.
- Arquitectura cliente-servidor mas limpia y mantenible.
- La IA en backend (Ollama) mantiene total capacidad y precision para procesar
  comandos de lenguaje natural e imagenes a operaciones UML.
