#!/bin/sh
# Arranque de la API dentro del contenedor: primero deja la base de datos al
# dia, siembra si se ha pedido, y solo entonces sirve peticiones.
set -e

echo "Aplicando migraciones de Prisma..."
pnpm exec prisma migrate deploy

if [ "${SEED_ON_START}" = "true" ]; then
  # Solo si la base de datos esta vacia: la siembra borra todo lo que haya.
  echo "Sembrando datos de demostracion si la base de datos esta vacia..."
  SEED_ONLY_IF_EMPTY=true pnpm run seed
fi

echo "Arrancando la API de UML Forge..."
exec node dist/src/main
