---
name: fase-00-contexto-y-reglas
description: Contrato base de UML Forge. Producto, arquitectura, stack cerrado, reglas inviolables, regla de andamiaje con CLI y metodo de trabajo por fases. Leer siempre antes que cualquier otro skill del proyecto.
---

# UML Forge: contexto y reglas

## El producto

PWA colaborativa para disenar diagramas de clases UML 2.5 que, a partir del
modelo, genera un backend Spring Boot completo y funcional. Proyecto academico
universitario con defensa presencial.

### Escenario de aceptacion (debe funcionar el dia de la evaluacion)

1. Tres usuarios en el mismo proyecto desde tres navegadores ven los cambios de
   los demas en tiempo real, con cursores y presencia.
2. Un usuario dicta por voz "una veterinaria tiene mascotas, duenos y consultas;
   cada dueno puede tener varias mascotas" y la IA genera las clases, atributos
   y relaciones correctas.
3. Otro usuario sube la foto de un diagrama en papel y la IA lo convierte en
   clases y relaciones sobre el mismo modelo.
4. Un usuario se desconecta, sigue editando, reconecta, y sus cambios se fusionan
   sin perder nada ni duplicar elementos.
5. Se importa un XMI de Sparx Enterprise Architect y se ve el modelo. Se exporta
   a XMI y Enterprise Architect lo abre sin error.
6. Se pulsa "Generar backend" y se descarga un ZIP con un proyecto Spring Boot
   que compila y arranca a la primera contra PostgreSQL, con Swagger UI operativo.

## Arquitectura

Monorepo pnpm workspaces + Turborepo.

```
uml-forge/
  apps/
    web/                  PWA. React 19 + Vite 7
    api/                  API. NestJS 11
  packages/
    uml-core/             Metamodelo, operaciones, validacion. COMPARTIDO
    codegen-springboot/   Plantillas y generador de Spring Boot
    xmi/                  Serializador y parser XMI 2.1
    tsconfig/             Presets de TypeScript compartidos
    eslint-config/        Configuracion ESLint compartida
  docs/adr/               Decisiones de arquitectura
  docs/puds/              Artefactos de la metodologia
```

`packages/uml-core` es la pieza central. Web y API dependen de el. **Nunca se
duplican los tipos del metamodelo en otro lugar.**

## Stack cerrado (no se cuestiona)

**apps/web**: React 19, TypeScript 5.9, Vite 7, TanStack Router (file-based, search
params validados con Zod), TanStack Query v5, Zustand, Tailwind CSS v4 via
`@tailwindcss/vite` con configuracion CSS-first (`@theme`, sin `tailwind.config.js`),
shadcn/ui estilo new-york con colores OKLCH, `@xyflow/react`, `elkjs` (layered),
`yjs` + `@hocuspocus/provider`, `y-indexeddb` e `idb`, React Hook Form + Zod, `ky`,
`vite-plugin-pwa` en estrategia `injectManifest`, `@mlc-ai/web-llm`,
`@huggingface/transformers` (Whisper en Web Worker), `speechSynthesis` nativo,
`sonner`, `lucide-react`. Pruebas: Vitest + Testing Library, E2E Playwright.

**apps/api**: NestJS 11, CommonJS (no ESM), builder SWC, Prisma + PostgreSQL 16,
`@nestjs/passport` + `passport-jwt` + `argon2`, `@nestjs/swagger` (linea 11),
`@hocuspocus/server` embebido, `class-validator` + `class-transformer`,
`handlebars`, `archiver`, `xmlbuilder2` para escribir XML y `fast-xml-parser` para
leerlo, `helmet`, `@nestjs/throttler`, `nestjs-pino`. Pruebas: Vitest + Supertest.

**Backend generado** (la salida del producto): Spring Boot 3.5.x, Java 21, Maven,
PostgreSQL, springdoc-openapi.

## Reglas inviolables

1. No inventar librerias, APIs ni nombres de paquete. Ante la duda, preguntar.
2. No fijar versiones de parche inventadas. Instalar con `pnpm add <paquete>@<mayor>`
   y reportar la version resuelta. Prohibidas las versiones candidatas, alfa o beta.
3. Prohibido el tipo `any`. TypeScript `strict`. Prohibido `@ts-ignore`.
4. Cada fase termina con `pnpm typecheck && pnpm lint && pnpm test && pnpm build`
   en verde. Si algo falla, se arregla ANTES de reportar.
5. Identificadores de codigo en ingles. Comentarios y documentacion en espanol.
6. Ningun fichero supera las 300 lineas. Se divide en modulos.
7. Toda decision de diseno no especificada se documenta en `docs/adr/`.
8. Sin emojis en codigo, commits ni documentacion.
9. Prohibido `console.log` en codigo de produccion.
10. Toda variable de entorno nueva va a `.env.example` y al README en el mismo commit.

## Regla de andamiaje (desde la Fase 2)

**El andamiaje se genera SIEMPRE con la CLI oficial. Esta prohibido escribir a
mano los ficheros que esas CLI producen.**

| Andamiaje               | Orden                                                             |
| ----------------------- | ----------------------------------------------------------------- |
| `apps/api`              | `@nestjs/cli new` con `--skip-git --skip-install`                 |
| `apps/web`              | `pnpm create vite` con plantilla `react-ts`                       |
| Componentes de interfaz | `shadcn init`, y `shadcn add <componente>` uno por uno            |
| Base de datos           | `prisma init`                                                     |
| Arbol de rutas          | lo genera `@tanstack/router-plugin`; el `routeTree` no se escribe |

Tras cada CLI viene la adaptacion al monorepo, que si es trabajo propio y se
reporta: eliminar `.git` y ficheros de bloqueo propios, alinear el `package.json`
con los workspaces, apuntar `tsconfig.json` a `@uml-forge/tsconfig` y ESLint a
`@uml-forge/eslint-config`.

Si una CLI genera algo que **contradice** esta especificacion, se avisa antes de
sobrescribirlo. No se sobrescribe en silencio.

Se escribe a mano solo el codigo de dominio: `uml-core`, el generador Spring Boot,
el XMI, los nodos del lienzo, la capa de sincronizacion y la interfaz propia.

## Metodo de trabajo

Se trabaja fase a fase. Al terminar cada una: reportar que se construyo, que
ordenes de verificacion se ejecutaron y su resultado exacto, y **esperar
aprobacion explicita**. No se avanza a la siguiente fase por cuenta propia.

Si algo falla, se dice con la salida real. Si un paso se salto, se dice.

## Estado del repositorio

| Fase   | Contenido                                      | Estado     |
| ------ | ---------------------------------------------- | ---------- |
| 0      | Monorepo, configuracion compartida, Docker, CI | Completada |
| 1      | `packages/uml-core`                            | Completada |
| 2 a 10 | Ver el skill de cada fase                      | Pendiente  |

Versiones ya resueltas y fijadas: pnpm 11.24.0, Node 22, TypeScript 5.9.3,
ESLint 9.39.5, Turborepo 2.10.12, Prettier 3.9.6, Zod 4.5.2, Yjs 13.6.32,
Vitest 4.1.11. NestJS se fija en la linea 11 y `@nestjs/swagger` en la 11.4.7
(la linea 12 exige NestJS 12). Prisma se fija en 7.10.0 estable: la etiqueta
`latest` apunta a una version candidata.
