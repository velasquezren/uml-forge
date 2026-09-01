# Registros de decisiones de arquitectura

Cada fichero documenta una decision tomada durante la construccion de UML Forge.
Formato: contexto, decision, alternativas descartadas y consecuencias.
Los ADR no se editan una vez aceptados: si una decision cambia, se escribe uno
nuevo que sustituya al anterior y se marca el antiguo como sustituido.

| ADR                                                                                       | Titulo                                                           | Estado   |
| ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | -------- |
| [0001](0001-monorepo-pnpm-turborepo.md)                                                   | Monorepo con pnpm workspaces y Turborepo                         | Aceptado |
| [0002](0002-presets-typescript-compartidos.md)                                            | Presets de TypeScript compartidos                                | Aceptado |
| [0003](0003-fijacion-de-versiones.md)                                                     | Fijacion de lineas mayores y prohibicion de versiones candidatas | Aceptado |
| [0004](0004-eslint-flat-config-compartida.md)                                             | Configuracion ESLint 9 flat compartida                           | Aceptado |
| [0005](0005-compilacion-real-con-maven.md)                                                | Compilacion real con Maven del codigo generado                   | Aceptado |
| [0006](0006-sin-dependencias-redundantes.md)                                              | Sin dependencias redundantes con la plataforma                   | Aceptado |
| [0007](0007-result-en-lugar-de-excepciones.md)                                            | Result en lugar de excepciones en el metamodelo                  | Aceptado |
| [0008](0008-borrado-en-cascada.md)                                                        | Borrado en cascada de referencias                                | Aceptado |
| [0009](0009-mapeo-yjs.md)                                                                 | Mapeo del modelo sobre el documento Yjs                          | Aceptado |
| [0010](0010-doble-build-esm-y-cjs.md)                                                     | Doble compilacion ESM y CommonJS                                 | Aceptado |
| [0011](0011-andamiaje-con-cli-oficiales.md)                                               | El andamiaje se crea con las CLI oficiales                       | Aceptado |
| [0012](0012-vitest-y-swc-en-apps-api.md)                                                  | Vitest y SWC para pruebas unitarias y E2E en NestJS              | Aceptado |
| [0013](0013-rotacion-de-refresh-tokens-y-persistencia-ydoc.md)                            | Rotacion de refresh tokens y persistencia binaria de YDocState   | Aceptado |
| [0014](0014-adaptador-prismapg-para-prisma-7.md)                                          | Adaptador PrismaPg para PostgreSQL en Prisma 7                   | Aceptado |
| [0015](0015-indexeddb-y-prohibicion-de-localstorage.md)                                   | Uso exclusivo de IndexedDB y prohibicion de localStorage         | Aceptado |
| [0016](0016-enrutamiento-y-layouts-tanstack-router.md)                                    | Enrutamiento tipado y tres layouts con TanStack Router           | Aceptado |
| [0017](0017-tailwind-v4-css-first-y-shadcn-ui.md)                                         | Tailwind CSS v4 CSS-First y componentes shadcn/ui                | Aceptado |
| [0018](0018-eliminacion-de-ia-local-en-el-navegador-y-uso-exclusivo-de-ia-en-servidor.md) | Eliminacion de IA local y uso exclusivo de IA en servidor        | Aceptado |
| [0019](0019-proveedor-ia-gemini-con-respaldo-ollama.md)                                   | Proveedor de IA por defecto con Gemini y respaldo local Ollama   | Aceptado |
| [0020](0020-editor-canvas-react-flow-yjs.md)                                              | Editor de diagramas con React Flow y colaboracion Hocuspocus/Yjs | Aceptado |
| [0021](0021-modo-offline-cola-outbox-y-politicas-conflicto.md)                            | Modo offline, cola Outbox en IndexedDB y politicas de conflicto  | Aceptado |
| [0022](0022-generador-spring-boot-jpa.md)                                                 | Generador de Spring Boot 3 con Java 21, JPA y Maven              | Aceptado |
| [0023](0023-xmi-2-1-exportador-importador-tolerante-y-autolayout.md)                      | XMI 2.1: exportacion, importacion tolerante y autolayout         | Aceptado |
| [0024](0024-lienzo-controlado-posicion-de-enumeraciones-e-xmi-en-el-cliente.md)           | Lienzo controlado, posicion de enumeraciones e XMI en el cliente | Aceptado |
