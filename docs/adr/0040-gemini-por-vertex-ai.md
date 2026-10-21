# 0040. Gemini por Vertex AI

Fecha: 2026-10-18
Estado: Aceptado. Amplia el ADR 0019.

## Contexto

Para el despliegue en Google Cloud se pidio usar Vertex AI. Con Vertex la API se
autentica con la cuenta de servicio del entorno en lugar de con una clave que
haya que guardar, rotar y proteger.

## Decision

- `GEMINI_USE_VERTEXAI=true` hace que `GeminiProvider` cree el cliente de
  `@google/genai` con `vertexai: true`, `GOOGLE_CLOUD_PROJECT` y
  `GOOGLE_CLOUD_LOCATION` (por defecto `global`). Las credenciales son las de
  Application Default Credentials: la cuenta de servicio en Cloud Run, o
  `gcloud auth application-default login` en local.
- Sin la variable, todo sigue como antes con `GEMINI_API_KEY`.
- Esquema de respuesta, reintentos, modelo de reserva y normalizacion son los
  mismos en ambos modos.
- En Vertex el alias `gemini-flash-latest` no existe: en Cloud Run se configura
  `GEMINI_MODEL=gemini-3.5-flash` y `GEMINI_FALLBACK_MODEL=gemini-2.5-flash`,
  comprobados contra el proyecto.
- Un 403 de Vertex explica que falta el rol `roles/aiplatform.user`.

## Consecuencias

- En Cloud Run no hay ninguna clave de IA que gestionar.
