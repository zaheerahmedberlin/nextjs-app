#!/bin/bash
# Forced-command dispatcher for the GitHub Actions cron SSH key.
# Only these three named jobs can run — the key cannot open a shell
# or run arbitrary commands, regardless of what the client requests.
set -euo pipefail
cd /var/www/preisgucken-de
# Secrets live in /etc/preisgucken-de.env (root:root, chmod 600) since the
# 2026-09 migration off a project-directory .env.production — the deploy
# user can't read it directly, so go through sudo into a private tmpfile.
ENV_TMP="$(mktemp)"
sudo cat /etc/preisgucken-de.env > "$ENV_TMP"
set -a
source "$ENV_TMP"
set +a
rm -f "$ENV_TMP"

case "${SSH_ORIGINAL_COMMAND:-}" in
  awin-voghion)
    export VENDOR_FILTER="Voghion Global"
    exec ./scripts/.venv/bin/python3 scripts/import_awin_feeds.py
    ;;
  awin-fast)
    export VENDOR_EXCLUDE="Voghion Global"
    exec ./scripts/.venv/bin/python3 scripts/import_awin_feeds.py
    ;;
  awin-shopify)
    exec ./scripts/.venv/bin/python3 scripts/refresh_shopify_vendors.py
    ;;
  cleanup-price-history)
    exec ./scripts/.venv/bin/python3 scripts/cleanup_price_history.py
    ;;
  snapshot-prices)
    exec ./scripts/.venv/bin/python3 scripts/snapshot_prices.py
    ;;
  dead-links)
    exec ./scripts/.venv/bin/python3 scripts/check_dead_links.py
    ;;
  *)
    echo "Rejected: unknown job '${SSH_ORIGINAL_COMMAND:-<empty>}'" >&2
    exit 1
    ;;
esac
