#!/bin/sh
set -eu

timestamp="$(date +%Y%m%d-%H%M%S)"
prefix="${BACKUP_DIR}/${POSTGRES_DB}"
db_file="${prefix}-db-${timestamp}.sql.gz"
uploads_file="${prefix}-uploads-${timestamp}.tar.gz"
latest_db="${prefix}-db-latest.sql.gz"
latest_uploads="${prefix}-uploads-latest.tar.gz"

mkdir -p "${BACKUP_DIR}" /uploads

# PostgreSQL backup using pg_dump
export PGPASSWORD="${POSTGRES_PASSWORD}"

pg_dump \
  --host="${POSTGRES_HOST}" \
  --port="${POSTGRES_PORT:-5432}" \
  --username="${POSTGRES_USER}" \
  --format=plain \
  "${POSTGRES_DB}" | gzip -c > "${db_file}"

tar -czf "${uploads_file}" -C /uploads .

cp -f "${db_file}" "${latest_db}"
cp -f "${uploads_file}" "${latest_uploads}"

find "${BACKUP_DIR}" -type f -name "${POSTGRES_DB}-db-*.sql.gz" ! -name "*-latest.sql.gz" -mtime +"${BACKUP_KEEP_DAYS}" -delete
find "${BACKUP_DIR}" -type f -name "${POSTGRES_DB}-uploads-*.tar.gz" ! -name "*-latest.tar.gz" -mtime +"${BACKUP_KEEP_DAYS}" -delete

echo "Backup concluido:"
echo "  - ${db_file}"
echo "  - ${uploads_file}"
