# 0043. Coleccion de Postman en el backend generado

Fecha: 2026-10-20
Estado: Aceptado. Amplia los ADR 0025 y 0038.

## Contexto

Para probar el backend Spring Boot generado habia que escribir a mano cada
peticion en Postman: rutas, cuerpos JSON y el orden en que crear las entidades
relacionadas. Al hacerlo de verdad con los seis modelos de prueba aparecio
ademas un fallo que hacia imposible la prueba:

1. Cualquier `GET` de una entidad con relaciones respondia 500. Los
   controladores devuelven la entidad JPA, las relaciones son perezosas y
   `spring.jpa.open-in-view=false` cerraba la sesion antes de escribir el JSON
   (`LazyInitializationException`).
2. Con la sesion abierta, las relaciones bidireccionales (`Order.items[].order`)
   entraban en un ciclo infinito al serializar.

## Decision

- El ZIP incluye la carpeta `postman/` con:
  - `<artifactId>.postman_collection.json` (formato v2.1): una carpeta de
    comprobacion (`/v3/api-docs`), una por entidad concreta con Crear, Listar,
    Obtener, Actualizar, y una de Limpieza que borra y comprueba que el registro
    ya no existe. Cada peticion lleva pruebas de estado.
  - `<artifactId>.postman_environment.json`: `baseUrl` con el puerto elegido.
  - `README.md`: guia de importacion y ejecucion con las rutas y los cuerpos
    reales del modelo.
- Las entidades se crean en orden topologico segun las relaciones propietarias
  (clave ajena o tabla intermedia); `Crear` guarda el id en una variable de la
  coleccion y las siguientes la envian como `{ "id": {{orderId}} }`. La
  limpieza borra en orden inverso. Los ciclos se rompen omitiendo la referencia
  que los cierra; la autorreferencia y las referencias a clases abstractas no se
  envian.
- Los valores de ejemplo dependen del tipo Java. Los `String` unicos llevan
  `{{$randomUUID}}` para poder repetir la ejecucion sin reiniciar.
- La ruta de cada entidad sale de `entityBasePath`, la misma funcion que usa el
  controlador, y el README principal pasa a usarla tambien.
- `spring.jpa.open-in-view=true`, y cada campo de relacion lleva
  `@JsonIgnoreProperties` con las relaciones de la jerarquia de la entidad
  destino mas `hibernateLazyInitializer` y `handler`: una entidad anidada se
  devuelve con sus atributos y sin sus relaciones, lo que corta cualquier ciclo
  sea cual sea la forma del grafo.

## Alternativas descartadas

- **Devolver DTO en lugar de entidades**: es la solucion de fondo, pero cambia
  el contrato de todos los controladores generados. Queda como mejora futura.
- **`jackson-datatype-hibernate6`**: anade una dependencia y no evita los
  ciclos de las relaciones uno a uno, que se cargan de forma inmediata.
- **Importar la coleccion desde `/v3/api-docs`**: Postman lo permite y la guia
  lo menciona, pero no trae orden de ejecucion, datos de ejemplo ni pruebas.

## Consecuencias

- Los seis modelos de prueba se generaron, se compilaron con Maven, se
  arrancaron con H2 y su coleccion se ejecuto con Newman sin fallos.
- `open-in-view` mantiene la conexion durante toda la peticion y puede provocar
  consultas N+1 al listar. Es aceptable para un backend de partida.
- `PUT` sigue sustituyendo el registro entero: en una composicion, actualizar
  el padre sin la lista de hijos los borra. La guia lo advierte.
