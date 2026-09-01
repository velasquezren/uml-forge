---
name: fase-04-editor-canvas
description: Fase 4 de UML Forge. Lienzo React Flow con nodos y aristas UML dibujados a mano, panel de propiedades, Yjs con Hocuspocus, presencia y cursores. Verificable abriendo tres pestanas del mismo proyecto.
---

# Fase 4: editor colaborativo

## Prerrequisitos

Fase 3 completada. `packages/uml-core` disponible como `workspace:*`.

## Codigo de dominio: se escribe a mano

Los nodos y aristas UML no los genera ninguna CLI. Son la parte visual propia
del producto.

## Nodo `UmlClassNode`

Caja UML clasica, en tres bandas separadas por lineas:

1. Nombre. **Cursiva si `isAbstract`.** Con `<<interface>>` encima si
   `isInterface`. Los estereotipos se muestran como `<<nombre>>`.
2. Atributos: `+ - # ~` segun visibilidad, luego `nombre: Tipo [multiplicidad]`.
   La multiplicidad solo se muestra si no es `1`.
3. Operaciones: `+ nombre(param: Tipo): Retorno`. Sin retorno si es `null`.

El simbolo por visibilidad: `public` es `+`, `private` es `-`, `protected` es
`#`, `package` es `~`.

## Aristas con marcadores SVG correctos

Se definen como `marker` de SVG propios. No se aproximan con flechas genericas.

| Tipo           | Marcador                                          |
| -------------- | ------------------------------------------------- |
| Generalizacion | Triangulo hueco cerrado en el destino             |
| Realizacion    | Triangulo hueco en el destino + linea discontinua |
| Composicion    | Rombo relleno en el origen                        |
| Agregacion     | Rombo hueco en el origen                          |
| Asociacion     | Linea simple, flecha abierta si es navegable      |
| Dependencia    | Linea discontinua con flecha abierta              |

Multiplicidades y roles como etiquetas en los extremos de la arista.

## Colaboracion

- Un `Y.Doc` por proyecto.
- `HocuspocusProvider` contra `/collab`, con el JWT como parametro de conexion.
- Awareness para cursores, seleccion y color por usuario.
- **El estado de React se deriva del `Y.Doc`** mediante un hook `useYjsModel`
  suscrito a `observeDeep`. La fuente de verdad es el CRDT, nunca el estado de
  React. Un `useState` que guarde el modelo y se sincronice "a mano" es el fallo
  clasico de esta fase: produce parpadeos y perdida de cambios remotos.
- Toda edicion pasa por `applyOperationToYDoc`, nunca por mutacion directa del
  documento desde los componentes.
- Arrastrar una clase emite `setPosition`, que solo toca el mapa `position` de
  esa clase.

## Servidor: modulo collab

Servidor Hocuspocus **embebido en el mismo proceso Nest**, escuchando el upgrade
de WebSocket en `/collab`. Extension de persistencia propia contra Prisma con
`onLoadDocument` y `onStoreDocument`, con **debounce de 2 segundos**.

`onAuthenticate` valida el JWT y **rechaza la conexion si el usuario no es
miembro del proyecto**. Sin esa comprobacion, cualquiera con un token valido
edita cualquier proyecto.

El estado se guarda como `Bytes`. Jamas como JSON.

## Panel de propiedades

Editar nombre, visibilidad, tipo, multiplicidad y banderas del elemento
seleccionado. Cada cambio emite una operacion del lenguaje; nada se escribe
directamente sobre el modelo.

## Criterio de terminado

- Tres pestanas del mismo proyecto muestran los cambios de las demas en tiempo
  real, con cursores y colores distintos.
- Recargar una pestana recupera el modelo desde el servidor sin duplicar nada.
- Las seis clases de arista se distinguen visualmente.
- `pnpm typecheck && pnpm lint && pnpm test && pnpm build` en verde.

## Trampas conocidas

- Duplicacion de contenido al reconectar: casi siempre significa que el `Y.Doc`
  se persistio como JSON y se reconstruyo, en lugar de guardar el binario.
- Hocuspocus 4 exige Node 22 o superior.
- React Flow necesita altura explicita en su contenedor o el lienzo no se ve.
- Los marcadores SVG se definen una vez en un `<defs>` del documento y se
  referencian por identificador; definirlos por arista degrada el rendimiento.
