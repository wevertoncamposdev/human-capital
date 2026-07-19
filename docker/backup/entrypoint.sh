#!/bin/sh
set -eu

mkdir -p "${BACKUP_DIR:-/backups}" /uploads

command="${1:-cron}"

case "${command}" in
  cron)
    echo "${BACKUP_SCHEDULE:-0 3 * * *} /usr/local/bin/backup.sh >> /proc/1/fd/1 2>> /proc/1/fd/2" > /etc/crontabs/root
    exec crond -f -l 2
    ;;
  backup-now)
    exec /usr/local/bin/backup.sh
    ;;
  restore-db)
    shift
    exec /usr/local/bin/restore-db.sh "$@"
    ;;
  restore-uploads)
    shift
    exec /usr/local/bin/restore-uploads.sh "$@"
    ;;
  *)
    exec "$@"
    ;;
esac
