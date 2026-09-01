---
name: fase-02-api-nestjs
description: Fase 2 de UML Forge. Andamiaje de apps/api con la CLI de NestJS, configuracion tipada con Zod, Prisma con migraciones, modulos auth, users, projects y health, Swagger operativo y pruebas e2e de autenticacion.
---

# Fase 2: apps/api

## Prerrequisitos

Fases 0 y 1 completadas. PostgreSQL 16 arrancado con `docker compose up -d`.

## Paso 1: andamiaje con la CLI (obligatorio)

```bash
cd apps
pnpm dlx @nestjs/cli new api --skip-git --skip-install --package-manager pnpm
```

Reporta la version de la CLI y lo que genero.

### Contradicciones conocidas con la especificacion

Avisa antes de sobrescribir. Las tres esperadas:

1. La plantilla genera configuracion de **Jest**; la especificacion pide
   **Vitest + Supertest**. Sustituir requiere `unplugin-swc` para que los
   decoradores y `emitDecoratorMetadata` funcionen bajo Vitest.
2. Genera `eslint.config.mjs` y `.prettierrc` propios que duplican los
   compartidos del monorepo.
3. Genera `tsconfig.json` propio en lugar de heredar de `@uml-forge/tsconfig/nest.json`.

## Paso 2: adaptacion al monorepo

- Borrar `.git` y cualquier fichero de bloqueo que la CLI haya creado.
- `package.json`: nombre `@uml-forge/api`, privado, scripts `dev`, `build`,
  `start`, `typecheck`, `lint`, `test`, `test:e2e`. Dependencia
  `"@uml-forge/uml-core": "workspace:*"`.
- `tsconfig.json`: `extends` a `@uml-forge/tsconfig/nest.json`, `outDir` y
  `rootDir` propios (los presets compartidos no declaran rutas de salida).
- `eslint.config.js`: reexportar `@uml-forge/eslint-config/nest`.
- Mantener CommonJS. **No convertir a ESM**: lo exige el stack.

## Paso 3: estructura por feature

```
src/
  main.ts
  app.module.ts
  common/     decorators, guards, filters, interceptors, pipes
  config/     configuracion tipada y validada con Zod al arrancar
  prisma/     PrismaModule, PrismaService
  modules/
    auth/ users/ projects/ collab/ sync/ ai/ codegen/ xmi/ health/
```

En esta fase se construyen `config`, `prisma`, `auth`, `users`, `projects` y
`health`. Los demas modulos llegan en fases posteriores.

## Paso 4: Prisma

```bash
pnpm --filter @uml-forge/api exec prisma init --datasource-provider postgresql
```

Modelos: `User`, `RefreshToken`, `Project`, `ProjectMember`, `YDocState`,
`ModelSnapshot`, `OperationLog`, `GenerationJob`.

**CRITICO: `YDocState.state` es de tipo `Bytes`.** El documento Yjs se persiste
SIEMPRE como binario, jamas serializado a JSON. Guardarlo como JSON y
reconstruirlo rompe la fusion de actualizaciones y duplica contenido en cada
conexion nueva. Este es el error mas caro del proyecto entero.

Migracion inicial con `prisma migrate dev`. La migracion se versiona.

## Paso 5: autenticacion

- Access token JWT de **15 minutos**, en memoria del cliente.
- Refresh token de **7 dias con ROTACION**, hasheado con **argon2** en la base de
  datos. Nunca en texto plano. Viaja en cookie `httpOnly`, `sameSite: lax`.
- Contrasenas con **argon2id**.
- `JwtAuthGuard` global, con decorador `@Public()` para las excepciones.
- `ProjectRoleGuard` que valida membresia y rol: `owner`, `editor`, `viewer`.

Rotacion correcta: al usar un refresh token se invalida el anterior y se emite
uno nuevo. Reutilizar un token ya rotado es senal de robo: invalidar toda la
familia de tokens de ese usuario.

## Paso 6: configuracion, seguridad y documentacion

- `config/`: esquema Zod validado **al arrancar**. Si falta una variable, el
  proceso no arranca y dice cual. Nada de leer `process.env` disperso.
- `helmet` y `@nestjs/throttler` activos.
- `class-validator` + `class-transformer` sobre los DTO, con `ValidationPipe`
  global en modo `whitelist` y `transform`.
- `nestjs-pino` para los logs. **Ningun `console.log`.**
- `@nestjs/swagger` (linea 11.4.7) sirviendo la documentacion. Verificar que
  responde de verdad, no solo que el modulo esta registrado.

## Paso 7: pruebas

- Vitest + `unplugin-swc` para los decoradores.
- Pruebas e2e de autenticacion con Supertest: registro, login, refresh con
  rotacion, reutilizacion de un token rotado, logout, acceso denegado sin token,
  acceso denegado con rol insuficiente.

## Criterio de terminado

- `pnpm typecheck && pnpm lint && pnpm test && pnpm build` en verde.
- Swagger responde en el navegador.
- Las migraciones de Prisma aplican sobre una base de datos limpia.
- Variables nuevas en `.env.example` y en el README.
- Un ADR por cada decision no especificada (por ejemplo la sustitucion de Jest
  por Vitest, o la estrategia de rotacion de refresh tokens).
- Reporte de versiones resueltas al instalar.

## Trampas conocidas

- `@nestjs/swagger` de la linea 12 exige NestJS 12. Con NestJS 11 hay que fijar
  la linea 11.
- La etiqueta `latest` de `prisma` apunta a una version candidata: fijar `@7`
  tanto en `prisma` como en `@prisma/client`.
- `argon2` compila codigo nativo: comprobar que instala en el entorno de CI.
- Con SWC, `emitDecoratorMetadata` debe estar activo o la inyeccion por tipo
  falla en tiempo de ejecucion sin error de compilacion.
- No exponer el hash del refresh token ni el `passwordHash` en ningun DTO de
  respuesta. Usar DTO de salida explicitos, no devolver la entidad de Prisma.
