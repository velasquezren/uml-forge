# 0024. Lienzo controlado, posicion de enumeraciones e interoperabilidad XMI en el cliente

Fecha: 2026-08-31
Estado: Aceptado

## Contexto

Al ejercitar el editor de la Fase 4 con el paquete XMI de la Fase 7 ya construido
aparecieron cuatro carencias que impedian usar el diagramador de verdad:

1. El lienzo recibia `nodes` y `edges` derivados del modelo pero no entregaba
   `onNodesChange` a React Flow. En modo controlado, sin ese manejador React
   Flow no aplica los cambios de posicion, de modo que **ningun nodo se podia
   arrastrar**.
2. `UMLEnum` no tenia `position`. Las enumeraciones se dibujaban en coordenadas
   calculadas a partir de su indice en la lista, asi que al soltarlas volvian a
   su sitio y su lugar en el diagrama no sobrevivia a una recarga.
3. Las aristas se anclaban siempre al primer conector declarado en el nodo, con
   lo que todas las relaciones salian y entraban por el mismo lado.
4. El inspector de propiedades trabajaba sobre la copia del elemento capturada
   en el momento del clic. Cualquier edicion propia o remota la dejaba obsoleta.

Ademas, `@uml-forge/xmi` existia como libreria pero ninguna aplicacion lo
importaba: no habia forma de exportar ni de importar un modelo desde el producto.

## Decision

### 1. Estado local del lienzo, con el CRDT como fuente de verdad

`EditorCanvas` mantiene su propia lista de nodos y aristas y la reimpone desde
el modelo en cuanto este cambia. React Flow es duenno de las posiciones durante
el arrastre; al soltar se emite `setPosition` y el `Y.Doc` vuelve a mandar. La
regla de la Fase 4 se mantiene: el estado de React se deriva del CRDT y toda
edicion pasa por `applyOperationToYDoc`. Lo que se anade es un estado de
interaccion efimero, no una segunda copia del modelo.

### 2. Las enumeraciones ocupan un lugar propio en el lienzo

`UMLEnumSchema` gana `position`, igual que `UMLClassSchema`. En consecuencia:

- `EnumInputSchema` la admite con valor por defecto `{ x: 0, y: 0 }`.
- `buildEnumMap` la escribe en el documento Yjs dentro del mapa de la enumeracion.
- La operacion `setPosition` acepta el identificador de una clase **o** de una
  enumeracion. Se reutiliza la operacion existente en lugar de anadir un
  decimoseptimo verbo: el lenguaje de operaciones sigue teniendo dieciseis.
- El exportador XMI escribe las coordenadas de las enumeraciones en la misma
  extension `<xmi:Extension extender="UMLForge">` que las de las clases, y el
  auto-layout las coloca en una capa propia por debajo de la jerarquia.

### 3. Aristas flotantes

`UmlRelationshipEdge` calcula sus anclajes con `useInternalNode`: corta la recta
que une los centros de los dos nodos contra el borde de cada rectangulo. La
arista nace y muere en el lado que mira al otro clasificador, que es como se lee
un diagrama de clases. Los conectores del nodo siguen existiendo para iniciar el
arrastre de una conexion nueva.

### 4. La seleccion es una referencia, no una copia

La pagina del editor guarda `{ type, id }` y vuelve a leer el elemento del modelo
en cada render con `resolveSelection`. Si otro participante lo borra, la
seleccion se vacia sola.

### 5. La interoperabilidad XMI corre en el navegador

Exportacion e importacion se ejecutan en el cliente, no en la API:

- El modelo vivo esta en el `Y.Doc`, no en una tabla; el servidor tendria que
  reconstruirlo para serializarlo y volver a inyectarlo para importarlo.
- Escribiendo el modelo importado sobre el CRDT con `writeModel`, el reemplazo
  viaja solo al resto de participantes y sobrevive a la recarga.
- Funciona sin conexion, que es el punto de la PWA (Fase 5).

Para que esto sea posible, `@uml-forge/xmi` deja de depender de `node:crypto` y
genera identificadores con `createId()` de `@uml-forge/uml-core`, que usa la API
nativa de la plataforma. El paquete queda isomorfo: mismo codigo en Node y en el
navegador.

### 6. El auto-layout solo entra si faltan coordenadas

`importXmi` ejecutaba `autoLayout` siempre, porque la condicion era
`autoLayout || sinPosiciones` y la opcion vale `true` por defecto. Se corrige a
`autoLayout && sinPosiciones`: una herramienta externa que si exporta posiciones
no debe ver su diagrama recolocado. La opcion pasa a significar "permite el
auto-layout cuando haga falta", que es lo que promete el ADR 0023.

## Consecuencias

- Se puede crear, arrastrar, conectar, editar y borrar en el lienzo, y el
  resultado se comparte y persiste.
- Un modelo se lleva a Enterprise Architect o Papyrus y vuelve conservando su
  disposicion en el lienzo.
- Cualquier consumidor de `UMLEnum` debe aportar `position`; el generador de
  Spring Boot la ignora, porque no afecta al codigo generado.
- La importacion **reemplaza** el modelo completo. Se confirma en un dialogo
  antes de aplicarla y es reversible con deshacer.
