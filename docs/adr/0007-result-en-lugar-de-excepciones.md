# 0007. Result en lugar de excepciones en el metamodelo

Fecha: 2026-08-29
Estado: Aceptado

## Contexto

Las operaciones del metamodelo se aplican en tres sitios muy distintos: la
interfaz mientras alguien dibuja, la cola offline al reconectar y el modulo de
IA sobre respuestas de un modelo de lenguaje. En los tres casos un fallo es
esperable, no excepcional: la clase referenciada ya no existe, el nombre esta
repetido, el tipo no se resuelve.

Con excepciones, cada frontera tendria que envolver la llamada en try/catch y el
tipo del error se perderia por el camino.

## Decision

Toda operacion del metamodelo devuelve `Result<T, UmlError>`:

```ts
type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };
```

- `applyOperation`, `applyOperations`, `applyOperationToYDoc`, `fromYDoc` y
  `parseOperation` devuelven `Result`. Ninguna lanza.
- `UmlError` lleva un `code` de un catalogo cerrado (`class_not_found`,
  `duplicate_name`, `cyclic_inheritance`, ...), un mensaje en espanol, el
  `elementId` afectado y una `path` para localizar el problema.
- El codigo es lo que consumira el modulo `sync` de la Fase 5 para decidir entre
  `applied`, `skipped_duplicate` y `conflict`, y lo que permitira traducir los
  mensajes en la interfaz sin analizar cadenas.
- `applyOperations` es atomico y antepone el indice de la operacion culpable a
  la `path` del error.

## Consecuencias

- El compilador obliga a comprobar `result.ok` antes de usar `result.value`.
- No hay ningun `throw` en el codigo de produccion de `packages/uml-core`.
- Las fixtures de prueba si lanzan al construir un modelo invalido, porque ahi
  un fallo si es un error de programacion.
