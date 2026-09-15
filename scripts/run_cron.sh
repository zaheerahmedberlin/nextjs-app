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
  autofull-check)
    # One-off — verify Autofull EU's 26 imported products and see what
    # category they landed in (their vendor name isn't covered by any
    # existing keyword rule in import_awin_feeds.py, so they likely fell
    # through to the generic default). Remove once confirmed.
    exec ./scripts/.venv/bin/python3 -c "
import os, psycopg2
conn = psycopg2.connect(os.environ['DATABASE_URL'])
with conn.cursor() as cur:
    cur.execute('''
        SELECT p.id, p.title, p.price, c.slug, c.name
        FROM products p
        JOIN vendors v ON v.id = p.vendor_id
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE v.slug = 'autofull-eu'
        ORDER BY p.id
    ''')
    for row in cur.fetchall():
        print('|'.join(str(x) for x in row))
"
    ;;
  onboard-anthbot)
    # One-off vendor onboarding — Anthbot DE (AWIN merchant 125144), per
    # explicit user request. Same idempotent-insert + scoped-import
    # pattern as every previous vendor (Autofull EU, Sportspar, etc.) —
    # pure database operation, no build, no service restart, does not
    # touch the running app process. Remove this case once the vendor
    # is confirmed onboarded.
    ./scripts/.venv/bin/python3 -c "
import os, psycopg2
conn = psycopg2.connect(os.environ['DATABASE_URL'])
conn.autocommit = True
with conn.cursor() as cur:
    cur.execute('''
        INSERT INTO vendors (name, slug, feed_url, awin_merchant_id, is_active)
        VALUES (%s, %s, %s, %s, TRUE)
        ON CONFLICT (slug) DO UPDATE SET feed_url = EXCLUDED.feed_url, awin_merchant_id = EXCLUDED.awin_merchant_id
    ''', ('Anthbot DE', 'anthbot-de',
          'https://ui.awin.com/productdata-darwin-download/publisher/2988023/441dd8c531d5bac0a84d1df5f5ff071f/1/feed/F3145.csv.gz',
          '125144'))
print('vendor row upserted: Anthbot DE (anthbot-de, AWIN 125144)')
"
    export VENDOR_FILTER="Anthbot DE"
    exec ./scripts/.venv/bin/python3 scripts/import_awin_feeds.py
    ;;
  anthbot-check)
    # One-off — verify Anthbot DE's imported products and see what
    # category they landed in. Remove once confirmed.
    exec ./scripts/.venv/bin/python3 -c "
import os, psycopg2
conn = psycopg2.connect(os.environ['DATABASE_URL'])
with conn.cursor() as cur:
    cur.execute('''
        SELECT COUNT(*) FROM products p
        JOIN vendors v ON v.id = p.vendor_id
        WHERE v.slug = 'anthbot-de'
    ''')
    print(f'Total Anthbot DE products: {cur.fetchone()[0]}')
    cur.execute('''
        SELECT c.slug, c.name, COUNT(*) AS cnt
        FROM products p
        JOIN vendors v ON v.id = p.vendor_id
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE v.slug = 'anthbot-de'
        GROUP BY c.slug, c.name
        ORDER BY cnt DESC
    ''')
    print('--- category breakdown ---')
    for row in cur.fetchall():
        print('|'.join(str(x) for x in row))
    cur.execute('''
        SELECT p.id, p.title, p.price
        FROM products p
        JOIN vendors v ON v.id = p.vendor_id
        WHERE v.slug = 'anthbot-de'
        ORDER BY p.title
    ''')
    print('--- ALL products (id|price|title) ---')
    for pid, title, price in cur.fetchall():
        print(f'{pid}|{price}|{title[:150]}')
"
    ;;
  aliva-categorize-dryrun)
    # One-off — DRY RUN ONLY, zero writes. Classifies Aliva Apotheke DE's
    # 28,841 Sonstiges products into the 18 existing (currently empty,
    # 0 products each) pharmacy subcategories under Gesundheit & Pflege
    # (id 41), using keyword rules built from a real 1000-title frequency
    # analysis. Prints per-rule match counts + a title sample from each,
    # so both the matched AND leftover-unmatched buckets can be
    # spot-checked before any real UPDATE runs — same methodology as
    # every previous category split this project (Sportspar, Grill,
    # Netzwerktechnik). Remove once the real categorization is done.
    exec ./scripts/.venv/bin/python3 -c "
import os, psycopg2, re
conn = psycopg2.connect(os.environ['DATABASE_URL'])
with conn.cursor() as cur:
    cur.execute('''
        SELECT p.id, p.title FROM products p
        JOIN vendors v ON v.id = p.vendor_id
        JOIN categories c ON c.id = p.category_id
        WHERE c.slug = 'sonstiges' AND p.is_active = TRUE AND v.name = 'Aliva Apotheke DE'
    ''')
    rows = cur.fetchall()
print(f'Total Aliva Sonstiges products: {len(rows)}')

# Checked in order, first match wins. Keywords are substrings, matched
# case-insensitively against the lowercased title.
RULES = [
    # pflegebedarf-inkontinenz checked before intimgesundheit so
    # 'Urinalkondom' (a incontinence product, not contraception) is
    # intercepted first — bare 'kondom' in intimgesundheit would
    # otherwise wrongly claim it.
    (256, 'pflegebedarf-inkontinenz', ['katheter', 'beinbeutel', 'inkontinenz', 'urinbeutel', 'vorlage', 'stoma', 'windelhose', 'tribag', 'urinalkond', 'sekretbeutel', ' seni ']),
    (244, 'homoeopathie-naturheilmittel', ['globuli', 'dilution', 'weleda', 'wala ', 'urtinktur', 'schüssler', 'komplexmittel', ' d6 ', ' d12 ', ' d30 ', ' d4 ', ' d200 ', 'ledum', 'arnica', 'nux vomica', 'bachblüten', 'homaccord', 'injeel', 'spenglersan']),
    (261, 'intimgesundheit-verhuetung', ['kondom', 'gleitgel', 'verhütung', 'femidom', 'intimwaschlotion', 'sagella', 'vaginal']),
    (248, 'verbandsmaterial-erste-hilfe', ['pflaster', 'kompresse', 'verband', 'binde', 'mullbinde', 'elastomull', 'fixierbinde', 'wundschnellverband', 'zinkleimbinde', 'tg fix', 'es-kompressen', 'wund pad', 'wundpad', 'wundverb', 'tamponade', 'alkoholtupfer', 'tupfer', 'wundfolie']),
    # 'grippal' (as in 'grippaler Infekt') replaces the old bare
    # 'grippe' keyword — that substring falsely matched 'Gripper'
    # (a needle/lancet brand); 'grippal' catches the real cold/flu
    # products (incl. 'Gripp-Heel bei grippalen Infekten') without it.
    (246, 'erkaeltung-immunsystem', ['erkältung', 'hustensaft', 'grippal', 'immunsystem', 'halsschmerz', 'lutschtabletten', 'hustenstiller', 'bronchial', 'coldex']),
    (253, 'schmerzen-bewegungsapparat', ['schmerzgel', 'bandage', 'bort ', 'gelenkschmerz', 'rückenschmerz', 'orthese', 'bandagen', 'kniebandage', 'sprunggelenk', 'schmerztablette', 'ibuprofen', 'unterarmkrücke', 'krücke']),
    (251, 'augen-nase-ohren', ['augentropfen', 'nasenspray', 'ohrentropfen', 'kontaktlinsen', 'augencreme', 'augensalbe', 'nasenpflege']),
    (247, 'magen-darm', ['abführ', 'verstopfung', 'durchfall', 'magensäure', 'reflux', 'darmflora', 'probiotika', 'blähung', 'sodbrennen', 'galletropfen', 'galle']),
    (250, 'mund-zahnpflege', ['zahnpasta', 'mundspülung', 'zahnbürste', 'zahncreme', 'mundwasser', 'zahnfleisch']),
    (254, 'herz-kreislauf-stoffwechsel', ['blutdruck', 'cholesterin', 'diabetes', 'blutzucker']),
    # bare 'tampon' dropped — in this pharmacy catalog it almost always
    # hit 'Tamponade' (wound packing, verbandsmaterial), not feminine
    # hygiene; caught by verbandsmaterial's 'tamponade' rule above instead.
    (252, 'frauengesundheit-schwangerschaft', ['schwangerschaft', 'menstruation', 'wechseljahre']),
    # 'windeln' (plural, not bare 'windel') so it doesn't false-match
    # the unrelated word 'Schwindel' (dizziness) — 'Schwindelzuständen'
    # contains 'windel' but never 'windeln'. Adult SENI-brand diapers
    # are already intercepted by pflegebedarf-inkontinenz's ' seni '
    # rule checked first, so this only catches real baby diapers.
    (255, 'baby-kindergesundheit', ['baby', 'säugling', 'schnuller', 'nutrini', 'kinderwaage', 'windeln']),
    (259, 'tiergesundheit-apotheke', [' hund ', ' katze ', 'hunde-', 'katzen-', 'tierarznei']),
    (260, 'praxisbedarf-hygiene', ['handschuhe', 'desinfektion', 'einmalhandschuhe', 'mundschutz', 'kanüle', 'spritze steril', 'ampuwa', 'infusionslösung', 'injektionslösung']),
    (257, 'haar-fusspflege', ['shampoo', 'fußcreme', 'fußpflege', 'nagelpflege', 'hornhaut']),
    (249, 'haut-gesichtspflege', ['creme', 'gesichtscreme', 'lotion', 'salbe', 'balsam', ' gel ', 'serum', 'handcreme', 'hautschutzschaum']),
    # 'magnesi' (root) instead of 'magnesium' catches brand variants
    # like 'Magnesiocard' that don't contain the literal word.
    (245, 'nahrungsergaenzung-vitamine', ['kapseln', 'vitamin', 'calcium', 'magnesi', 'zink ', 'multivitamin', 'omega-3', 'eisen ', 'nahrungsergänzung', 'gerstengras', 'sanddorn', 'fresubin', 'jonosteril']),
    (258, 'tees-wellness', [' tee ', 'filterbeutel', 'kräutertee', 'früchtetee']),
    (47, 'blutdruckmessung', ['blutdruckmessgerät', 'visomat', 'manschette']),
    (48, 'heizkissen', ['heizkissen']),
    (49, 'rollatoren', ['rollator']),
    (50, 'massagegeraete', ['massagegerät']),
    (46, 'massagesessel', ['massagesessel']),
]

matched_counts = {slug: 0 for _, slug, _ in RULES}
matched_samples = {slug: [] for _, slug, _ in RULES}
unmatched = []
for pid, title in rows:
    t = ' ' + title.lower() + ' '
    hit = None
    for cid, slug, kws in RULES:
        if any(kw in t for kw in kws):
            hit = slug
            break
    if hit:
        matched_counts[hit] += 1
        if len(matched_samples[hit]) < 8:
            matched_samples[hit].append(title[:90])
    else:
        unmatched.append(title[:90])

print()
print('--- match counts per category ---')
for cid, slug, kws in RULES:
    print(f'{slug}: {matched_counts[slug]}')
print(f'UNMATCHED (stays in Sonstiges): {len(unmatched)}')

print()
print('--- sample per matched category ---')
for cid, slug, kws in RULES:
    if matched_samples[slug]:
        print(f'[{slug}]')
        for s in matched_samples[slug]:
            print(f'  {s}')

print()
print('--- unmatched sample (first 40) ---')
for s in unmatched[:40]:
    print(f'  {s}')
"
    ;;
  aliva-categorize-apply)
    # One-off — REAL WRITE, single transaction (all-or-nothing). Applies
    # the exact same RULES validated via aliva-categorize-dryrun (3
    # false-positive bugs found and fixed across 3 dry-run iterations:
    # 'grippe'->Gripper needle brand, 'kondom'->Urinalkondom, 'tampon'->
    # Tamponade wound packing, 'windel'->Schwindel dizziness, adult SENI
    # diapers->baby). Prints every single product moved (id|old|new|
    # title) for a full audit trail, plus the same summary counts.
    # Remove once the real categorization is done.
    exec ./scripts/.venv/bin/python3 -c "
import os, psycopg2
conn = psycopg2.connect(os.environ['DATABASE_URL'])
cur = conn.cursor()
cur.execute('''
    SELECT p.id, p.title FROM products p
    JOIN vendors v ON v.id = p.vendor_id
    JOIN categories c ON c.id = p.category_id
    WHERE c.slug = 'sonstiges' AND p.is_active = TRUE AND v.name = 'Aliva Apotheke DE'
''')
rows = cur.fetchall()
print(f'Total Aliva Sonstiges products: {len(rows)}')

RULES = [
    (256, 'pflegebedarf-inkontinenz', ['katheter', 'beinbeutel', 'inkontinenz', 'urinbeutel', 'vorlage', 'stoma', 'windelhose', 'tribag', 'urinalkond', 'sekretbeutel', ' seni ']),
    (244, 'homoeopathie-naturheilmittel', ['globuli', 'dilution', 'weleda', 'wala ', 'urtinktur', 'schüssler', 'komplexmittel', ' d6 ', ' d12 ', ' d30 ', ' d4 ', ' d200 ', 'ledum', 'arnica', 'nux vomica', 'bachblüten', 'homaccord', 'injeel', 'spenglersan']),
    (261, 'intimgesundheit-verhuetung', ['kondom', 'gleitgel', 'verhütung', 'femidom', 'intimwaschlotion', 'sagella', 'vaginal']),
    (248, 'verbandsmaterial-erste-hilfe', ['pflaster', 'kompresse', 'verband', 'binde', 'mullbinde', 'elastomull', 'fixierbinde', 'wundschnellverband', 'zinkleimbinde', 'tg fix', 'es-kompressen', 'wund pad', 'wundpad', 'wundverb', 'tamponade', 'alkoholtupfer', 'tupfer', 'wundfolie']),
    (246, 'erkaeltung-immunsystem', ['erkältung', 'hustensaft', 'grippal', 'immunsystem', 'halsschmerz', 'lutschtabletten', 'hustenstiller', 'bronchial', 'coldex']),
    (253, 'schmerzen-bewegungsapparat', ['schmerzgel', 'bandage', 'bort ', 'gelenkschmerz', 'rückenschmerz', 'orthese', 'bandagen', 'kniebandage', 'sprunggelenk', 'schmerztablette', 'ibuprofen', 'unterarmkrücke', 'krücke']),
    (251, 'augen-nase-ohren', ['augentropfen', 'nasenspray', 'ohrentropfen', 'kontaktlinsen', 'augencreme', 'augensalbe', 'nasenpflege']),
    (247, 'magen-darm', ['abführ', 'verstopfung', 'durchfall', 'magensäure', 'reflux', 'darmflora', 'probiotika', 'blähung', 'sodbrennen', 'galletropfen', 'galle']),
    (250, 'mund-zahnpflege', ['zahnpasta', 'mundspülung', 'zahnbürste', 'zahncreme', 'mundwasser', 'zahnfleisch']),
    (254, 'herz-kreislauf-stoffwechsel', ['blutdruck', 'cholesterin', 'diabetes', 'blutzucker']),
    (252, 'frauengesundheit-schwangerschaft', ['schwangerschaft', 'menstruation', 'wechseljahre']),
    (255, 'baby-kindergesundheit', ['baby', 'säugling', 'schnuller', 'nutrini', 'kinderwaage', 'windeln']),
    (259, 'tiergesundheit-apotheke', [' hund ', ' katze ', 'hunde-', 'katzen-', 'tierarznei']),
    (260, 'praxisbedarf-hygiene', ['handschuhe', 'desinfektion', 'einmalhandschuhe', 'mundschutz', 'kanüle', 'spritze steril', 'ampuwa', 'infusionslösung', 'injektionslösung']),
    (257, 'haar-fusspflege', ['shampoo', 'fußcreme', 'fußpflege', 'nagelpflege', 'hornhaut']),
    (249, 'haut-gesichtspflege', ['creme', 'gesichtscreme', 'lotion', 'salbe', 'balsam', ' gel ', 'serum', 'handcreme', 'hautschutzschaum']),
    (245, 'nahrungsergaenzung-vitamine', ['kapseln', 'vitamin', 'calcium', 'magnesi', 'zink ', 'multivitamin', 'omega-3', 'eisen ', 'nahrungsergänzung', 'gerstengras', 'sanddorn', 'fresubin', 'jonosteril']),
    (258, 'tees-wellness', [' tee ', 'filterbeutel', 'kräutertee', 'früchtetee']),
    (47, 'blutdruckmessung', ['blutdruckmessgerät', 'visomat', 'manschette']),
    (48, 'heizkissen', ['heizkissen']),
    (49, 'rollatoren', ['rollator']),
    (50, 'massagegeraete', ['massagegerät']),
    (46, 'massagesessel', ['massagesessel']),
]

moves = []
for pid, title in rows:
    t = ' ' + title.lower() + ' '
    for cid, slug, kws in RULES:
        if any(kw in t for kw in kws):
            moves.append((pid, cid, slug, title))
            break

print(f'Will update {len(moves)} of {len(rows)} products (rest stay in Sonstiges)')
try:
    for pid, cid, slug, title in moves:
        cur.execute('UPDATE products SET category_id = %s WHERE id = %s', (cid, pid))
    conn.commit()
    print('COMMITTED')
except Exception as e:
    conn.rollback()
    print(f'ROLLED BACK — {e}')
    raise

counts = {}
for pid, cid, slug, title in moves:
    counts[slug] = counts.get(slug, 0) + 1
print()
print('--- final counts per category ---')
for slug, n in sorted(counts.items(), key=lambda x: -x[1]):
    print(f'{slug}: {n}')

print()
print('--- full change list (id|new_category|title) ---')
for pid, cid, slug, title in moves:
    print(f'{pid}|{slug}|{title}')
"
    ;;
  aliva-sonstiges)
    # One-off — Aliva Apotheke DE alone accounts for 28,841 of the 39,152
    # Sonstiges products (73.6%) — the pharmacy vendor onboarded 2026-09-08
    # with 35,421 products but only 18 subcategories, leaving most of the
    # catalog uncategorized. Pulling the existing pharmacy category
    # structure (to route into, not duplicate) plus a large real title
    # sample to find actual clusters. Remove once the categorization work
    # is done.
    exec ./scripts/.venv/bin/python3 -c "
import os, psycopg2
conn = psycopg2.connect(os.environ['DATABASE_URL'])
with conn.cursor() as cur:
    cur.execute('''
        SELECT c.id, c.parent_id, c.slug, c.name,
               (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.is_active = TRUE) AS cnt
        FROM categories c
        WHERE c.id = 41 OR c.parent_id = 41
        ORDER BY c.id
    ''')
    print('--- existing Gesundheit (id=41) + subcategories ---')
    for row in cur.fetchall():
        print('|'.join(str(x) for x in row))
    cur.execute('''
        SELECT p.id, p.title
        FROM products p
        JOIN vendors v ON v.id = p.vendor_id
        JOIN categories c ON c.id = p.category_id
        WHERE c.slug = 'sonstiges' AND p.is_active = TRUE AND v.name = 'Aliva Apotheke DE'
        ORDER BY random()
        LIMIT 1000
    ''')
    print('--- Aliva Sonstiges title sample (1000 random) ---')
    for pid, title in cur.fetchall():
        print(f'{pid}|{title[:130]}')
"
    ;;
  sonstiges-sample)
    # One-off — start of the Sonstiges (catch-all/misc) categorization
    # task: vendor breakdown (where to focus keyword-rule effort, same
    # methodology as every previous category split this project) plus a
    # real title sample spread across vendors to spot clusters. Remove
    # once the categorization work is done.
    exec ./scripts/.venv/bin/python3 -c "
import os, psycopg2
conn = psycopg2.connect(os.environ['DATABASE_URL'])
with conn.cursor() as cur:
    cur.execute('''
        SELECT v.name, COUNT(*) AS cnt
        FROM products p
        JOIN vendors v ON v.id = p.vendor_id
        JOIN categories c ON c.id = p.category_id
        WHERE c.slug = 'sonstiges' AND p.is_active = TRUE
        GROUP BY v.name
        ORDER BY cnt DESC
        LIMIT 30
    ''')
    print('--- vendor breakdown ---')
    for name, cnt in cur.fetchall():
        print(f'{name}: {cnt}')
    cur.execute('''
        SELECT p.id, v.name, p.title
        FROM products p
        JOIN vendors v ON v.id = p.vendor_id
        JOIN categories c ON c.id = p.category_id
        WHERE c.slug = 'sonstiges' AND p.is_active = TRUE
        ORDER BY random()
        LIMIT 400
    ''')
    print('--- title sample (400 random) ---')
    for pid, vname, title in cur.fetchall():
        print(f'{pid}|{vname}|{title[:120]}')
"
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
