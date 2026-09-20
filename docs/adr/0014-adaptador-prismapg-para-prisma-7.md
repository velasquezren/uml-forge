# 0014. Adaptador PrismaPg para PostgreSQL en Prisma 7

Fecha: 2026-08-29
Estado: Aceptado

## Contexto

En Prisma 7 la directiva `url` dentro del bloque `datasource db` del fichero
`schema.prisma` ha quedado descontinuada para conexiones directas del cliente.
La version 7 requiere el uso de un controlador o driver adapter
(`@prisma/adapter-pg`) junto con un pool de conexiones `pg` nativo.

## Decision

- Configurar `schema.prisma` sin directiva `url` directa en el esquema.
- Configurar `prisma.config.ts` usando la funcion `defineConfig` y la carga de
  entorno nativa de Node 22 (`loadEnvFile`).
- Instalar `@prisma/adapter-pg` y `pg`, instanciando `PrismaClient` con el adaptador
  `new PrismaPg(new Pool({ connectionString }))`.

## Consecuencias

- Compatibilidad total con la arquitectura y optimizaciones de Prisma 7.
- Manejo eficiente de conexiones mediante el pool de `pg`.
