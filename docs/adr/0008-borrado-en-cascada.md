# 0008. Borrado en cascada de referencias

Fecha: 2026-08-29
Estado: Aceptado

## Contexto

Al borrar una clase o una enumeracion, el modelo queda lleno de referencias
huerfanas: relaciones que apuntan a la nada, atributos con un tipo que ya no
existe, parametros y tipos de retorno colgando. Habia tres politicas posibles:

1. Rechazar el borrado mientras existan referencias.
2. Permitir el borrado y dejar el modelo invalido hasta que alguien lo arregle.
3. Borrar en cascada todo lo que dependia del elemento.

## Decision

Se adopta la tercera: **el borrado es en cascada**.

Al borrar una clase se eliminan, en la misma operacion:

- todas las relaciones en las que participa como origen o como destino;
- todos los atributos de cualquier clase cuyo tipo fuese esa clase;
- todos los parametros de cualquier operacion cuyo tipo fuese esa clase;
- el tipo de retorno de las operaciones que la devolvian pasa a `null`, que en
  el metamodelo significa "sin valor de retorno".

Al borrar una enumeracion se aplica la misma limpieza de referencias de tipo.

El motivo es que el modelo debe estar **siempre** en un estado valido. Es un
documento CRDT replicado entre varios navegadores y un servidor: no existe un
momento tranquilo en el que alguien pueda repararlo antes de que otro lo lea o
antes de que el generador lo consuma. La opcion 1 haria imposible borrar una
clase muy usada sin un desmontaje manual previo; la opcion 2 trasladaria el
problema al generador de Spring Boot, que es el peor lugar para descubrirlo.

La politica se implementa dos veces, y las pruebas comprueban que ambas
coinciden operacion a operacion: una vez sobre el modelo inmutable
(`removeTypeReferences`, `removeRelationshipsOf`) y otra sobre el documento Yjs
(`cascadeTypeRemoval`, `deleteClassWithCascade`).

## Consecuencias

- La interfaz debe advertir antes de borrar: la operacion destruye trabajo ajeno.
- `null` como tipo de retorno es parte del metamodelo, no un caso raro: el
  generador lo traducira a `void`.
- Un borrado concurrente con la creacion de una referencia puede dejar una
  referencia colgante tras la fusion del CRDT. Lo detecta `validateModel` con el
  codigo `dangling_reference`, y el modulo `sync` de la Fase 5 lo reportara al
  cliente como `conflict`.
