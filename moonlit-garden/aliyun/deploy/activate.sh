#!/bin/bash
set -euo pipefail
test "${1:-}" = '--approved-publication-and-acme-terms' || { echo 'Publication and certificate subscriber agreement must be approved first.' >&2; exit 1; }
test "$(id -u)" = 0
base=/opt/sakura-garden
systemctl start sakura-web.service
"$base/acme/bin/certbot" certonly --webroot --webroot-path "$base/acme-webroot" --domain sakura.baodaoxiaoyuan.cn --agree-tos --register-unsafely-without-email --non-interactive --keep-until-expiring
ln -sfn "$base/nginx-https.conf" "$base/nginx.conf"
/usr/sbin/nginx -t -c "$base/nginx.conf"
systemctl reload sakura-web.service
systemctl enable --now sakura-garden.service
systemctl enable sakura-web.service
systemctl enable --now sakura-backup.timer sakura-renew.timer
echo 'Website activated. Complete /setup personally using the private setup-code file.'
