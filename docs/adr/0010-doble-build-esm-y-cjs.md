# 0010. Doble compilacion ESM y CommonJS de los paquetes compartidos

Fecha: 2026-08-29
Estado: Aceptado

## Contexto

`packages/uml-core` lo consumen dos aplicaciones con sistemas de modulos
incompatibles: la PWA es ESM sobre Vite, y `apps/api` es **CommonJS** sobre
NestJS con el builder SWC, tal como fija el stack del proyecto. Un paquete solo
ESM no se puede `require()` desde CommonJS.

## Decision

`packages/uml-core` se compila dos veces con `tsc` y publica ambas salidas:

| Salida     | Configuracion                         | Consumidor          |
| ---------- | ------------------------------------- | ------------------- |
| `dist/esm` | `module: ESNext`, resolucion Bundler  | `apps/web` (Vite)   |
| `dist/cjs` | `module: CommonJS`, resolucion Node10 | `apps/api` (NestJS) |

- El campo `exports` del `package.json` dirige `import` a `dist/esm` y `require`
  a `dist/cjs`.
- Un script de cierre escribe `{"type":"module"}` y `{"type":"commonjs"}` en cada
  carpeta de salida, para que Node interprete bien los `.js` de cada una.
- **Todas las importaciones relativas del codigo fuente llevan extension `.js`**.
  Sin ella la salida ESM no resuelve bajo Node. Es la unica concesion visible que
  impone esta decision.

Las dependencias del paquete (`zod` y `yjs`) publican ambos formatos, por lo que
la resolucion Node10 de la compilacion CommonJS funciona.

## Alternativas descartadas

- Publicar solo ESM y cargarlo desde Nest con `await import()`: rompe los
  decoradores y la inyeccion de dependencias, que necesitan el modulo cargado de
  forma sincrona.
- Publicar solo CommonJS: penaliza el arbol de dependencias del navegador y
  estorba a la division de codigo de Vite.
- Consumir el codigo fuente TypeScript desde ambas aplicaciones: obliga a que
  cada aplicacion compile el paquete con su propia configuracion y rompe con el
  builder SWC.

## Consecuencias

- `pnpm build` del paquete ejecuta dos pasadas de `tsc` mas el script de cierre.
- Se verifico de verdad, no por inspeccion: un paquete externo importa el
  resultado con `import` y con `require` y ambos funcionan.
- La misma estrategia se aplicara a `packages/xmi` y a
  `packages/codegen-springboot`, que tambien consume la API.
