# 0003. Fijacion de lineas mayores y prohibicion de versiones candidatas

Fecha: 2026-08-29
Estado: Aceptado

## Contexto

Al resolver las dependencias contra el registro npm aparecieron tres desajustes
entre la etiqueta `latest` y lo que el proyecto necesita:

1. `typescript@latest` es 7.0.2, el port nativo. `typescript-eslint@8.68.0`
   declara `peerDependencies.typescript: ">=4.8.4 <6.1.0"`: con TypeScript 7 no
   habria analisis estatico con informacion de tipos.
2. `@nestjs/swagger@latest` es 12.0.1 y exige `@nestjs/common ^12.0.0`. El stack
   fijado es NestJS 11.
3. La etiqueta `latest` de `prisma` apunta a `8.0.0-rc.12`, una version
   candidata, mientras `@prisma/client` estable esta en 7.10.0.

## Decision

- Se instala siempre la ultima version **dentro de la linea mayor decidida**,
  nunca la etiqueta `latest` a ciegas.
- Ninguna dependencia del proyecto puede ser una version candidata, alfa o beta.
- Lineas fijadas: TypeScript 5, ESLint 9, NestJS 11, Prisma 7, React 19, Vite 7.
- Consecuencia directa de NestJS 11: `@nestjs/swagger` se fija en la linea 11
  (11.4.7). Los demas satelites (`config` 12, `jwt` 12, `passport` 12,
  `throttler` 6, `terminus` 11) declaran compatibilidad explicita con NestJS 11.
- Prisma se instala como `prisma@7` y `@prisma/client@7`, ambos en 7.10.0.

## Consecuencias

- Ninguna actualizacion automatica puede introducir un salto de linea mayor.
- ESLint 9.39.5 emite un aviso de fin de soporte al instalarse. Es un aviso de
  ciclo de vida, no un fallo: la linea 9 es la especificada y su formato de
  configuracion plano es identico al de la linea 10, por lo que migrar seria una
  operacion de un solo commit si mas adelante interesa.
- Antes de cada instalacion se consulta la version resuelta y se reporta.
