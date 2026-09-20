# 0027. Costura de la IA en el cliente antes de construir su interfaz

Fecha: 2026-09-01
Estado: Aceptado

## Contexto

La Fase 8 dejo el modulo de IA operativo en el servidor: `GET /api/ai/status`,
`POST /api/ai/generate`, `POST /api/ai/image` y `POST /api/ai/refine`, con
Gemini por defecto y Ollama como respaldo (ADR 0019). La PWA todavia no consume
ninguno de esos endpoints: no hay asistente por voz ni carga de imagenes, de
modo que los escenarios de aceptacion 2 y 3 no se pueden demostrar.

Esa interfaz se construye al final, cuando el resto del producto este cerrado.
Para no rehacer el trabajo, se decide ahora por donde entrara.

## Decision

`apps/web/src/features/ai/aiClient.ts` es el unico punto de contacto entre la
PWA y el modulo de IA:

- `fetchAiStatus`, `generateFromPrompt`, `generateFromImage` y `refineModel`
  devuelven un resultado explicito (`{ ok: true, suggestion }` o
  `{ ok: false, error }`), igual que la descarga del backend, en lugar de
  lanzar excepciones al componente que las llama.
- `applyAiOperations` aplica las operaciones sugeridas mediante la funcion
  `applyOperation` que el lienzo publica en `EditorCanvasHandlers`. La IA no
  escribe en el `Y.Doc`: usa el mismo camino que la paleta, el inspector y la
  importacion XMI, con lo que hereda el deshacer, la sincronizacion y las
  politicas de conflicto sin codigo adicional.

La interfaz pendiente (reconocimiento de voz con la Web Speech API nativa,
subida de la foto de un diagrama y panel de sugerencias) solo tendra que
construir componentes y llamar a estas cuatro funciones.

## Consecuencias

- La fase de IA en el cliente se reduce a interfaz de usuario.
- Ningun otro modulo puede llamar a los endpoints de IA por su cuenta: si
  aparece una segunda via de escritura en el modelo, se rompe la garantia de que
  todo cambio pasa por `applyOperationToYDoc`.
- Mientras la interfaz no exista, el cliente esta cubierto por pruebas
  unitarias, no por uso real.
