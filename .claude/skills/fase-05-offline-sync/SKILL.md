---
name: fase-05-offline-sync
description: Fase 5 de UML Forge. Persistencia local con y-indexeddb, cola de salida en IndexedDB, modulo sync en la API con idempotencia por batchId, las tres politicas de conflicto e indicadores de estado de sincronizacion.
---

# Fase 5: modo offline y sincronizacion

## Prerrequisitos

Fase 4 completada y funcionando entre varias pestanas.

## Cliente

- `IndexeddbPersistence` de `y-indexeddb` para el estado local del `Y.Doc`.
- Cola de salida en IndexedDB con `idb`: las operaciones generadas por IA o por
  el modo asistente se encolan cuando no hay conexion y se drenan contra
  `POST /api/projects/:id/operations` al reconectar.
- **Nada de `localStorage`.** Solo IndexedDB.
- Indicador visible con tres estados: `sincronizado`,
  `sin conexion, N cambios pendientes`, `reconectando`.
- Al drenar la cola se muestra al usuario el resultado de **cada** operacion,
  incluidos los conflictos.

## Servidor: modulo sync

```
POST /api/projects/:id/operations
{ "clientId": "uuid", "batchId": "uuid",
  "operations": [ { "seq": 1, "op": { ... } } ] }
```

- **Idempotente por `batchId`**: reenviar el mismo lote no aplica nada dos veces.
  Es lo que ocurre de verdad cuando la respuesta se pierde y el cliente reintenta.
- Aplica las operaciones sobre el `Y.Doc` vivo del proyecto.
- Devuelve por cada operacion: `applied`, `skipped_duplicate` o `conflict` con
  el motivo.
- Registra todo en `OperationLog`.

## Las tres politicas de conflicto (obligatorias)

1. **Clase creada con nombre ya existente**: no duplicar. Devolver
   `skipped_duplicate` **con el identificador de la clase existente**, para que
   el cliente reapunte sus referencias.
2. **Operacion que referencia un elemento borrado**: `conflict`, no se aplica, se
   reporta al cliente para que el asistente lo consulte al usuario.
3. **Renombrados concurrentes**: gana el ultimo por marca temporal. **Ambos
   quedan en `OperationLog`**, para poder explicar despues que paso.

Las tres se documentan en un ADR.

## Como se detectan

Los codigos de `UmlError` que devuelve `uml-core` son la fuente:

| Codigo                                                                                                                            | Politica                                |
| --------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| `duplicate_name` al crear una clase                                                                                               | `skipped_duplicate` con el id existente |
| `class_not_found`, `attribute_not_found`, `operation_not_found`, `relationship_not_found`, `enum_not_found`, `dangling_reference` | `conflict`                              |
| `invalid_payload`                                                                                                                 | `conflict` con el detalle de validacion |
| Sin error                                                                                                                         | `applied`                               |

**No se analizan cadenas de texto de mensajes.** Solo codigos.

## Criterio de terminado

- Prueba real: activar el modo sin conexion del navegador, editar, reconectar, y
  comprobar que los cambios se fusionan sin perder ni duplicar nada.
- Reenviar el mismo `batchId` no cambia el modelo.
- Los tres estados del indicador se ven en las tres situaciones.
- `pnpm typecheck && pnpm lint && pnpm test && pnpm build` en verde.

## Trampas conocidas

- El CRDT ya fusiona solo: la cola de salida **no** sustituye a Yjs, cubre las
  operaciones que se generaron sin conexion y necesitan validacion del servidor
  (las de la IA), y sirve para reportar conflictos al usuario.
- Dos clases creadas sin conexion con el mismo nombre sobreviven ambas tras la
  fusion del CRDT. Es comportamiento esperado y hay una prueba en `uml-core` que
  lo fija. La politica 1 lo evita solo en el camino de la cola, no en el de Yjs.
- Guardar la cola con la clave equivocada hace que dos pestanas de la misma
  sesion se pisen: la clave incluye `clientId` y `projectId`.
