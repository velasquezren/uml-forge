# @uml-forge/web

PWA colaborativa de modelado UML 2.5 y cliente principal de UML Forge.

Construida con React 19, Vite 7, Tailwind CSS v4 (CSS-First), componentes shadcn/ui, TanStack Router y soporte offline como Progressive Web App (PWA).

## Caracteristicas principales

- **Lienzo colaborativo**: Editor de diagramas de clases UML con `@xyflow/react` sincronizado en tiempo real sobre CRDT Yjs (`useYjsModel`).
- **Presencia y cursores**: Avatares en vivo y cursores remotos con aceleracion y throttle via canal de awareness.
- **Modo offline resiliente**: Persistencia local en IndexedDB (`y-indexeddb`), cola outbox para operaciones diferidas y resolucion automatica de conflictos al reconectar.
- **Enrutamiento tipado y layouts especializados**:
  - `AuthLayout`: Formularios centrados para `/login` y `/register`.
  - `AppShell`: Barra lateral colapsable, estado de conexion y gestion de proyectos (`/projects`).
  - `EditorLayout`: Lienzo a pantalla completa con paleta, arbol de elementos e inspector de propiedades.
  - `AssistantLayout`: Interfaz minimalista para interactuar con la IA exclusivamente por voz.
- **Asistente de IA por voz e imagen**: Dictado nativo con Web Speech API y carga de bocetos en papel para sugerir operaciones UML sin aplicarlas a ciegas.
- **Interoperabilidad XMI 2.1**: Exportacion e importacion de modelos conformes al estandar OMG y compatibles con Enterprise Architect directamente en el navegador.
- **Generacion de backend Spring Boot**: Modal de configuracion y descarga directa del proyecto Maven comprimido en ZIP.
- **PWA instalable**: Registro de service worker (`injectManifest`), almacenamiento persistente con `navigator.storage.persist()` y precache de recursos estaticos.

## Puesta en marcha

Desde la raiz del monorepo:

```bash
pnpm --filter @uml-forge/web run dev
```

El servidor de desarrollo iniciara en <http://localhost:5173>.

## Scripts

| Comando                                      | Descripcion                                            |
| -------------------------------------------- | ------------------------------------------------------ |
| `pnpm --filter @uml-forge/web run dev`       | Servidor de desarrollo Vite con recarga en caliente    |
| `pnpm --filter @uml-forge/web run build`     | Compilacion de produccion del cliente y Service Worker |
| `pnpm --filter @uml-forge/web run typecheck` | Verificacion estricta de tipos TypeScript              |
| `pnpm --filter @uml-forge/web run lint`      | Analisis estatico con ESLint 9                         |
| `pnpm --filter @uml-forge/web run test`      | Bateria de pruebas unitarias con Vitest                |
| `pnpm --filter @uml-forge/web run test:e2e`  | Pruebas E2E de navegador con Playwright                |
