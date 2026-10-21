# 0039. Siembra de datos solo con la base de datos vacia

Fecha: 2026-10-18
Estado: Aceptado

## Contexto

El contenedor de la API ejecutaba la siembra en cada arranque cuando
`SEED_ON_START=true`, que es el valor por defecto. La siembra empieza borrando
todas las tablas: cada reinicio del contenedor eliminaba usuarios, proyectos y
diagramas. En Cloud Run, que arranca y para instancias segun la demanda, eso
habria borrado los datos varias veces al dia.

## Decision

Al arrancar, el contenedor siembra con `SEED_ONLY_IF_EMPTY=true`: si ya hay
algun usuario, la siembra no hace nada. `pnpm seed` a mano mantiene su
comportamiento de reiniciar los datos de demostracion.

## Consecuencias

- El primer arranque de una base de datos nueva sigue creando los usuarios de
  demostracion; los siguientes no tocan nada.
