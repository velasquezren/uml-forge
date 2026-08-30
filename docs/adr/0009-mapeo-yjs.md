# 0009. Mapeo del modelo sobre el documento Yjs

Fecha: 2026-08-29
Estado: Aceptado

## Contexto

El modelo se edita simultaneamente desde varios navegadores y desde el servidor.
La estructura elegida para el `Y.Doc` determina que ediciones concurrentes se
fusionan limpiamente y cuales se pisan.

## Decision

### Forma del documento

Cuatro estructuras raiz: `classes`, `enums`, `relationships` y `meta`.

- Las tres colecciones son `Y.Map` **indexadas por identificador**, no `Y.Array`.
  Dos usuarios que crean clases a la vez escriben en claves distintas y no hay
  colision posible. Con un array, dos inserciones concurrentes compiten por la
  misma posicion.
- Cada clase es un `Y.Map` anidado. Sus `attributes` y `operations` son
  `Y.Array` de `Y.Map`, porque ahi el orden **si** es informacion visible: es el
  orden en que aparecen dentro de la caja UML.
- La posicion vive dentro del `Y.Map` de la clase, en un mapa anidado con `x` e
  `y`, de modo que arrastrar una clase no toca ningun otro nodo del documento.
- `meta` guarda `id`, `name`, `createdAt` y `updatedAt` del modelo.

### Orden de lectura

Como las colecciones son mapas, el orden de insercion no forma parte del estado
compartido. `fromYDoc` devuelve las clases, enumeraciones y relaciones
**ordenadas por identificador**, para que la reconstruccion sea determinista y
dos replicas produzcan exactamente el mismo objeto. La interfaz ordena por
nombre cuando lo necesita para mostrar.

### Precondiciones validadas una sola vez

`applyOperationToYDoc` no reimplementa las reglas del metamodelo:

1. reconstruye el modelo con `fromYDoc`;
2. delega en `applyOperation` la validacion completa de precondiciones;
3. si esta acepta, escribe **mutaciones nativas** sobre el CRDT dentro de una
   unica transaccion, tocando solo los nodos afectados.

Asi las reglas viven en un solo sitio y la escritura conserva la granularidad
que hace posible la edicion concurrente. El coste es una lectura completa del
documento por operacion, despreciable para modelos de decenas de clases.

## Consecuencias

- Un lote de operaciones se escribe en una sola transaccion Yjs, de modo que los
  demas clientes ven el cambio completo o no ven nada.
- `applyOperationToYDoc` acepta un `origin` de transaccion para que el cliente
  distinguga sus propios cambios de los que llegan por la red.
- La fusion de dos clases creadas sin conexion con el mismo nombre produce dos
  clases: el CRDT no puede saber que son la misma. Lo detecta `validateModel` y
  lo resolvera la politica de conflictos del modulo `sync` en la Fase 5. Hay una
  prueba que fija exactamente ese comportamiento.
