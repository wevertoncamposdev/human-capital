#!/bin/sh
set -eu

file="${1:-}"
if [ -z "${file}" ] || [ "${file}" = "--latest" ]; then
  file="${BACKUP_DIR}/${POSTGRES_DB}-db-latest.sql.gz"
fi

if [ ! -f "${file}" ]; then
  echo "Arquivo de backup do banco nao encontrado: ${file}" >&2
  exit 1
fi

# PostgreSQL restore using psql
export PGPASSWORD="${POSTGRES_PASSWORD}"

gzip -dc "${file}" | psql \
  --host="${POSTGRES_HOST}" \
  --port="${POSTGRES_PORT:-5432}" \
  --username="${POSTGRES_USER}" \
  "${POSTGRES_DB}"

echo "Banco restaurado a partir de ${file}"
