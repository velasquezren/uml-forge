# UML Forge

PWA colaborativa para disenar diagramas de clases UML 2.5 que genera, a partir
del modelo, un backend Spring Boot completo y funcional.

Proyecto academico. El estado actual del repositorio corresponde a la **Fase 1**: cimientos del
monorepo y metamodelo UML completo en `packages/uml-core`.

## Requisitos

| Herramienta             | Version minima | Uso                                                   |
| ----------------------- | -------------- | ----------------------------------------------------- |
| Node.js                 | 22             | Toda la cadena de herramientas JavaScript             |
| pnpm                    | 11             | Gestor de paquetes del monorepo                       |
| Docker y Docker Compose | 2.x            | PostgreSQL 16 de desarrollo                           |
| JDK Temurin             | 21             | Compilar los proyectos Spring Boot generados (Fase 6) |
| Maven                   | 3.9            | Idem                                                  |

Node 22 es obligatorio, no recomendado: `@hocuspocus/server` lo exige.

## Puesta en marcha

```bash
pnpm install
cp .env.example .env
docker compose up -d
```

## Comandos

Todos se ejecutan desde la raiz y Turborepo los propaga a los workspaces
respetando el grafo de dependencias.

| Comando                | Efecto                                             |
| ---------------------- | -------------------------------------------------- |
| `pnpm typecheck`       | Comprobacion de tipos de todo el monorepo          |
| `pnpm lint`            | ESLint 9 con reglas basadas en tipos               |
| `pnpm test`            | Bateria de pruebas                                 |
| `pnpm build`           | Compilacion de todos los paquetes y aplicaciones   |
| `pnpm format`          | Prettier en modo escritura                         |
| `pnpm format:check`    | Prettier en modo verificacion, el mismo que usa CI |
| `docker compose up -d` | PostgreSQL 16 en segundo plano                     |
| `docker compose down`  | Detiene la base de datos conservando el volumen    |

## Estructura

```
uml-forge/
  apps/
    web/                  PWA. React 19 + Vite 7           (Fase 3)
    api/                  API. NestJS 11                   (Fase 2)
  packages/
    uml-core/             Metamodelo, operaciones, Yjs     (Fase 1)
    codegen-springboot/   Generador de Spring Boot         (Fase 6)
    xmi/                  Serializador y parser XMI 2.1    (Fase 7)
    tsconfig/             Presets de TypeScript            (Fase 0)
    eslint-config/        Configuracion ESLint compartida  (Fase 0)
  docs/
    adr/                  Decisiones de arquitectura
    puds/                 Artefactos de la metodologia
  docker-compose.yml
  turbo.json
  pnpm-workspace.yaml
```

`packages/uml-core` es la pieza central. La PWA y la API dependen de el. Los
tipos del metamodelo no se duplican en ningun otro lugar.

## Variables de entorno

Se declaran todas en `.env.example`. En la Fase 0 solo intervienen las de la base
de datos.

| Variable            | Valor por defecto  | Descripcion                                          |
| ------------------- | ------------------ | ---------------------------------------------------- |
| `POSTGRES_USER`     | `umlforge`         | Usuario del contenedor de PostgreSQL                 |
| `POSTGRES_PASSWORD` | `umlforge`         | Contrasena del contenedor de PostgreSQL              |
| `POSTGRES_DB`       | `umlforge`         | Base de datos creada al arrancar el contenedor       |
| `POSTGRES_PORT`     | `5432`             | Puerto publicado en la maquina anfitriona            |
| `DATABASE_URL`      | ver `.env.example` | Cadena de conexion que consumira Prisma en la Fase 2 |

Cada fase que introduzca una variable nueva la anade a `.env.example` y a esta
tabla en el mismo commit.

## Convenciones

- Identificadores de codigo en ingles. Comentarios y documentacion en espanol.
- Prohibido el tipo `any` y prohibido `@ts-ignore`; ambas cosas las bloquea
  ESLint con severidad de error.
- Prohibido `console.log` en codigo de produccion.
- Ningun fichero supera las 300 lineas.
- Toda decision de diseno no especificada se documenta en `docs/adr/`.
- Sin emojis en codigo, commits ni documentacion.

## El metamodelo: `packages/uml-core`

Es la pieza central del sistema y la unica fuente de verdad de los tipos UML.
Todo se define con esquemas Zod y los tipos TypeScript se derivan con `z.infer`.

| Exporta                                      | Para que                                                                      |
| -------------------------------------------- | ----------------------------------------------------------------------------- |
| `UMLModelSchema`, `UMLClassSchema`, ...      | Metamodelo UML 2.5 completo                                                   |
| `UmlOperationSchema`                         | Union discriminada con las 16 operaciones del lenguaje                        |
| `applyOperation`, `applyOperations`          | Aplicacion pura e inmutable, atomica por lotes                                |
| `validateModel`                              | Nombres repetidos, referencias colgantes, ciclos de herencia, multiplicidades |
| `toYDoc`, `fromYDoc`, `applyOperationToYDoc` | Mapeo bidireccional con el CRDT                                               |
| `umlOperationJsonSchema`                     | JSON Schema para la salida estructurada de los LLM                            |

Nada lanza excepciones: todo devuelve `Result<T, UmlError>` (ver
[ADR 0007](docs/adr/0007-result-en-lugar-de-excepciones.md)).

## Integracion continua

`.github/workflows/ci.yml` define dos trabajos:

- `verify`: formato, typecheck, lint, test y build sobre Node 22 y pnpm 11.
- `codegen-compile`: compila con `mvn -q compile` los proyectos Spring Boot
  generados a partir de los seis modelos de prueba. Se activa cuando existe el
  paquete generador (Fase 6). Ver [ADR 0005](docs/adr/0005-compilacion-real-con-maven.md).

## Plan de fases

| Fase | Contenido                                                  | Estado     |
| ---- | ---------------------------------------------------------- | ---------- |
| 0    | Monorepo, configuracion compartida, Docker, CI             | Completada |
| 1    | `packages/uml-core`: esquemas, operaciones, validador, Yjs | Completada |
| 2    | `apps/api`: Nest, Prisma, auth, proyectos, health          | Pendiente  |
| 3    | `apps/web`: Vite, Tailwind v4, shadcn, rutas, PWA          | Pendiente  |
| 4    | Editor: React Flow, nodos y aristas UML, colaboracion      | Pendiente  |
| 5    | Modo offline, cola de salida, politicas de conflicto       | Pendiente  |
| 6    | Generador Spring Boot y sus seis modelos de prueba         | Pendiente  |
| 7    | XMI 2.1: exportacion, importacion tolerante, auto-layout   | Pendiente  |
| 8    | IA de servidor: Ollama, texto e imagen a operaciones       | Pendiente  |
| 9    | Modo asistente: WebLLM, Whisper, sintesis de voz           | Pendiente  |
| 10   | Datos semilla, pruebas E2E y documentacion final           | Pendiente  |
