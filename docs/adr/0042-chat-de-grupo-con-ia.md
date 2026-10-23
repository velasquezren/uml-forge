# 0042. Chat de grupo con IA

Fecha: 2026-10-20
Estado: Aceptado. Amplia los ADR 0027, 0028 y 0040.

## Contexto

Se pidio un chat de grupo por proyecto en el que la IA participe: que entienda
el contexto (el diagrama y la conversacion), responda a quien pregunta a la
vista de todos, haga preguntas cuando algo no esta claro y pueda proponer y
llevar a cabo cambios del modelo. Debia usar la IA de Vertex ya configurada y
estar pensado para escalar.

El asistente existente (ADR 0028) es individual: la propuesta solo la ve quien
pregunta y se aplica desde su navegador con `applyOperation` del lienzo.

## Decision

### Datos

Tabla `chat_messages`: autor (persona o IA), contenido, si menciona a la IA, a
que mensaje responde y, en las respuestas de la IA, la propuesta (operaciones ya
normalizadas mas un resumen legible) con su estado `PENDING`, `APPLIED` o
`DISMISSED`, quien la resolvio y cuando. Indice por proyecto y fecha; el
historial se pagina hacia atras de 50 en 50.

### Tiempo real

- Server-Sent Events en `GET /api/projects/:id/chat/stream`, con latido cada
  20 s para que no lo corten proxies ni balanceadores. La PWA lo lee con
  `fetch` (el `EventSource` nativo no permite la cabecera `Authorization`), se
  reconecta con espera creciente y, al reconectar, pide la ultima pagina para
  recuperar lo perdido.
- Un bus de eventos intercambiable reparte los avisos entre instancias de la
  API: en memoria (`CHAT_EVENT_BUS=memory`) o PostgreSQL `LISTEN/NOTIFY`
  (`postgres`), que no anade infraestructura. Los eventos solo llevan
  identificadores (NOTIFY admite 8000 bytes); cada instancia lee el mensaje de
  la base de datos una vez y lo reparte a todas sus conexiones.
- El chat no viaja por el documento Yjs: crece sin limite y no es parte del
  modelo, y meterlo en el CRDT lo arrastraria a cada sincronizacion.

### IA

- Responde si el mensaje menciona `@ia` o si se marca "Preguntar a la IA"; el
  resto es conversacion entre personas. Tambien responde, sin `@ia`, cuando
  alguien contesta a una pregunta que la IA le acaba de hacer a esa misma
  persona (ultimo mensaje del chat, con "?", hace menos de 10 minutos): tras
  "¿Deseas anadir algo mas?", la respuesta "pon mas atributos a Student" iba al
  grupo y la IA no la atendia. El boton "Preguntar a la IA" se queda activado
  mientras se conversa con ella.
- Contexto: el modelo vivo leido de la memoria de Hocuspocus (la base de datos
  va unos segundos por detras), quien esta conectado y los 20 ultimos mensajes.
- `AiProvider.converse` en Gemini (esquema estructurado `reply` + `proposal`
  opcional) y en Ollama, con el mismo respaldo entre proveedores. Las reglas de
  modelado son las mismas que las del asistente y la propuesta pasa por la misma
  normalizacion (ADR 0035).
- Las preguntas de un proyecto se atienden en orden, una tras otra (como mucho
  5 en espera); proyectos distintos, en paralelo. Mientras piensa, todos ven
  "La IA esta preparando la respuesta para Ana".
- Si falla, publica un mensaje de error dirigido a quien pregunto.

### Aplicar propuestas

- La propuesta nunca se aplica sola (ADR 0028). La aplica o descarta cualquier
  editor; los lectores la ven pero no pueden resolverla.
- Se reclama de forma atomica (`UPDATE ... WHERE status = 'PENDING'`): si dos
  personas pulsan a la vez, la segunda recibe 409 con quien la resolvio.
- Se aplica **en el servidor**, con una conexion directa de Hocuspocus sobre el
  documento compartido: el cambio llega por el CRDT a todos los lienzos, se
  guarda aunque no haya nadie conectado y no depende de que el navegador de
  quien pulso siga abierto. Sube la revision del modelo (ADR 0034), por eso el
  contador de revisiones pasa a `uml-core`. Si no entra ninguna operacion, la
  propuesta vuelve a pendiente.

### Permisos

Leer, escribir y preguntar a la IA: cualquier miembro. Aplicar o descartar
propuestas: `EDITOR` u `OWNER`.

### Lo que lee el servidor

La IA del chat y el generador del backend leen el modelo del servidor. Para que
vean el ultimo cambio hecho en el lienzo, la PWA espera (como mucho 5 s) a que
el proveedor de colaboracion no tenga cambios pendientes antes de preguntar a la
IA o de generar el backend. Sin esa espera, anadir una clase y generar enseguida
devolvia a veces "el modelo no contiene ninguna clase". El generador lee ademas
el documento vivo en memoria, y no la copia de la base de datos, que va unos
segundos por detras.

## Consecuencias

- Los cambios aplicados desde el chat no estan en el historial de deshacer de
  ningun lienzo, porque no los hizo ningun navegador.
- Con `CHAT_EVENT_BUS=postgres` el chat ya funciona con varias instancias de la
  API. Lo que impide escalar la API es la colaboracion Yjs en memoria (ADR
  0041), no el chat.
- La conexion SSE, como la de colaboracion, mantiene encendida la instancia
  mientras el editor esta abierto.
