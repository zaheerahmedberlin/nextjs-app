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

# Python fully buffers stdout when it isn't a TTY (i.e. always, over this
# non-interactive SSH invocation) — a long-running script that doesn't print
# often enough can go silent for minutes at a time even though it's actively
# working, which is part of what let check_dead_links.py's SSH session look
# idle and get dropped ("client_loop: send disconnect: Broken pipe") before
# it could finish. Unbuffered stdout for every job here, not just that one,
# since any future long-running script would hit the exact same failure mode.
export PYTHONUNBUFFERED=1

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
  add-link-checked-index)
    # Temporary, one-off — the partial index supporting the bounded
    # dead-link-check batch query (see check_dead_links.py) was created
    # against 192.168.178.37, since confirmed to be a stale, disconnected
    # snapshot rather than the real production DB (127.0.0.1/railway on
    # this server). Applying it here for real. CONCURRENTLY so it doesn't
    # lock the table. Remove this case once confirmed applied.
    exec ./scripts/.venv/bin/python3 -c "
import os, psycopg2
conn = psycopg2.connect(os.environ['DATABASE_URL'])
conn.autocommit = True
with conn.cursor() as cur:
    cur.execute('''
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_link_checked_at
        ON products (link_checked_at ASC NULLS FIRST)
        WHERE is_active = TRUE AND url IS NOT NULL AND url != ''
    ''')
    print('Index created (or already existed).')
    cur.execute('''
        EXPLAIN ANALYZE
        SELECT p.id, p.title, p.url, v.name
        FROM products p
        LEFT JOIN vendors v ON v.id = p.vendor_id
        WHERE p.is_active = TRUE AND p.url IS NOT NULL AND p.url != ''
        ORDER BY p.link_checked_at ASC NULLS FIRST
        LIMIT 25000
    ''')
    for row in cur.fetchall():
        print(row[0])
"
    ;;
  *)
    echo "Rejected: unknown job '${SSH_ORIGINAL_COMMAND:-<empty>}'" >&2
    exit 1
    ;;
esac
