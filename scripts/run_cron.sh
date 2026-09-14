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
  onboard-autofull)
    # One-off vendor onboarding — Autofull EU (AWIN merchant 125332), per
    # explicit user request. Idempotent insert (ON CONFLICT on slug, safe
    # to re-run), then a scoped import of just this vendor via the same
    # already-proven import_awin_feeds.py used for every other vendor
    # (including the daily awin-fast/awin-voghion cron jobs). This is a
    # pure database operation — no build, no service restart, does not
    # touch the running app process at all. Remove this case once the
    # vendor is confirmed onboarded.
    ./scripts/.venv/bin/python3 -c "
import os, psycopg2
conn = psycopg2.connect(os.environ['DATABASE_URL'])
conn.autocommit = True
with conn.cursor() as cur:
    cur.execute('''
        INSERT INTO vendors (name, slug, feed_url, awin_merchant_id, is_active)
        VALUES (%s, %s, %s, %s, TRUE)
        ON CONFLICT (slug) DO UPDATE SET feed_url = EXCLUDED.feed_url, awin_merchant_id = EXCLUDED.awin_merchant_id
    ''', ('Autofull EU', 'autofull-eu',
          'https://ui.awin.com/productdata-darwin-download/publisher/2988023/441dd8c531d5bac0a84d1df5f5ff071f/1/feed/F3135.csv.gz',
          '125332'))
print('vendor row upserted: Autofull EU (autofull-eu, AWIN 125332)')
"
    export VENDOR_FILTER="Autofull EU"
    exec ./scripts/.venv/bin/python3 scripts/import_awin_feeds.py
    ;;
  category-counts)
    # Temporary, one-off — dumps id/parent_id/slug/name/direct product count
    # for every active category, for a content-gap analysis against
    # preisgucken_com/lib/blogCategories.ts's pgLink coverage. Uses the same
    # SSH mechanism as every other real-data check this project needs (see
    # memory: production_db_location — direct psql from a local machine
    # only ever reaches a stale snapshot, never the real DB). Remove once
    # the gap analysis is done.
    exec ./scripts/.venv/bin/python3 -c "
import os, psycopg2
conn = psycopg2.connect(os.environ['DATABASE_URL'])
with conn.cursor() as cur:
    cur.execute('''
        SELECT c.id, c.parent_id, c.slug, c.name, COUNT(p.id)
        FROM categories c
        LEFT JOIN products p ON p.category_id = c.id AND p.is_active = TRUE AND p.in_stock = TRUE
        WHERE c.is_active = TRUE
        GROUP BY c.id, c.parent_id, c.slug, c.name
        ORDER BY c.id
    ''')
    for row in cur.fetchall():
        print('|'.join(str(x) for x in row))
"
    ;;
  *)
    echo "Rejected: unknown job '${SSH_ORIGINAL_COMMAND:-<empty>}'" >&2
    exit 1
    ;;
esac
