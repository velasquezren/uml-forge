# UML Forge

PWA colaborativa para disenar diagramas de clases UML 2.5 que genera, a partir
del modelo, un backend Spring Boot completo y funcional.

Proyecto academico. El repositorio cubre de la **Fase 0 a la Fase 9**: metamodelo
UML compartido, API NestJS 11 con Prisma 7 y PostgreSQL 16, PWA instalable con
lienzo colaborativo, modo offline, generador de Spring Boot descargable en ZIP,
interoperabilidad XMI 2.1 y modulo de IA en el servidor.

Las once fases del plan estan completas.

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

### Todo en Docker (Recomendado para evaluacion / companeros)

Una sola orden levanta base de datos, API y PWA, aplica las migraciones y
siembra los datos de demostracion:

```bash
cp .env.example .env
docker compose up --build
```

- PWA: <http://localhost:8080>
- API y Swagger: <http://localhost:3000/api/docs>

#### Credenciales de acceso demostracion:

- **Admin**: `admin@admin.com` / `password123`
- **Demo**: `demo@umlforge.dev` / `password123`
- **Usuario**: `user@user.com` / `password123`

Nginx sirve la PWA compilada y hace de pasarela hacia `/api`, `/health` y el
canal de colaboracion `/collab`, de modo que el navegador ve un unico origen.
Pon `SEED_ON_START=false` en el `.env` cuando no quieras que cada arranque
reponga los datos de demostracion.

### Con las herramientas de desarrollo

```bash
pnpm install
cp .env.example .env
docker compose up -d          # solo PostgreSQL
pnpm --filter @uml-forge/api run prisma:migrate
pnpm seed                     # usuarios y proyectos de demostracion
pnpm dev                      # API en :3000 y PWA en :5173
```

## Comandos

Todos se ejecutan desde la raiz y Turborepo los propaga a los workspaces
respetando el grafo de dependencias.

| Comando                         | Efecto                                                |
| ------------------------------- | ----------------------------------------------------- |
| `pnpm typecheck`                | Comprobacion de tipos de todo el monorepo             |
| `pnpm lint`                     | ESLint 9 con reglas basadas en tipos                  |
| `pnpm test`                     | Bateria de pruebas (unitarias y E2E de la API)        |
| `pnpm seed`                     | Usuarios y proyectos de demostracion                  |
| `pnpm e2e`                      | Pruebas E2E de navegador con Playwright               |
| `pnpm build`                    | Compilacion de todos los paquetes y aplicaciones      |
| `pnpm format`                   | Prettier en modo escritura                            |
| `pnpm format:check`             | Prettier en modo verificacion, el mismo que usa CI    |
| `docker compose up --build`     | Toda la pila en contenedores (PostgreSQL + API + Web) |
| `docker compose up -d postgres` | Solo PostgreSQL 16 en segundo plano para `pnpm dev`   |
| `docker compose down`           | Detiene todos los contenedores conservando el volumen |

> Las pruebas E2E de la API vacian la base de datos de desarrollo antes de cada
> caso. Despues de un `pnpm test` hay que repoblarla con `pnpm seed` o no se
> podra iniciar sesion con los usuarios de demostracion.

### Pruebas E2E de navegador

`pnpm e2e` arranca la API y la PWA si no estan ya en marcha y recorre con
Chromium los caminos de la defensa: acceso y proyectos, lienzo con relaciones y
cardinalidades, colaboracion entre dos navegadores, generacion del backend y
exportacion XMI. La primera vez hay que descargar el navegador:

```bash
pnpm --filter @uml-forge/web exec playwright install chromium
```

Las pruebas crean su propio usuario en cada caso, de modo que no dependen de los
datos semilla ni los destruyen.

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
  docker-compose.yml
  turbo.json
  pnpm-workspace.yaml
```

`packages/uml-core` es la pieza central. La PWA y la API dependen de el. Los
tipos del metamodelo no se duplican en ningun otro lugar.

## Variables de entorno

Se declaran todas en `.env.example`.

| Variable                 | Valor por defecto                                                      | Descripcion                                            |
| ------------------------ | ---------------------------------------------------------------------- | ------------------------------------------------------ |
| `POSTGRES_USER`          | `umlforge`                                                             | Usuario del contenedor de PostgreSQL                   |
| `POSTGRES_PASSWORD`      | `umlforge`                                                             | Contrasena del contenedor de PostgreSQL                |
| `POSTGRES_DB`            | `umlforge`                                                             | Base de datos creada al arrancar el contenedor         |
| `POSTGRES_PORT`          | `5432`                                                                 | Puerto publicado en la maquina anfitriona              |
| `DATABASE_URL`           | `postgresql://umlforge:umlforge@localhost:5432/umlforge?schema=public` | Cadena de conexion consumida por Prisma                |
| `PORT`                   | `3000`                                                                 | Puerto HTTP de la API NestJS                           |
| `NODE_ENV`               | `development`                                                          | Entorno de ejecucion (`development`, `production`)     |
| `CORS_ORIGIN`            | `http://localhost:5173`                                                | Origen permitido para solicitudes web PWA              |
| `JWT_ACCESS_SECRET`      | ver `.env.example`                                                     | Clave secreta para firma de Access Tokens (15 min)     |
| `JWT_ACCESS_EXPIRES_IN`  | `15m`                                                                  | Tiempo de expiracion del Access Token                  |
| `JWT_REFRESH_SECRET`     | ver `.env.example`                                                     | Clave secreta para firma de Refresh Tokens (7 dias)    |
| `JWT_REFRESH_EXPIRES_IN` | `7d`                                                                   | Tiempo de expiracion del Refresh Token                 |
| `COOKIE_SECRET`          | ver `.env.example`                                                     | Clave para firma de cookies HTTP                       |
| `THROTTLE_TTL`           | `60000`                                                                | Ventana de tiempo (ms) para limitacion de tasa         |
| `THROTTLE_LIMIT`         | `100`                                                                  | Maximo de peticiones por ventana                       |
| `AI_PROVIDER`            | `gemini`                                                               | Proveedor de IA activo: `gemini` u `ollama`            |
| `GEMINI_API_KEY`         | vacio                                                                  | Clave de Google AI Studio; sin ella Gemini no responde |
| `GEMINI_MODEL`           | `gemini-2.5-flash`                                                     | Modelo de la Gemini Developer API                      |
| `OLLAMA_BASE_URL`        | `http://localhost:11434`                                               | Servidor de Ollama para la IA local                    |
| `OLLAMA_MODEL`           | `qwen2.5:3b`                                                           | Modelo de texto local que genera las operaciones       |
| `OLLAMA_VISION_MODEL`    | `llava:7b`                                                             | Modelo multimodal local que lee la foto del diagrama   |
| `API_PORT`               | `3000`                                                                 | Puerto de la API publicado por Docker Compose          |
| `WEB_PORT`               | `8080`                                                                 | Puerto de la PWA publicado por Docker Compose          |
| `SEED_ON_START`          | `true`                                                                 | Siembra los datos de demostracion al arrancar la API   |
| `OLLAMA_BASE_URL_DOCKER` | `http://host.docker.internal:11434`                                    | Ollama visto desde dentro del contenedor               |
| `VITE_COLLAB_URL`        | vacio                                                                  | Canal de colaboracion, si no vive en el mismo origen   |

## Andamiaje

Desde la Fase 2, el andamiaje de cada aplicacion se genera con su CLI oficial
(`@nestjs/cli new`, `pnpm create vite`, `shadcn add`, `prisma init`) y despues se
adapta al monorepo. Solo el codigo de dominio se escribe a mano. La regla completa
esta en [CLAUDE.md](CLAUDE.md) y en
[ADR 0011](docs/adr/0011-andamiaje-con-cli-oficiales.md).

## Convenciones

- Identificadores de codigo en ingles. Comentarios y documentacion en espanol.
- Prohibido el tipo `any` y prohibido `@ts-ignore`; ambas cosas las bloquea
  ESLint con severidad de error.
- Prohibido `console.log` en codigo de produccion.
- Ningun fichero supera las 300 lineas.
- Toda decision de diseno no especificada se documenta en `docs/adr/`.
- Sin emojis en codigo, commits ni documentacion.

## IA local con Ollama

La aplicacion incluye soporte nativo y listo para usar con Ollama (configurado por defecto en `.env.example` y `docker-compose.yml`):

1. **Instalar Ollama**: descargar desde <https://ollama.com/>.
2. **Descargar los modelos**:
   ```bash
   ollama pull qwen2.5:3b       # modelo de texto para generacion de clases y relaciones (~2 GB)
   ollama pull llava:7b         # modelo multimodal para leer fotos/diagramas (~4.5 GB)
   ```
3. **Ejecutar Ollama**:
   - **Windows / macOS (Docker Desktop)**: simplemente abre la aplicacion de Ollama.
   - **Linux**: para que el contenedor Docker pueda comunicarse con Ollama en el anfitrion:
     ```bash
     OLLAMA_HOST=0.0.0.0:11434 ollama serve
     ```
     _(o si usas systemd: anade `Environment="OLLAMA_HOST=0.0.0.0"` con `systemctl edit ollama.service` y reinicia el servicio)_.

Alternativas mas ligeras para maquinas con pocos recursos: `llama3.2:3b` para texto y `moondream` para vision (modificando `OLLAMA_MODEL` y `OLLAMA_VISION_MODEL` en `.env`).

`GET /api/ai/status` responde si el proveedor esta disponible, y el asistente lo muestra en su cabecera (punto verde cuando esta listo). Si el modelo configurado no se ha descargado, indicara el estado y la API avisara en logs que modelo falta.

## La API: `apps/api`

Construida con NestJS 11 y Prisma 7 sobre PostgreSQL 16.

- Autenticacion JWT: access token de 15 minutos en memoria, refresh token de 7 dias
  con rotacion y deteccion de robo de tokens (invalidacion automatica de familias de tokens).
- Hashes criptograficos con argon2id para contrasenas y tokens.
- Persistencia binaria garantizada de `YDocState` (columna `Bytes`) para convergencia CRDT.
- Generacion del backend Spring Boot bajo demanda en
  `POST /api/projects/:id/codegen/springboot`: reconstruye el modelo desde el
  documento Yjs consolidado, ejecuta `@uml-forge/codegen-springboot` y responde
  con el proyecto Maven comprimido en ZIP
  ([ADR 0025](docs/adr/0025-generacion-de-backend-bajo-demanda.md)).
- Modulo de IA en `/api/ai` con Gemini por defecto y Ollama como respaldo local.
- Documentacion OpenAPI interactiva en `/api/docs`.
- Verificacion de estado y base de datos en `/health`.

## Acceso rapido para probar

`pnpm seed` crea tres usuarios, todos con la contrasena `password123`:

| Correo              | Rol en los proyectos semilla |
| ------------------- | ---------------------------- |
| `admin@admin.com`   | Propietario                  |
| `demo@umlforge.dev` | Editor                       |
| `user@user.com`     | Lector                       |

La pantalla de inicio de sesion trae un boton por usuario para entrar de un
clic. Abrir dos navegadores con usuarios distintos sobre el mismo proyecto es la
forma de ver los cursores y la presencia en vivo.

## La PWA: `apps/web`

Construida con React 19, Vite, Tailwind CSS v4 CSS-First y shadcn/ui.

- Enrutamiento tipado con TanStack Router (`src/routes/` y `src/routeTree.gen.ts`).
- Cuatro layouts especializados:
  - `AuthLayout`: tarjeta centrada para `/login` y `/register`.
  - `AppShell`: barra lateral colapsable y cabecera con presencia e indicador de red para `/projects` y `/projects/$projectId/settings`.
  - `EditorLayout`: lienzo a pantalla completa, paleta/arbol a la izquierda, inspector a la derecha y barra de estado/presencia inferior para `/projects/$projectId/editor`.
  - `AssistantLayout`: interfaz minimalista por voz sin lienzo de edicion manual para `/projects/$projectId/assistant`.
- Cliente HTTP `ky` con refresco automatico de JWT y token estrictamente en memoria (ADR 0013).
- Persistencia local exclusiva en IndexedDB y solicitud de almacenamiento persistente (`navigator.storage.persist()`) para modelos offline y pesos de IA (ADR 0015).
- **Interoperabilidad XMI 2.1** con Enterprise Architect: se exporta con los
  espacios de nombres de la OMG, tipos por referencia y asociaciones con sus dos
  `memberEnd`; se importa tolerando paquetes anidados, tipos por `xmi:idref`,
  extremos de asociacion en propiedades de clase y ficheros en `windows-1252`
  ([ADR 0029](docs/adr/0029-compatibilidad-xmi-con-enterprise-architect.md)).
- **Asistente de IA**: panel lateral en el editor y pantalla dedicada en
  `/projects/$projectId/assistant`. Se dicta la instruccion con la Web Speech
  API nativa, se escribe, o se sube la foto de un diagrama en papel; la IA
  responde con operaciones que solo se aplican tras confirmarlas
  ([ADR 0028](docs/adr/0028-asistente-de-ia-por-voz-e-imagen-en-la-pwa.md)).
- Accion **Generar backend** en la barra del editor: elige grupo, artefacto,
  paquete, base de datos y puerto, y descarga el ZIP del proyecto Spring Boot.
- Presencia en vivo: avatares de los participantes conectados y cursores remotos
  dibujados en coordenadas del diagrama
  ([ADR 0026](docs/adr/0026-presencia-y-cursores-remotos-por-awareness.md)).
- PWA instalable con `vite-plugin-pwa` (estrategia `injectManifest`), precache del shell y service worker en `src/sw.ts`.

## Integracion continua

`.github/workflows/ci.yml` define dos trabajos:

- `verify`: formato, typecheck, lint, test y build sobre Node 22 y pnpm 11.
- `codegen-compile`: compila con `mvn -q compile` los proyectos Spring Boot
  generados a partir de los seis modelos de prueba. Se activa cuando existe el
  paquete generador (Fase 6). Ver [ADR 0005](docs/adr/0005-compilacion-real-con-maven.md).

## Plan de fases

| Fase | Contenido                                                    | Estado     |
| ---- | ------------------------------------------------------------ | ---------- |
| 0    | Monorepo, configuracion compartida, Docker, CI               | Completada |
| 1    | `packages/uml-core`: esquemas, operaciones, validador, Yjs   | Completada |
| 2    | `apps/api`: Nest, Prisma, auth, proyectos, health            | Completada |
| 3    | `apps/web`: Vite, Tailwind v4, shadcn, rutas, PWA            | Completada |
| 4    | Editor: React Flow, nodos y aristas UML, colaboracion        | Completada |
| 5    | Modo offline, cola de salida, politicas de conflicto         | Completada |
| 6    | Generador Spring Boot y sus seis modelos de prueba           | Completada |
| 7    | XMI 2.1: exportacion, importacion tolerante, auto-layout     | Completada |
| 8    | IA de servidor: Gemini (@google/genai) y respaldo Ollama     | Completada |
| 9    | Datos semilla, integracion final y documentacion             | Completada |
| 10   | Asistente de IA en la PWA: voz, imagen y aplicacion revisada | Completada |
| 11   | Pruebas E2E de navegador con Playwright                      | Completada |

El plan de fases esta completo. Las pruebas E2E de la API (`pnpm --filter
@uml-forge/api test:e2e`) recorren autenticacion, proyectos, sincronizacion y
generacion de backend contra PostgreSQL real; las de navegador (`pnpm e2e`)
recorren la aplicacion entera con Chromium.
