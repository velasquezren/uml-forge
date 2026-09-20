# 0020. Editor de diagramas de clases UML con React Flow y sincronizacion colaborativa Yjs

Fecha: 2026-08-30
Estado: Aceptado

## Contexto

El modelado visual interactivo de diagramas de clases UML 2.5 requiere representar
clasificadores (clases, interfaces, clases abstractas, enumeraciones) con sus
tres bandas clasicas, aristas con marcadores SVG estrictos (generalizacion,
realizacion, composicion, agregacion, asociacion, dependencia) y sincronizacion
en tiempo real entre multiples clientes colaborativos.

## Decision

1. **Adopcion de `@xyflow/react` para el lienzo visual**:
   - `UmlClassNode`: Caja de tres bandas (cabecera con estereotipos e interfaz,
     atributos con simbolos de visibilidad `+ - # ~`, operaciones con firma completa).
     Los clasificadores abstractos se renderizan en cursiva.
   - `UmlRelationshipEdge`: Aristas con marcadores SVG dedicados y etiquetas de
     multiplicidad y rol en los extremos.
   - `UmlSvgMarkers`: Definicion unica de los marcadores SVG en un elemento
     `<svg><defs>` global para evitar degradacion de rendimiento.

2. **CRDT Yjs como unica fuente de verdad en el cliente**:
   - El estado de React se deriva exclusivamente del `Y.Doc` mediante el hook
     `useYjsModel` suscrito a `observeDeep`.
   - Queda prohibido sincronizar modelos manualmente en `useState`.
   - Toda modificacion en el lienzo o inspector emite operaciones normalizadas
     (`applyOperationToYDoc`), garantizando consistencia determinista y libre de conflictos.
   - El arrastre de nodos emite `setPosition` actualizando exclusivamente las
     coordenadas del clasificador.

3. **Servidor Hocuspocus embebido en NestJS (`/collab`)**:
   - `CollabService` atiende los upgrades de WebSocket en `/collab`.
   - `onAuthenticate` valida el token JWT y verifica que el usuario sea miembro o
     propietario del proyecto, rechazando accesos no autorizados.
   - Persistencia binaria con `onLoadDocument` y `onStoreDocument` contra Prisma
     con debounce de 2 segundos.

## Consecuencias

- Experiencia de modelado fluida, reactiva y colaborativa en tiempo real.
- Sincronizacion transparente y determinista entre multiples pestañas/usuarios.
- Mapeo bidireccional puro y sin perdida entre el lienzo y `@uml-forge/uml-core`.
