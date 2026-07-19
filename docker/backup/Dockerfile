FROM alpine:3.20

RUN apk add --no-cache postgresql-client tzdata tar gzip coreutils

COPY backup.sh /usr/local/bin/backup.sh
COPY restore-db.sh /usr/local/bin/restore-db.sh
COPY restore-uploads.sh /usr/local/bin/restore-uploads.sh
COPY entrypoint.sh /usr/local/bin/backup-entrypoint.sh

RUN chmod +x \
  /usr/local/bin/backup.sh \
  /usr/local/bin/restore-db.sh \
  /usr/local/bin/restore-uploads.sh \
  /usr/local/bin/backup-entrypoint.sh

ENTRYPOINT ["/usr/local/bin/backup-entrypoint.sh"]
