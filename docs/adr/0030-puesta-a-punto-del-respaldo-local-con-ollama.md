# 0030. Puesta a punto del respaldo local con Ollama

Fecha: 2026-09-01
Estado: Aceptado

## Contexto

El ADR 0019 fijo Ollama como respaldo local de la IA. Al preparar las pruebas
sin conexion aparecieron tres motivos de fallo que solo se manifestaban al
usarlo de verdad:

1. El modelo por defecto era `deepseek-r1:8b`: pesado para un portatil y, por
   ser de razonamiento, antepone un bloque `<think>` a la respuesta que rompia
   el analisis del JSON.
2. La lectura de imagenes usaba el mismo modelo de texto. Un modelo sin vision
   devuelve cualquier cosa ante una imagen.
3. Si Ollama estaba arrancado pero el modelo no descargado, la peticion fallaba
   con un 404 a mitad de la generacion, sin decir que faltaba.

## Decision

- Modelo de texto por defecto `qwen2.5:3b`: unos 2 GB y buena adherencia al
  formato JSON. `llama3.2:3b` es una alternativa equivalente.
- Nueva variable `OLLAMA_VISION_MODEL`, por defecto `llava:7b`, para la lectura
  de diagramas. Para equipos con poca memoria, `moondream`.
- `isAvailable()` comprueba, ademas de que el servidor responda, que el modelo
  configurado este descargado, y registra el `ollama pull` que falta. Asi el
  asistente muestra "no disponible" antes de intentarlo, en lugar de fallar a
  media generacion.
- La respuesta se limpia antes de interpretarla: se descartan los bloques
  `<think>`, las vallas de codigo y cualquier texto alrededor del objeto JSON.
  Cualquier modelo pequeno sirve mientras el JSON este dentro de la respuesta.
- Las llamadas llevan limite de tiempo: 180 segundos para generar, 2 para
  sondear. Un modelo local en CPU es lento, pero no puede dejar colgada la
  peticion del usuario.

## Consecuencias

- Probar sin internet requiere `ollama pull qwen2.5:3b` y, para imagenes,
  `ollama pull llava:7b`.
- El contrato de `AiProvider` no cambia: Gemini y Ollama siguen pasando las
  mismas pruebas.
- Un modelo distinto al recomendado funciona si sigue instrucciones y devuelve
  JSON; no hay nada especifico de `qwen2.5` en el codigo.
