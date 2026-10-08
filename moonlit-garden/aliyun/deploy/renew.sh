#!/bin/bash
set -euo pipefail
/opt/sakura-garden/acme/bin/certbot renew --quiet --deploy-hook 'systemctl reload sakura-web.service'
