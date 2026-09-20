# 0001. Monorepo con pnpm workspaces y Turborepo

Fecha: 2026-08-29
Estado: Aceptado

## Contexto

UML Forge tiene dos aplicaciones desplegables (PWA y API) y cinco paquetes
compartidos. La pieza central, el metamodelo UML, la consumen tanto el navegador
como el servidor. Duplicar esos tipos seria la causa mas probable de divergencia
entre lo que el usuario dibuja y lo que el generador produce.

## Decision

Un unico repositorio con pnpm workspaces (`apps/*`, `packages/*`) y Turborepo
como orquestador de tareas.

- pnpm por su almacen direccionable por contenido y por su enlazado estricto:
  un paquete solo puede importar lo que declara, lo que impide dependencias
  fantasma entre workspaces.
- Turborepo define cuatro tareas (`typecheck`, `lint`, `test`, `build`), todas
  con `dependsOn: ["^build"]`, de modo que un workspace siempre se verifica
  contra la salida compilada de sus dependencias, no contra su codigo fuente.
- Los paquetes compartidos se referencian con el protocolo `workspace:*`.

## Alternativas descartadas

- Repositorios separados con publicacion en un registro privado: obliga a
  versionar y publicar el metamodelo en cada iteracion, inasumible en un
  proyecto con defensa en fecha fija.
- npm o yarn workspaces sin orquestador: sin grafo de tareas ni cache, cada
  verificacion recorreria el monorepo completo.
- Nx: mas capacidad de la necesaria y una curva de configuracion mayor.

## Consecuencias

- Una sola instalacion (`pnpm install`) deja el repositorio operativo.
- La cache local de Turborepo (`.turbo/`) acelera las verificaciones repetidas.
- El pipeline de CI ejecuta exactamente los mismos comandos que el desarrollador.
- Node 22 o superior es obligatorio: `@hocuspocus/server` lo exige en su campo
  `engines`.
