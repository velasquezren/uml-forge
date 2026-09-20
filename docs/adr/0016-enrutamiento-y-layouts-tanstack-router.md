# 0016. Enrutamiento tipado y cuatro layouts con TanStack Router

Fecha: 2026-08-30
Estado: Aceptado

## Contexto

UML Forge tiene diferentes modos de uso que requieren estructuras de interfaz
claramente diferenciadas: autenticacion aislada, administracion de proyectos,
edicion de diagramas a pantalla completa, y un modo asistente de voz donde la
edicion manual no debe interferir con la interaccion por voz.

Ademas, el enrutamiento requiere tipado estricto de parametros (`projectId`) y
search params para evitar errores en tiempo de ejecucion.

## Decision

1. **Adopcion de TanStack Router con generacion automatica de rutas**:
   - Se utiliza `@tanstack/router-plugin` para generar `src/routeTree.gen.ts`.
   - Queda prohibido escribir el arbol de rutas a mano.

2. **Estructuracion de los tres layouts especializados**:
   - **AuthLayout**: Tarjeta centrada sin navegacion superior ni lateral para
     `/login` y `/register`.
   - **AppShell**: Barra lateral colapsable, indicador reactivo de red y menu
     de usuario para `/projects` y `/projects/$projectId/settings`.
   - **EditorLayout**: Lienzo a pantalla completa, barra superior con
     deshacer/rehacer, panel izquierdo (paleta y arbol del modelo), panel derecho
     (propiedades) y barra inferior (presencia y sincronizacion) para
     `/projects/$projectId/editor`.

## Consecuencias

- Enrutamiento totalmente seguro en tipos en todo el frontend.
- Clara separacion de responsabilidades en la experiencia de usuario.
