#!/bin/bash
set -euo pipefail
umask 077
backup_file="/var/backups/magaram/database-$(date -u +%Y%m%dT%H%M%SZ).sql.gz"
docker exec magaram-mysql-1 sh -c 'MYSQL_PWD="$MYSQL_PASSWORD" exec mysqldump --user="$MYSQL_USER" --single-transaction --no-tablespaces "$MYSQL_DATABASE"' | gzip > "$backup_file"
test -s "$backup_file"
# Retain the seven newest successful logical dumps; automatic Lightsail snapshots back up the host off-server.
node --input-type=module -e 'import{readdirSync,unlinkSync}from"node:fs";const dir="/var/backups/magaram";const names=readdirSync(dir).filter(n=>/^database-\d{8}T\d{6}Z\.sql\.gz$/.test(n)).sort().reverse();for(const n of names.slice(7))unlinkSync(`${dir}/${n}`);'
echo 'Database backup completed without printing data.'
