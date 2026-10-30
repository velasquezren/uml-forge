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
| [0025](0025-generacion-de-backend-bajo-demanda.md)                                        | Generacion del backend bajo demanda con descarga en ZIP          | Aceptado |
| [0026](0026-presencia-y-cursores-remotos-por-awareness.md)                                | Presencia y cursores remotos por el canal de awareness           | Aceptado |
| [0027](0027-costura-de-la-ia-en-el-cliente.md)                                            | Costura de la IA en el cliente antes de construir su interfaz    | Aceptado |
| [0028](0028-asistente-de-ia-por-voz-e-imagen-en-la-pwa.md)                                | Asistente de IA por voz e imagen en la PWA                       | Aceptado |
| [0029](0029-compatibilidad-xmi-con-enterprise-architect.md)                               | Compatibilidad real del XMI 2.1 con Enterprise Architect         | Aceptado |
| [0030](0030-puesta-a-punto-del-respaldo-local-con-ollama.md)                              | Puesta a punto del respaldo local con Ollama                     | Aceptado |
| [0031](0031-sesion-en-docker-local-y-espera-de-ia.md)                                     | Sesion en Docker local y espera de IA                            | Aceptado |
| [0032](0032-experiencia-pwa-movil-y-guia-interactiva.md)                                  | Experiencia PWA movil y guia interactiva                         | Aceptado |
| [0033](0033-dialecto-xmi-de-enterprise-architect-con-diagrama.md)                         | Dialecto XMI de Enterprise Architect con diagrama                | Aceptado |
| [0034](0034-bloqueo-de-exportacion-e-importacion-y-revisiones.md)                         | Bloqueo de exportar e importar y revisiones                      | Aceptado |
| [0035](0035-normalizacion-de-propuestas-de-ia-y-salida-estructurada.md)                   | Normalizacion de propuestas de IA y salida de Gemini             | Aceptado |
| [0036](0036-imagenes-para-la-ia-y-modelo-de-reserva-de-gemini.md)                         | Imagenes para la IA y modelo de reserva de Gemini                | Aceptado |
| [0037](0037-editor-en-pantalla-dividida.md)                                               | Editor en pantalla dividida                                      | Aceptado |
| [0038](0038-backend-generado-listo-para-windows.md)                                       | Backend generado listo para Windows                              | Aceptado |
| [0039](0039-siembra-solo-con-la-base-de-datos-vacia.md)                                   | Siembra solo con la base de datos vacia                          | Aceptado |
| [0040](0040-gemini-por-vertex-ai.md)                                                      | Gemini por Vertex AI                                             | Aceptado |
| [0041](0041-despliegue-en-cloud-run.md)                                                   | Despliegue en Google Cloud Run                                   | Aceptado |
| [0042](0042-chat-de-grupo-con-ia.md)                                                      | Chat de grupo con IA                                             | Aceptado |
| [0043](0043-coleccion-postman-del-backend-generado.md)                                    | Coleccion de Postman del backend generado                        | Aceptado |
| [0044](0044-imagenes-y-notas-de-voz-en-el-chat-e-ia-en-directo.md)                        | Imagenes y notas de voz en el chat, IA en directo                | Aceptado |
| [0045](0045-cambios-y-borrados-propuestos-por-la-ia-del-chat.md)                          | Cambios y borrados propuestos por la IA del chat                 | Aceptado |
