#!/bin/sh
# Punto de entrada del contenedor de la API.
# Aplica las migraciones pendientes y luego arranca el servidor.
set -e

echo "→ Aplicando migraciones de la base de datos…"
./node_modules/.bin/prisma migrate deploy

echo "→ Iniciando POS Core API…"
exec node dist/src/main
