#!/bin/sh
# Lightsail prepends its SSH setup and invokes user-data through /bin/sh.
set -eu
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y docker.io docker-compose-v2 nginx nodejs python3-venv ca-certificates
systemctl enable --now docker nginx
python3 -m venv /opt/magaram-certbot
/opt/magaram-certbot/bin/pip install 'certbot>=5.4,<6'
install -d -m 700 /etc/magaram /var/backups/magaram
install -d -m 755 /opt/magaram /var/www/acme /var/lib/magaram/uploads
chown 1000:1000 /var/lib/magaram/uploads
if ! swapon --show | tail -n +2 | grep -q .; then
  fallocate -l 2G /var/swap-magaram
  chmod 600 /var/swap-magaram
  mkswap /var/swap-magaram
  swapon /var/swap-magaram
fi
touch /opt/magaram/bootstrap-ready
