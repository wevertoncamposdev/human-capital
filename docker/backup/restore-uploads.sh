#!/bin/sh
set -eu

file="${1:-}"
if [ -z "${file}" ] || [ "${file}" = "--latest" ]; then
  file="${BACKUP_DIR}/${MYSQL_DATABASE}-uploads-latest.tar.gz"
fi

if [ ! -f "${file}" ]; then
  echo "Arquivo de backup dos uploads nao encontrado: ${file}" >&2
  exit 1
fi

mkdir -p /uploads
find /uploads -mindepth 1 -maxdepth 1 -exec rm -rf {} +
tar -xzf "${file}" -C /uploads

echo "Uploads restaurados a partir de ${file}"
