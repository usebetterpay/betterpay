#!/usr/bin/env bash
# Install nginx site + TLS for demo.betterpay.dev (NOPASSWD helpers).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CONF_SRC="$ROOT/deploy/nginx.demo.betterpay.dev.conf"
CONF_DST="/etc/nginx/sites-available/demo.betterpay.dev.conf"
LINK_DST="/etc/nginx/sites-enabled/demo.betterpay.dev.conf"

# 1) HTTP-only bootstrap for ACME (no SSL yet)
sudo tee "$CONF_DST" >/dev/null <<'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name demo.betterpay.dev;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        proxy_pass         http://127.0.0.1:8791;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

sudo ln -sfn "$CONF_DST" "$LINK_DST"
sudo nginx -t
sudo systemctl reload nginx

# 2) Certificate
if [[ ! -d /etc/letsencrypt/live/demo.betterpay.dev ]]; then
  sudo certbot certonly --webroot -w /var/www/certbot \
    -d demo.betterpay.dev \
    --non-interactive --agree-tos \
    --register-unsafely-without-email \
    --keep-until-expiring
fi

# 3) Full SSL config
sudo cp "$CONF_SRC" "$CONF_DST"
sudo nginx -t
sudo systemctl reload nginx

# 4) Disable old dogfood host if present
if [[ -L /etc/nginx/sites-enabled/dogfood.betterpay.dev.conf ]]; then
  sudo rm -f /etc/nginx/sites-enabled/dogfood.betterpay.dev.conf
  sudo nginx -t && sudo systemctl reload nginx || true
  echo "Disabled dogfood.betterpay.dev site"
fi

echo "OK → https://demo.betterpay.dev"
