# 0035. Normalizacion de las propuestas de la IA y salida estructurada de Gemini

Fecha: 2026-09-27
Estado: Aceptado. Amplia los ADR 0019 y 0028.

## Contexto

Al usar el asistente sobre un modelo con contenido aparecian fallos que no
dependian del proveedor:

1. Al pedir "anade un telefono a Cliente" la IA devolvia la clase `Cliente` con
   el atributo nuevo y el mapeador creaba una segunda clase `Cliente`.
2. Los tipos llegaban como texto (`OrderStatus`, `int`, `LocalDateTime`). El
   metamodelo solo admite primitivos o identificadores, de modo que esas
   operaciones se rechazaban al aplicarlas.
3. Una relacion entre una clase y una enumeracion creaba una clase fantasma con
   el nombre de la enumeracion.
4. Las clases nuevas se colocaban en la esquina superior izquierda, encima de
   las existentes.
5. El contexto enviado a la IA mostraba los atributos de tipo enumeracion con su
   UUID, que la IA no podia reutilizar.
6. Gemini se usaba sin `responseSchema` ni instruccion de sistema, y si fallaba
   sin respaldo disponible el motivo real (clave invalida, cuota) se perdia tras
   un mensaje generico con codigo 200.

## Decision

- `normalizeAiOperations` depura toda propuesta, venga de Gemini o de Ollama,
  antes de devolverla: reutiliza clases y enumeraciones existentes por nombre,
  amplia los literales de una enumeracion existente con `updateEnum`, traduce
  los tipos (sinonimos de Java y SQL, colecciones como `List<T>` a
  multiplicidad `0..*`, desconocidos a `String`), no repite atributos,
  operaciones ni relaciones, convierte la relacion con una enumeracion en un
  atributo de ese tipo, anade `id: Long` a las clases concretas nuevas que no lo
  tienen ni lo heredan y coloca lo nuevo en filas bajo el diagrama existente
  con las superclases encima.
- Gemini usa `systemInstruction`, `responseMimeType: 'application/json'` con
  `responseSchema`, temperatura 0.2, limite de 120 segundos y los reintentos del
  SDK (3 intentos) ante 408, 429 y 5xx.
- Los errores de la API se traducen a mensajes accionables y, si ningun
  proveedor responde, la API contesta 503 con el motivo del primero.
- El contexto del modelo se envia en notacion compacta con los tipos por nombre,
  operaciones, multiplicidades y roles. El prompt fija el sentido de cada
  relacion (en la composicion el origen es el todo, como dibuja el lienzo) y las
  reglas para trabajar sobre un modelo existente.
- El proveedor por defecto pasa a ser `gemini`; Ollama queda como respaldo.

## Consecuencias

- Las pruebas de `ai-operation-normalizer.spec.ts` aplican la propuesta con
  `applyOperations` de `uml-core` sobre un modelo existente y exigen que ninguna
  operacion se rechace.
- La IA solo propone adiciones: renombrar o borrar sigue siendo manual, y la
  persona confirma siempre la propuesta (ADR 0028).
