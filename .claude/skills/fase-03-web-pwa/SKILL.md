---
name: fase-03-web-pwa
description: Fase 3 de UML Forge. Andamiaje de apps/web con create vite, Tailwind v4 CSS-first, shadcn/ui por CLI, TanStack Router con los cuatro layouts, pantallas de login, registro y proyectos, y PWA instalable con shell offline.
---

# Fase 3: apps/web

## Prerrequisitos

Fase 2 completada y la API arrancando.

## Paso 1: andamiaje con la CLI (obligatorio)

```bash
cd apps
pnpm create vite web --template react-ts
```

Despues, Tailwind v4 y shadcn tambien por CLI:

```bash
pnpm --filter @uml-forge/web add tailwindcss @tailwindcss/vite
pnpm --filter @uml-forge/web dlx shadcn@latest init
```

**Cada componente de shadcn se instala con su orden. Esta prohibido escribirlos
a mano:**

```bash
pnpm --filter @uml-forge/web dlx shadcn@latest add button input label card form
pnpm --filter @uml-forge/web dlx shadcn@latest add dialog dropdown-menu select
pnpm --filter @uml-forge/web dlx shadcn@latest add tabs tooltip separator sheet
```

Estilo **new-york**, colores **OKLCH**. El codigo de los componentes vive en el
repositorio, no como dependencia.

### Contradicciones conocidas

- La plantilla de Vite genera su propio `eslint.config.js` y `tsconfig` que hay
  que reemplazar por los compartidos. Avisar antes.
- `shadcn init` puede querer crear un `tailwind.config.js`. **La especificacion
  exige configuracion CSS-first con `@theme` y sin fichero de configuracion.**
  Avisar y resolver antes de continuar.

## Paso 2: adaptacion al monorepo

- Borrar `.git` y ficheros de bloqueo propios.
- `package.json`: nombre `@uml-forge/web`, dependencia
  `"@uml-forge/uml-core": "workspace:*"`, scripts `dev`, `build`, `preview`,
  `typecheck`, `lint`, `test`, `test:e2e`.
- `tsconfig.json`: `extends` a `@uml-forge/tsconfig/vite.json`.
- `eslint.config.js`: reexportar `@uml-forge/eslint-config/react`.
- Tailwind se registra como plugin de Vite (`@tailwindcss/vite`), no via PostCSS.

## Paso 3: estructura

```
src/
  app/            providers, queryClient, router
  routes/         rutas de TanStack Router (file-based)
  layouts/        AuthLayout, AppShell, EditorLayout, AssistantLayout
  features/       auth/ projects/ editor/ collaboration/ ai/ voice/ codegen/ xmi/ offline/
  components/ui/  componentes generados por shadcn
  lib/            api, storage, utils, constants
  hooks/  stores/  workers/  sw.ts
```

## Paso 4: rutas y layouts

El `routeTree` lo **genera** `@tanstack/router-plugin`. No se escribe a mano ni
se versiona como codigo editado.

- `/login`, `/register` con `AuthLayout`: tarjeta centrada, sin navegacion.
- `/projects`, `/projects/:id/settings` con `AppShell`: barra lateral colapsable,
  cabecera con usuario e indicador de conexion.
- `/projects/:id/editor` con `EditorLayout`: lienzo a pantalla completa, panel
  izquierdo de paleta y arbol del modelo, panel derecho de propiedades, barra
  inferior de estado con presencia y sincronizacion.
- `/projects/:id/assistant` con `AssistantLayout`: **sin interfaz de edicion**.
  Solo boton grande de microfono, transcripcion en vivo y operaciones aplicadas.

Los search params se validan con Zod en la definicion de la ruta.

## Paso 5: datos y formularios

- TanStack Query v5 para el estado de servidor; Zustand solo para estado de
  cliente que no venga de la API.
- Cliente HTTP `ky` con un interceptor que adjunta el access token en memoria y
  reintenta una vez tras refrescar. **El access token nunca va a localStorage.**
- React Hook Form + Zod en login y registro.
- `sonner` para notificaciones, `lucide-react` para iconos.

## Paso 6: PWA

- `vite-plugin-pwa` con `strategies: 'injectManifest'` y service worker propio en
  `src/sw.ts`.
- Precache de todo el shell. `NetworkFirst` para lecturas de `/api/*`,
  `CacheFirst` para fuentes y estaticos.
- Manifest completo con iconos 192, 512 y maskable, `display: standalone`.
- **NO usar `localStorage` para datos de aplicacion. Solo IndexedDB.**
- Llamar a `navigator.storage.persist()` al iniciar sesion y **advertir al
  usuario si devuelve `false`**: sin almacenamiento persistente el navegador
  puede desalojar el modelo offline y los pesos del LLM sin aviso.

## Criterio de terminado

- Las cuatro rutas cargan con su layout correcto.
- Login y registro funcionan de verdad contra la API de la Fase 2.
- La aplicacion es instalable y el shell carga sin conexion.
- `pnpm typecheck && pnpm lint && pnpm test && pnpm build` en verde.
- ADR por cada decision no especificada.

## Trampas conocidas

- `vite-plugin-pwa` declara `workbox-build` y `workbox-window` como peer: hay que
  instalarlos explicitamente.
- Con `injectManifest`, el service worker propio debe llamar a
  `precacheAndRoute(self.__WB_MANIFEST)` o el precache queda vacio sin error.
- Tailwind v4 no lee `tailwind.config.js`: los tokens van en CSS con `@theme`.
- El plugin de TanStack Router debe ir **antes** del plugin de React en la lista
  de plugins de Vite.
