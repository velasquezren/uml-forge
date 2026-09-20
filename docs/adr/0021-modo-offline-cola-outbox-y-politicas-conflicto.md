# 0021. Modo offline, cola de salida Outbox en IndexedDB y politicas de resolucion de conflictos

Fecha: 2026-08-30
Estado: Aceptado

## Contexto

Cuando un usuario pierde la conexion a internet, debe poder continuar modelando
y generando cambios. Se requiere persistencia local del documento Yjs (`y-indexeddb`),
una cola de salida Outbox en IndexedDB para operaciones y un endpoint de sincronizacion
en el servidor (`POST /api/projects/:id/operations`) que procese lotes de operaciones
de forma idempotente y aplique politicas deterministas de resolucion de conflictos.

## Decision

1. **Persistencia Local y Cola Outbox en IndexedDB**:
   - `y-indexeddb` almacena localmente las actualizaciones del `Y.Doc`.
   - La cola Outbox (`uml-forge-outbox-db`, store `outbox_operations`) almacena las
     operaciones generadas localmente durante la desconexion, ordenadas por secuencia (`seq`).
   - Se prohibe estrictamente el uso de `localStorage`.
   - Indicador visual reactivo en tres estados: `Sincronizado`, `Sin conexion, N cambios pendientes`
     y `Reconectando...`.

2. **Idempotencia en Servidor por `batchId`**:
   - Cada lote enviado por el cliente incluye un identificador unico `batchId` (UUID).
   - Si el servidor recibe un `batchId` ya procesado previamente, retorna inmediatamente
     los resultados almacenados en `OperationLog` sin re-ejecutar mutaciones sobre el modelo.

3. **Las Tres Politicas Obligatorias de Resolucion de Conflictos**:
   - **Politica 1: Clase creada con nombre ya existente**: No se duplica. Se devuelve
     `skipped_duplicate` con el `existingId` de la clase existente para que el cliente reapunte
     sus referencias dependientes.
   - **Politica 2: Operacion que referencia un elemento borrado o inexistente**: Se marca como
     `conflict`, no se aplica sobre el modelo y se devuelve la razon detallada para informar al usuario.
   - **Politica 3: Modificaciones concurrentes y renombrados**: Se aplican sobre el `Y.Doc`
     vivo mediante `applyOperationToYDoc`. Si la operacion viola invariantes del metamodelo,
     se mapea el codigo de error (`UmlError.code`) a `conflict` o `skipped_duplicate`. Todas las
     operaciones procesadas quedan registradas en `OperationLog`.

## Consecuencias

- El cliente modela sin interrupciones incluso sin conexion a internet.
- Al reconectar, la sincronizacion es automatica, idempotente y transparente para el usuario.
- Consistencia total entre el CRDT en tiempo real y la cola de operaciones offline.
