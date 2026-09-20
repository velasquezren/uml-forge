# 0028. Asistente de IA por voz e imagen en la PWA

Fecha: 2026-09-01
Estado: Aceptado

## Contexto

El ADR 0027 dejo preparada la costura del cliente (`features/ai/aiClient.ts`)
pero sin interfaz. Faltaban los escenarios 2 y 3 de la defensa: dictar el
dominio por voz y subir la foto de un diagrama en papel.

## Decision

### 1. La voz es nativa del navegador

Se usa la Web Speech API (`SpeechRecognition`, con el prefijo `webkit` para los
navegadores que aun lo exigen) en espanol, con tipos de
`@types/dom-speech-recognition` para no declararla a mano. No se descarga ningun
modelo de reconocimiento al navegador, coherente con el ADR 0018. Si la API no
existe, `isSupported` es falso, el boton de dictado queda inhabilitado con su
explicacion y la instruccion se escribe a mano: la funcionalidad degrada, no
desaparece.

El dictado no es continuo: al cerrar la frase se envia sola la instruccion, que
es como se usa en una demostracion en vivo. El hook aborta el reconocimiento al
desmontarse para no dejar el microfono abierto.

### 2. La imagen viaja en base64, con limites en el cliente

`readImageAsBase64` acepta PNG, JPEG y WebP hasta 5 MB, lee con `FileReader` y
quita el prefijo `data:` porque `POST /api/ai/image` espera base64 puro. Validar
en el cliente evita enviar por la red una foto que el servidor va a rechazar.

### 3. Nada se aplica sin confirmacion

La respuesta de la IA se muestra como propuesta: explicacion y lista de
operaciones. Solo al pulsar "Aplicar" se ejecutan, una a una, por
`applyOperation`. Una operacion que el metamodelo rechace no interrumpe a las
demas: `applyAiOperations` devuelve cuantas se aplicaron, cuantas fallaron y el
primer motivo.

Esto importa porque el modelo es compartido: aplicar a ciegas la salida de un
modelo de lenguaje modificaria el diagrama de todos los participantes.

### 4. Dos entradas a la misma funcion

- Un panel lateral en el editor, para no perder de vista el lienzo.
- La ruta `/projects/$projectId/assistant` con `AssistantLayout`, pantalla
  minimalista por voz con un resumen del modelo en lugar de lienzo.

Ambas usan el mismo `AiAssistantPanel`. La ruta del asistente monta `useYjsModel`
directamente, de modo que trabaja sobre el mismo documento Yjs que el lienzo y lo
que dicta un usuario aparece al instante en el diagrama de los demas.

## Consecuencias

- Los escenarios 2 y 3 se pueden demostrar de extremo a extremo.
- El asistente depende de que haya proveedor de IA disponible; el panel muestra
  cual esta activo y si responde, para no confundir un fallo de red con un fallo
  del producto.
- Queda pendiente la unica pieza del plan sin abordar: las pruebas E2E de
  navegador con Playwright.
