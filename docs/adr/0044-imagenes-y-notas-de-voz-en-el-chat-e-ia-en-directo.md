# 0044. Imagenes y notas de voz en el chat, e IA en directo

Fecha: 2026-10-21
Estado: Aceptado. Amplia el ADR 0042.

## Contexto

Se pidio que el chat de grupo admitiera imagenes y audio, que la IA estuviera
optimizada y que se corrigieran detalles de uso. Midiendo la IA del chat en
Vertex con una pregunta tipica, la respuesta tardaba 7,2 s en llegar entera y
nadie veia nada hasta entonces.

## Decision

### Adjuntos

- Un mensaje puede llevar una imagen (PNG, JPEG o WebP) o una nota de voz
  (WebM/Opus de Chrome y Firefox, MP4/AAC de Safari, o MP3, WAV, OGG, AAC,
  FLAC subidos como fichero), de hasta 5 MB y 5 minutos. El texto pasa a ser
  opcional si hay adjunto.
- Se guardan en la tabla `chat_attachments`, separada de `chat_messages`, para
  que listar mensajes no arrastre binarios. La descarga va por
  `GET /api/projects/:id/chat/attachments/:id`, con los mismos permisos que el
  chat y cache inmutable: un adjunto no cambia nunca. La PWA los descarga con
  la cabecera de autenticacion y los muestra desde una URL local.
- Las imagenes se reducen en el navegador (2000 px, JPEG) antes de enviarlas,
  como en el asistente (ADR 0036). Se pueden pegar con Ctrl+V.
- Las notas de voz se graban con `MediaRecorder` y se transcriben siempre en el
  servidor con Gemini, para poder leerlas sin escucharlas; la IA solo responde
  si se le pregunta. La transcripcion se hace antes de responder, en la misma
  cola del proyecto.
- La IA recibe el adjunto del mensaje que responde tal cual (imagen o audio,
  sin pasar por texto) y, del historial, la mencion de las imagenes y la
  transcripcion de las notas de voz.
- Guardarlos en PostgreSQL basta para el uso previsto; si crecieran, el punto
  de cambio es `ChatService.attachment` y el alta en `send`, que pasarian a un
  almacen de objetos sin tocar el resto.

### IA optimizada

- Razonamiento acotado segun el modelo: `thinkingLevel: LOW` en Gemini 3 (7,2 s
  bajan a 5,7 s) y presupuesto de 1024 tokens en Gemini 2.5, que rechaza los
  niveles. La transcripcion usa el minimo (`MINIMAL`, o presupuesto 0).
- La respuesta llega en streaming: el texto de `reply` se extrae del JSON a
  medida que llega y se reparte como borrador, como mucho cada 300 ms y acotado
  a 2500 caracteres (NOTIFY admite 8000 bytes). Todos ven la respuesta mientras
  se escribe; el mensaje definitivo la sustituye al terminar.
- El cliente de Gemini se separa del proveedor (`GeminiClient`): reintentos,
  modelo de reserva y razonamiento en un solo sitio.

### Detalles corregidos

- La lista solo baja sola si se estaba mirando el final.
- Enter no envia mientras se compone un acento (`isComposing`).
- La caja de texto recibe el foco al abrir el chat y conserva lo escrito si el
  envio falla.
- Las respuestas fallidas de la IA llevan "Volver a preguntar", que vuelve a
  responder al mensaje original con su adjunto, sin duplicarlo.
- El primer borrador se publicaba 300 ms tarde por un reloj mal inicializado.

## Consecuencias

- Ollama, el respaldo local, entiende imagenes con su modelo de vision pero no
  audio: sin Gemini las notas de voz quedan sin transcribir.
- Los adjuntos ocupan espacio en Cloud SQL; con el limite de 5 MB y el uso de
  un proyecto academico, la instancia de 10 GB sobra.
