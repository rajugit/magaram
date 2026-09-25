#!/bin/bash
# Run as root from an immutable Git release directory on the dedicated server.
set -euo pipefail
release_tag=${1:?commit SHA required}
if [[ ! "$release_tag" =~ ^[a-f0-9]{40}$ ]]; then exit 2; fi
exec 9>/var/lock/magaram-release.lock
flock -n 9 || { echo "Another release is in progress." >&2; exit 1; }
export RELEASE_TAG="$release_tag"
test -f /etc/magaram/runtime.env
if test -x /usr/local/sbin/magaram-backup; then /usr/local/sbin/magaram-backup; fi
docker build -f deploy/Dockerfile -t "magaram:$release_tag" .
docker compose -f deploy/compose.yaml up -d --wait mysql redis
docker run --rm --network host --env-file /etc/magaram/runtime.env \
  -w /app/apps/api "magaram:$release_tag" node node_modules/prisma/build/index.js migrate deploy
docker run --rm --network host --env-file /etc/magaram/runtime.env \
  -w /app/apps/api "magaram:$release_tag" node --import tsx prisma/seed.ts
if ! test -f /etc/magaram/admin-initialized; then
  docker run --rm --network host --env-file /etc/magaram/runtime.env \
    --env-file /etc/magaram/bootstrap.env -w /app/apps/api "magaram:$release_tag" \
    node --import tsx prisma/seed-super-admin.ts
  touch /etc/magaram/admin-initialized
fi
docker compose -f deploy/compose.yaml up -d api web worker
for attempt in $(seq 1 30); do
  if curl --fail --silent http://127.0.0.1:4000/ready >/dev/null && curl --fail --silent http://127.0.0.1:3000/preview/3 >/dev/null && curl --fail --silent http://127.0.0.1:3000/preview/4 >/dev/null && curl --fail --silent http://127.0.0.1:3000/preview/7 >/dev/null && curl --fail --silent http://127.0.0.1:3000/preview/7/workspace >/dev/null && curl --fail --silent http://127.0.0.1:3000/local >/dev/null && curl --fail --silent http://127.0.0.1:4000/api/v1/local/businesses >/dev/null && curl --fail --silent http://127.0.0.1:3000/news >/dev/null && curl --fail --silent http://127.0.0.1:3000/news/category/local >/dev/null && curl --fail --silent http://127.0.0.1:3000/news/location/chennai >/dev/null && curl --fail --silent http://127.0.0.1:3000/robots.txt >/dev/null && curl --fail --silent http://127.0.0.1:3000/sitemap.xml >/dev/null && curl --fail --silent http://127.0.0.1:3000/rss.xml >/dev/null && curl --fail --silent http://127.0.0.1:3000/news-sitemap.xml >/dev/null && test "$(docker inspect -f '{{.State.Running}}' magaram-worker-1)" = true; then
    ln -sfn "$PWD" /opt/magaram/current
    install -m 755 deploy/backup.sh /usr/local/sbin/magaram-backup
    install -m 644 deploy/magaram-backup.service /etc/systemd/system/magaram-backup.service
    install -m 644 deploy/magaram-backup.timer /etc/systemd/system/magaram-backup.timer
    systemctl daemon-reload
    systemctl enable --now magaram-backup.timer
    echo "Release healthy: $release_tag"
    exit 0
  fi
  sleep 2
done
echo 'Release health check failed; inspect service logs and retain prior image for rollback.' >&2
exit 1
