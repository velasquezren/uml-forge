# @uml-forge/api

API REST y servidor de colaboracion en tiempo real para UML Forge.

Construida con NestJS 11, Prisma 7, PostgreSQL 16, SWC, y documentacion OpenAPI Swagger.

## Modulos implementados

- **config**: Configuracion tipada y validada con Zod al arrancar la aplicacion.
- **prisma**: Servicio y cliente Prisma 7 con adaptador `PrismaPg` sobre PostgreSQL 16.
- **auth**: Autenticacion JWT (access token de 15 minutos en memoria, refresh token de 7 dias con rotacion y deteccion de reutilizacion / robo de tokens, almacenamiento de contrasenas y tokens con argon2id).
- **users**: Gestion del perfil de usuario (`/api/users/me`).
- **projects**: CRUD de proyectos UML con inicializacion de estado binario YDoc (`YDocState.state`), y gestion de colaboradores con roles (`OWNER`, `EDITOR`, `VIEWER`).
- **health**: Verificacion de salud de la API y conectividad con la base de datos (`/health`).

## Puesta en marcha

Desde la raiz del monorepo:

```bash
docker compose up -d
pnpm --filter @uml-forge/api run prisma:migrate
pnpm --filter @uml-forge/api run dev
```

Documentacion OpenAPI interactiva:
`http://localhost:3000/api/docs`

## Scripts

| Comando                                      | Descripcion                                         |
| -------------------------------------------- | --------------------------------------------------- |
| `pnpm --filter @uml-forge/api run dev`       | Servidor en modo desarrollo con recarga en caliente |
| `pnpm --filter @uml-forge/api run build`     | Compilacion de produccion con SWC                   |
| `pnpm --filter @uml-forge/api run typecheck` | Verificacion estricta de tipos TypeScript           |
| `pnpm --filter @uml-forge/api run lint`      | Analisis estatico con ESLint 9                      |
| `pnpm --filter @uml-forge/api run test`      | Bateria de pruebas unitarias y E2E con Vitest       |
| `pnpm --filter @uml-forge/api run test:unit` | Solo pruebas unitarias                              |
| `pnpm --filter @uml-forge/api run test:e2e`  | Solo pruebas E2E con Supertest                      |
