# 0012. Vitest y SWC para pruebas unitarias y E2E en NestJS

Fecha: 2026-08-29
Estado: Aceptado

## Contexto

El andamiaje generado por la CLI de NestJS incluye Jest y `ts-jest` como motor de
pruebas predeterminado. El monorepo de UML Forge utiliza Vitest 4 en todos los
paquetes compartidos y en la aplicacion web. Mantener Jest en `apps/api`
introduciria dos ejecutores de pruebas incompatibles, duplicacion de dependencias
y mayor consumo de memoria en la ejecucion de Turborepo.

Ademas, NestJS depende fuertemente de decoradores y metadatos de reflexion
(`emitDecoratorMetadata`), caracteristica que Vitest no procesa por defecto sin
un plugin de compilacion.

## Decision

- Sustituir Jest por **Vitest** en `apps/api`, alineando todo el monorepo bajo el
  mismo ejecutor.
- Configurar el plugin `unplugin-swc` en `vitest.config.mts` y `vitest.e2e.config.mts`
  para habilitar `legacyDecorator` y `decoratorMetadata` preservando la sintaxis ESM
  de las pruebas.
- Ejecutar las pruebas E2E con `fileParallelism: false` para evitar condiciones de
  carrera en la base de datos PostgreSQL compartida.

## Consecuencias

- Un unico ejecutor de pruebas (`vitest`) en todo el repositorio, simplificando
  los scripts de Turborepo y la configuracion de CI.
- Tiempos de ejecucion y compilacion reducidos gracias a SWC.
- Coexistencia transparente de decoradores NestJS bajo el entorno de Vitest.
