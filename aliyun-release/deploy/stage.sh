#!/bin/bash
set -euo pipefail
umask 027
test "$(id -u)" = 0 || { echo 'Run staging as root.' >&2; exit 1; }
source_dir="$(cd "$(dirname "$0")/.." && pwd)"
base=/opt/sakura-garden
state=/var/lib/sakura-garden
test -f "$source_dir/server.mjs"
test -f "$source_dir/dist/index.html"
command -v node >/dev/null
command -v dnf >/dev/null
node -e "const v=process.versions.node.split('.').map(Number);if(v[0]<22||(v[0]===22&&v[1]<18))process.exit(1)"
if systemctl is-active --quiet sakura-garden.service; then echo 'An active garden service exists; use a reviewed upgrade procedure.' >&2; exit 1; fi
if ss -ltnH '( sport = :80 or sport = :443 or sport = :3210 )' | awk 'END{exit NR == 0 ? 1 : 0}'; then echo 'A required port is already in use; staging stopped.' >&2; exit 1; fi
dnf install -y nginx python3 python3-pip
if ! id sakura-garden >/dev/null 2>&1; then useradd --system --home-dir "$state" --shell /sbin/nologin sakura-garden; fi
test "$(getent passwd sakura-garden | cut -d: -f6)" = "$state"
install -d -m 0755 "$base" "$base/runtime" "$base/logs" "$base/acme-webroot"
install -d -m 0700 -o sakura-garden -g sakura-garden "$state"
node_source="$(readlink -f "$(command -v node)")"
test "$(head -c4 "$node_source")" = $'\x7fELF'
install -m 0755 "$node_source" "$base/runtime/node"
install -m 0644 "$source_dir/server.mjs" "$base/server.mjs"
cp -a "$source_dir/dist" "$base/"
chmod -R a+rX "$base/dist"
python3 -m venv "$base/acme"
"$base/acme/bin/python" -m pip install --disable-pip-version-check certbot
install -m 0644 "$source_dir/deploy/nginx-http.conf" "$base/nginx-http.conf"
install -m 0644 "$source_dir/deploy/nginx-https.conf" "$base/nginx-https.conf"
ln -sfn "$base/nginx-http.conf" "$base/nginx.conf"
install -m 0755 "$source_dir/deploy/activate.sh" "$base/activate.sh"
install -m 0755 "$source_dir/deploy/renew.sh" "$base/renew.sh"
install -m 0644 "$source_dir/deploy/sakura-garden.service" /etc/systemd/system/sakura-garden.service
install -m 0644 "$source_dir/deploy/sakura-web.service" /etc/systemd/system/sakura-web.service
install -m 0644 "$source_dir/deploy/sakura-backup.service" /etc/systemd/system/sakura-backup.service
install -m 0644 "$source_dir/deploy/sakura-backup.timer" /etc/systemd/system/sakura-backup.timer
install -m 0644 "$source_dir/deploy/sakura-renew.service" /etc/systemd/system/sakura-renew.service
install -m 0644 "$source_dir/deploy/sakura-renew.timer" /etc/systemd/system/sakura-renew.timer
systemctl daemon-reload
/usr/sbin/nginx -t -c "$base/nginx.conf"
"$base/runtime/node" --version
"$base/acme/bin/certbot" --version
echo 'Staging complete. Application, public gateway and timers have not been started.'
