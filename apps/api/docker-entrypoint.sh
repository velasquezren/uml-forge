#!/bin/sh
# Arranque de la API dentro del contenedor: primero deja la base de datos al
# dia, siembra si se ha pedido, y solo entonces sirve peticiones.
set -e

echo "Aplicando migraciones de Prisma..."
pnpm exec prisma migrate deploy

if [ "${SEED_ON_START}" = "true" ]; then
  echo "Sembrando datos de demostracion..."
  pnpm run seed
fi

echo "Arrancando la API de UML Forge..."
exec node dist/src/main
