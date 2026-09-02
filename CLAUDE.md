# UML Forge

PWA colaborativa de modelado UML 2.5 que genera un backend Spring Boot funcional
a partir del modelo. Monorepo pnpm + Turborepo. Proyecto academico con defensa
presencial.

## Regla de andamiaje (obligatoria desde la Fase 2)

**El andamiaje se genera SIEMPRE con la CLI oficial. Esta prohibido escribir a
mano los ficheros que esas CLI producen.** Ver
[ADR 0011](docs/adr/0011-andamiaje-con-cli-oficiales.md).

| Andamiaje               | Orden                                                             |
| ----------------------- | ----------------------------------------------------------------- |
| `apps/api`              | `@nestjs/cli new` con `--skip-git --skip-install`                 |
| `apps/web`              | `pnpm create vite` con plantilla `react-ts`                       |
| Componentes de interfaz | `shadcn init`, y `shadcn add <componente>` uno por uno            |
| Base de datos           | `prisma init`                                                     |
| Arbol de rutas          | lo genera `@tanstack/router-plugin`; el `routeTree` no se escribe |

Tras cada CLI viene la adaptacion al monorepo, que si es trabajo propio y se
reporta: eliminar `.git` y ficheros de bloqueo propios, alinear el `package.json`
con los workspaces, apuntar el `tsconfig.json` a `@uml-forge/tsconfig` y la
configuracion de ESLint a `@uml-forge/eslint-config`.

Si una CLI genera algo que contradice la especificacion del proyecto, se avisa
antes de sobrescribirlo.

Se escribe a mano solo el codigo de dominio: `packages/uml-core`,
`packages/codegen-springboot`, `packages/xmi`, los nodos del lienzo, la capa de
sincronizacion y la interfaz propia.

## Reglas inviolables

1. No inventar librerias, APIs ni nombres de paquete. Ante la duda, preguntar.
2. No fijar versiones de parche inventadas. Instalar con `pnpm add <paquete>@<mayor>`
   y reportar la version resuelta. Prohibidas las versiones candidatas.
3. Prohibido el tipo `any`. TypeScript en modo `strict`. Prohibido `@ts-ignore`.
   ESLint bloquea las tres cosas con severidad de error.
4. Cada fase termina con `pnpm typecheck && pnpm lint && pnpm test && pnpm build`
   en verde. Si algo falla, se arregla antes de reportar.
5. Identificadores de codigo en ingles. Comentarios y documentacion en espanol.
6. Ningun fichero supera las 300 lineas. Se divide en modulos.
7. Toda decision de diseno no especificada se documenta en `docs/adr/`.
8. Sin emojis en codigo, commits ni documentacion.
9. Prohibido `console.log` en codigo de produccion.
10. Toda variable de entorno nueva va a `.env.example` y al README en el mismo commit.

## Metodo de trabajo por fases

Se trabaja fase a fase. Al terminar cada una: reportar que se construyo, que
ordenes de verificacion se ejecutaron y su resultado, y **esperar aprobacion
explicita**. No se avanza a la siguiente fase por cuenta propia.

## Comandos

| Comando                | Efecto                                    |
| ---------------------- | ----------------------------------------- |
| `pnpm typecheck`       | Comprobacion de tipos de todo el monorepo |
| `pnpm lint`            | ESLint 9 con reglas basadas en tipos      |
| `pnpm test`            | Bateria de pruebas                        |
| `pnpm build`           | Compilacion de paquetes y aplicaciones    |
| `pnpm format`          | Prettier en modo escritura                |
| `docker compose up -d` | PostgreSQL 16 de desarrollo               |

## Estado

| Fase | Contenido                                                    | Estado     |
| ---- | ------------------------------------------------------------ | ---------- |
| 0    | Monorepo, configuracion compartida, Docker, CI               | Completada |
| 1    | `packages/uml-core`: metamodelo, operaciones, validador, Yjs | Completada |
| 2    | `apps/api`: Nest, Prisma, auth, proyectos, health            | Completada |
| 3    | `apps/web`: Vite, Tailwind v4, shadcn, rutas, PWA            | Completada |
| 4    | Editor: React Flow, nodos y aristas UML, colaboracion        | Completada |
| 5    | Modo offline, cola de salida, politicas de conflicto         | Completada |
| 6    | Generador Spring Boot y sus seis modelos de prueba           | Completada |
| 7    | XMI 2.1: exportacion, importacion tolerante, auto-layout     | Completada |
| 8    | IA de servidor: Gemini (@google/genai) y respaldo Ollama     | Completada |
| 9    | Datos semilla, integracion final y documentacion             | Completada |
| 10   | Asistente de IA en la PWA: voz, imagen y aplicacion revisada | Completada |
| 11   | Pruebas E2E de navegador con Playwright                      | Pendiente  |

## Puntos que conviene recordar

- `packages/uml-core` es la unica fuente de verdad de los tipos UML. Ni la PWA ni
  la API los redefinen.
- Nada en `uml-core` lanza excepciones: todo devuelve `Result<T, UmlError>`.
- El documento Yjs se persiste SIEMPRE como binario (`Bytes`), jamas serializado
  a JSON: hacerlo rompe la fusion de actualizaciones.
- Las importaciones relativas de los paquetes compartidos llevan extension `.js`,
  porque se compilan a ESM y a CommonJS a la vez (ADR 0010).
- Prohibida la IA local en el navegador (sin `@mlc-ai/web-llm` ni `@huggingface/transformers`). Toda la IA de UML Forge corre en el servidor (ADR 0018).
- La IA en servidor (Fase 8) usa por defecto la **Gemini Developer API** con el SDK unificado `@google/genai` (`GEMINI_MODEL`, `responseMimeType: 'application/json'` con `responseSchema`) y cuenta con `OllamaProvider` como respaldo local sin internet. Ambas implementaciones de `AiProvider` pasan los mismos tests de contrato (ADR 0019).
- El reconocimiento de voz en el navegador usa exclusivamente la Web Speech API nativa, degradando a texto si no está soportada.
- El generador de Spring Boot llega al usuario por `POST /api/projects/:id/codegen/springboot`, que devuelve el proyecto en ZIP (ADR 0025). El modelo se reconstruye en el servidor desde `YDocState`, no desde el cliente.
- Los cursores y la presencia viajan por el canal de awareness de Hocuspocus, jamas por el CRDT (ADR 0026).
- Toda llamada a la IA desde la PWA pasa por `apps/web/src/features/ai/aiClient.ts`, y sus operaciones se aplican con `applyOperation` del lienzo (ADR 0027).
- La salida de la IA nunca se aplica sola: se muestra como propuesta y la persona confirma (ADR 0028). El dictado usa la Web Speech API nativa con tipos de `@types/dom-speech-recognition`.
