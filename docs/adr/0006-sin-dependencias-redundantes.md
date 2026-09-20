# 0006. Sin dependencias redundantes con la plataforma

Fecha: 2026-08-29
Estado: Aceptado

## Contexto

Dos dependencias previstas inicialmente resultaron redundantes con capacidades
que ya ofrecen la plataforma o las librerias que el proyecto ya usa.

## Decision

**No se usa `zod-to-json-schema`.** Zod 4 incorpora `z.toJSONSchema()` en el
propio paquete. Los JSON Schema que consumen los modelos de lenguaje para su
salida estructurada se derivan directamente de los esquemas Zod del lenguaje de
operaciones, sin una segunda libreria que pueda quedarse atras respecto a la
version de Zod.

**No se usa el paquete `uuid`.** Los identificadores estables del metamodelo se
generan con `crypto.randomUUID()`, disponible de forma nativa en Node 22 y en
todos los navegadores modernos. Devuelve un UUID version 4, que es exactamente
lo que exige el metamodelo.

## Consecuencias

- Una unica fuente de verdad para los esquemas: el esquema Zod. El JSON Schema es
  siempre una derivacion, nunca una copia mantenida a mano.
- `crypto.randomUUID()` requiere un contexto seguro en el navegador. La PWA se
  sirve por HTTPS y `localhost` cuenta como contexto seguro, de modo que no hay
  degradacion en desarrollo. Si en algun momento hiciera falta servir la PWA por
  HTTP desde una IP de red local durante la defensa, habria que reintroducir un
  generador propio; queda anotado como riesgo conocido.
- El helper de generacion de identificadores vive en un unico modulo de
  `packages/uml-core`, de forma que sustituirlo seria un cambio de una linea.
