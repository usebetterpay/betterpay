#!/usr/bin/env bash
# Install nginx site + TLS for ui.betterpay.dev → Cloudflare Pages proxy.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CONF_SRC="$ROOT/deploy/nginx.ui.betterpay.dev.conf"
CONF_DST="/etc/nginx/sites-available/ui.betterpay.dev.conf"
LINK_DST="/etc/nginx/sites-enabled/ui.betterpay.dev.conf"

# 1) HTTP-only bootstrap for ACME
sudo tee "$CONF_DST" >/dev/null <<'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name ui.betterpay.dev;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        proxy_pass         https://betterpay-ui.pages.dev;
        proxy_http_version 1.1;
        proxy_ssl_server_name on;
        proxy_set_header Host betterpay-ui.pages.dev;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_redirect https://betterpay-ui.pages.dev/ https://ui.betterpay.dev/;
    }
}
EOF

sudo ln -sfn "$CONF_DST" "$LINK_DST"
sudo nginx -t
sudo systemctl reload nginx

# 2) Certificate
if [[ ! -d /etc/letsencrypt/live/ui.betterpay.dev ]]; then
  sudo certbot certonly --webroot -w /var/www/certbot \
    -d ui.betterpay.dev \
    --non-interactive --agree-tos \
    --register-unsafely-without-email \
    --keep-until-expiring
fi

# 3) Full SSL config
sudo cp "$CONF_SRC" "$CONF_DST"
sudo nginx -t
sudo systemctl reload nginx

echo "OK → https://ui.betterpay.dev (proxy → betterpay-ui.pages.dev)"
