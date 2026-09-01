# 0017. Tailwind CSS v4 CSS-First y componentes shadcn/ui en el repositorio

Fecha: 2026-08-30
Estado: Aceptado

## Contexto

Tailwind CSS v4 introduce un motor de diseno basado en CSS moderno (`@theme`),
eliminando los archivos de configuracion JavaScript tradicionales (`tailwind.config.js`)
y acelerando sustancialmente los tiempos de build mediante el plugin nativo
`@tailwindcss/vite`.

Los componentes visuales deben ser altamente personalizables, accesibles y
residir directamente en el codigo fuente del proyecto para permitir modificaciones
sin dependencias de terceros opacas.

## Decision

1. **Configuracion CSS-First con Tailwind v4**:
   - Se utiliza `@import "tailwindcss"` y `@theme inline` en `src/index.css`.
   - Se utiliza el espacio de color perceptualmente uniforme **OKLCH** para
     todas las variables de tema claro y oscuro.
   - Prohibido el uso de `tailwind.config.js` y PostCSS.

2. **Componentes shadcn/ui instalados por CLI**:
   - Cada componente se genera exclusivamente mediante `shadcn add <componente>`.
   - Estilo **new-york**, con codigo fuente residiendo en `src/components/ui/`.

## Consecuencias

- Compilacion y recarga en caliente instantaneas con Vite.
- Diseno visual coherente, accesible y 100% personalizable.
