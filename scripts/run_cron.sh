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
  anthbot-finalize)
    # One-off — final step of Anthbot DE onboarding. Full 161-product
    # listing was manually reviewed: 98 are 'Shipping Protection -
    # S001'..'S098' (a shipping-insurance price ladder, not real
    # products), 1 is 'Differenzgebühr' (a billing-adjustment line
    # item), 3 are 'ANTHBOT Geschenkkarte' (gift cards, excluded same
    # as Happy Lamps) — 102 non-product listings, soft-deleted via
    # is_active=FALSE (not hard-deleted, matches project convention).
    # The remaining 59 genuine robot-mower products get a new
    # 'Mähroboter' category under Outdoor (id 8), sibling to the
    # existing Gartengeräte — same reasoning as every previous new-
    # category decision (Grill & Outdoor-Küche, Balkonkraftwerke &
    # Solar): a distinctive, high-interest product type deserves its
    # own category rather than a generic bucket. Single transaction.
    # Remove this case once confirmed.
    exec ./scripts/.venv/bin/python3 -c "
import os, psycopg2
conn = psycopg2.connect(os.environ['DATABASE_URL'])
cur = conn.cursor()
try:
    cur.execute('''
        INSERT INTO categories (parent_id, slug, name, is_active)
        VALUES (8, 'maehroboter', 'Mähroboter', TRUE)
        ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, is_active = TRUE
        RETURNING id
    ''')
    cat_id = cur.fetchone()[0]
    print(f'Category Mähroboter ready: id={cat_id}')

    cur.execute('''
        UPDATE products SET is_active = FALSE
        WHERE vendor_id = (SELECT id FROM vendors WHERE slug = 'anthbot-de')
        AND (title LIKE 'Shipping Protection%' OR title = 'Differenzgebühr' OR title LIKE 'ANTHBOT Geschenkkarte%')
    ''')
    print(f'Deactivated {cur.rowcount} non-product listings (Shipping Protection / Differenzgebühr / Geschenkkarte)')

    cur.execute('''
        UPDATE products SET category_id = %s
        WHERE vendor_id = (SELECT id FROM vendors WHERE slug = 'anthbot-de')
        AND is_active = TRUE
    ''', (cat_id,))
    print(f'Categorized {cur.rowcount} genuine products into Mähroboter (id={cat_id})')

    conn.commit()
    print('COMMITTED')
except Exception as e:
    conn.rollback()
    print(f'ROLLED BACK -- {e}')
    raise

cur.execute('''
    SELECT p.id, p.title, p.price FROM products p
    JOIN vendors v ON v.id = p.vendor_id
    WHERE v.slug = 'anthbot-de' AND p.is_active = TRUE
    ORDER BY p.title
''')
print('--- final active Mähroboter listing ---')
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
  site-health)
    # Read-only diagnostic — user reported all footer links (Impressum
    # etc) and category pages 500ing while the ISR-cached homepage
    # still works. That split points at a possibly-corrupted .next
    # build directory from one of several recent deploys that hit the
    # 30-min timeout and got cancelled mid-build. Checks service
    # status, recent error logs, build directory state, and hits the
    # Node process directly on localhost (bypassing Caddy/CDN) to
    # narrow down where the failure actually is. Does NOT touch the
    # running service. Remove once diagnosed.
    echo "--- systemctl status ---"
    systemctl status preisgucken-de.service --no-pager -l | head -20
    echo
    echo "--- last 40 log lines ---"
    sudo journalctl -u preisgucken-de.service -n 40 --no-pager
    echo
    echo "--- .next build directory ---"
    ls -la .next/ 2>&1 | head -10
    echo "BUILD_ID: $(cat .next/BUILD_ID 2>&1)"
    echo "server dir mtime range:"
    find .next/server -maxdepth 1 -newer .next/BUILD_ID 2>&1 | head -5
    echo
    echo "--- direct localhost curl (bypass Caddy) ---"
    curl -s -o /dev/null -w 'homepage: %{http_code}\n' http://localhost:3000/
    curl -s -o /dev/null -w 'impressum: %{http_code}\n' http://localhost:3000/impressum
    curl -s -w '\nkategorie body:\n%{http_code}\n' http://localhost:3000/kategorie/elektronik | tail -30
    ;;
  rebuild-orphan-check)
    # Read-only — before touching anything, checking whether any
    # deploy.sh/npm ci/next build process is still running orphaned
    # from an earlier GitHub-Actions-cancelled deploy (cancelling the
    # workflow kills the local runner but not necessarily the remote
    # SSH-invoked process). Shown against the live service's own PIDs
    # (from systemctl) so orphans are clearly distinguishable from the
    # actual running app. Does NOT kill anything. Remove once diagnosed.
    echo "--- live service PIDs (do not touch these) ---"
    systemctl show preisgucken-de.service -p MainPID -p ControlGroup
    echo
    echo "--- all deploy.sh / npm / next build processes on the box ---"
    ps -eo pid,ppid,etime,cmd | grep -E 'deploy\.sh|npm ci|npm run build|next build|next-server' | grep -v grep
    ;;
  rebuild-kill-orphans)
    # Confirmed via rebuild-orphan-check: SIX orphaned deploy.sh processes
    # (up to 19h40m old), each running its own 'npm run build'/'next
    # build' against the SAME shared /var/www/preisgucken-de directory —
    # cancelling a GitHub Actions workflow kills the local runner but not
    # the remote SSH-invoked deploy.sh, so every timed-out deploy this
    # session left one behind, all racing each other and corrupting
    # .next. Killing by exact command pattern ('next build'/'npm run
    # build'/this script's own path) — the live service runs 'npm
    # start'/'next start'/'next-server', which never matches any of
    # these patterns, so it is not touched. Verified against the live
    # MainPID separately in rebuild-orphan-check before running this.
    echo "--- before ---"
    ps -eo pid,ppid,etime,cmd | grep -E 'deploy\.sh|npm run build|next build' | grep -v grep || echo "(none found)"
    pkill -9 -f 'next build' || true
    pkill -9 -f 'npm run build' || true
    pkill -9 -f '/var/www/preisgucken-de/scripts/deploy.sh' || true
    sleep 2
    echo "--- after ---"
    ps -eo pid,ppid,etime,cmd | grep -E 'deploy\.sh|npm run build|next build' | grep -v grep || echo "(none found — all orphans cleared)"
    echo "--- live service still healthy? ---"
    systemctl is-active preisgucken-de.service
    systemctl show preisgucken-de.service -p MainPID
    ;;
  rebuild-live-start)
    # Orphans cleared (rebuild-kill-orphans) -- now the only builder,
    # so a normal in-place 'npm run build' should behave like it always
    # did before the concurrent-build pileup (past deploys succeeded in
    # ~12-13 min; the 30-min timeouts only started once orphans were
    # thrashing the box for CPU/memory). Building IN the live directory
    # is safe here: the running process keeps serving from its already-
    # loaded files throughout the build (same as every normal deploy) --
    # only the final restart is a brief interruption. Launched fully
    # detached (setsid + disown + nohup, output to a log file) so this
    # SSH command returns immediately and is not itself at risk of
    # becoming another orphan if the connection drops. Does NOT restart
    # the service -- that's a separate, explicit step once verified.
    # Env vars (DATABASE_URL etc) are already sourced+exported into this
    # shell by the top of this script, before the case statement --
    # setsid/nohup inherit them automatically, no need to re-read the env
    # file here (which would fail anyway without sudo).
    rm -f /tmp/rebuild_live.log
    setsid nohup npm run build > /tmp/rebuild_live.log 2>&1 < /dev/null &
    disown
    sleep 2
    echo "Build launched detached. PID group:"
    pgrep -f 'next build' || echo "(not yet visible -- check again shortly)"
    ;;
  rebuild-live-status)
    # Read-only -- check on the detached build from rebuild-live-start.
    echo "--- is a build still running? ---"
    pgrep -af 'next build' || echo "(no build process running)"
    echo "--- last 30 log lines ---"
    tail -30 /tmp/rebuild_live.log 2>&1
    echo "--- BUILD_ID present? ---"
    cat .next/BUILD_ID 2>&1 || echo "(not yet -- build still in progress)"
    ;;
  rebuild-live-finish)
    # Only run once rebuild-live-status confirms BUILD_ID exists and no
    # build process is still running. Restarts the service against the
    # freshly-built .next and verifies previously-broken routes recover.
    # This restart is the only moment of live interruption in the whole
    # fix -- a few seconds, not the multi-minute outage a stop-then-
    # rebuild-then-start approach would have caused.
    sudo systemctl restart preisgucken-de.service
    sleep 5
    echo "--- service status ---"
    systemctl is-active preisgucken-de.service
    echo "--- direct localhost verification ---"
    curl -s -o /dev/null -w 'homepage: %{http_code}\n' http://localhost:3000/
    curl -s -o /dev/null -w 'impressum: %{http_code}\n' http://localhost:3000/impressum
    curl -s -o /dev/null -w 'datenschutz: %{http_code}\n' http://localhost:3000/datenschutz
    curl -s -o /dev/null -w 'kategorie: %{http_code}\n' http://localhost:3000/kategorie/elektronik
    ;;
  aliva-verify)
    # Read-only sanity check — category-counts (which filters
    # is_active=TRUE AND in_stock=TRUE) showed drastically lower Aliva
    # pharmacy counts than the 18,105 categorized in
    # aliva-categorize-apply. Checking whether the category_id
    # assignments are actually intact (this is just an in_stock filter
    # artifact) or genuinely lost. Remove once confirmed.
    exec ./scripts/.venv/bin/python3 -c "
import os, psycopg2
conn = psycopg2.connect(os.environ['DATABASE_URL'])
with conn.cursor() as cur:
    cur.execute('''
        SELECT
            COUNT(*) FILTER (WHERE c.slug != 'sonstiges') AS categorized,
            COUNT(*) FILTER (WHERE c.slug = 'sonstiges') AS still_sonstiges,
            COUNT(*) FILTER (WHERE p.is_active) AS active,
            COUNT(*) FILTER (WHERE p.in_stock) AS in_stock,
            COUNT(*) FILTER (WHERE p.is_active AND p.in_stock) AS active_and_in_stock,
            COUNT(*) AS total
        FROM products p
        JOIN vendors v ON v.id = p.vendor_id
        JOIN categories c ON c.id = p.category_id
        WHERE v.name = 'Aliva Apotheke DE'
    ''')
    row = cur.fetchone()
    print(f'categorized={row[0]} still_sonstiges={row[1]} active={row[2]} in_stock={row[3]} active_and_in_stock={row[4]} total={row[5]}')
"
    ;;
  onboard-toputure)
    # One-off vendor onboarding — Toputure US (AWIN merchant 125464), per
    # explicit user request. Same idempotent-insert + scoped-import
    # pattern as every previous vendor (Anthbot DE, Autofull EU, etc.) —
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
    ''', ('Toputure US', 'toputure-us',
          'https://ui.awin.com/productdata-darwin-download/publisher/2988023/441dd8c531d5bac0a84d1df5f5ff071f/1/feed/F3285.csv.gz',
          '125464'))
print('vendor row upserted: Toputure US (toputure-us, AWIN 125464)')
"
    export VENDOR_FILTER="Toputure US"
    exec ./scripts/.venv/bin/python3 scripts/import_awin_feeds.py
    ;;
  toputure-check)
    # One-off — verify Toputure US's imported products and see what
    # category they landed in. Remove once confirmed.
    exec ./scripts/.venv/bin/python3 -c "
import os, psycopg2
conn = psycopg2.connect(os.environ['DATABASE_URL'])
with conn.cursor() as cur:
    cur.execute('''
        SELECT COUNT(*) FROM products p
        JOIN vendors v ON v.id = p.vendor_id
        WHERE v.slug = 'toputure-us'
    ''')
    print(f'Total Toputure US products: {cur.fetchone()[0]}')
    cur.execute('''
        SELECT c.slug, c.name, COUNT(*) AS cnt
        FROM products p
        JOIN vendors v ON v.id = p.vendor_id
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE v.slug = 'toputure-us'
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
        WHERE v.slug = 'toputure-us'
        ORDER BY p.title
    ''')
    print('--- ALL products (id|price|title) ---')
    for pid, title, price in cur.fetchall():
        print(f'{pid}|{price}|{title[:150]}')
"
    ;;
  deactivate-toputure)
    # Per explicit user decision — Toputure US's feed is entirely USD-
    # priced (US-market vendor) and this site is EUR-only. The import
    # correctly skipped all 43 rows rather than mislabel dollar prices
    # as euros, so there are zero real products to remove. Deactivating
    # the vendor so the nightly AWIN sync stops re-downloading this feed
    # every night for no benefit. Not deleted, matches project soft-
    # delete convention. Remove this case once confirmed.
    ./scripts/.venv/bin/python3 -c "
import os, psycopg2
conn = psycopg2.connect(os.environ['DATABASE_URL'])
conn.autocommit = True
with conn.cursor() as cur:
    cur.execute('''UPDATE vendors SET is_active = FALSE WHERE slug = 'toputure-us' RETURNING name''')
    row = cur.fetchone()
    label = row[0] if row else 'not found'
    print(f'Deactivated: {label}')
"
    ;;
  stale-chunk-check)
    # Read-only -- browser testing reproduced a real bug: /impressum
    # (and likely every page) serves HTML referencing a JS chunk hash
    # from an OLDER build (page-b3894efdae6db2e7.js), which 400s because
    # only the CURRENT build's chunks exist in .next/static now. curl
    # tests all showed 200 because they only check the HTML document
    # status, never execute its JS -- a real browser fails client-side
    # hydration (ChunkLoadError -> React #423) and goes blank. Checking
    # whether this is Next.js's own ISR page cache (.next/cache) still
    # holding a stale render from a previous build, or a Caddy-level
    # cache. Does not touch anything. Remove once diagnosed.
    echo "--- current live chunk hash for /impressum ---"
    ls -la .next/static/chunks/app/impressum/ 2>&1
    echo "--- BUILD_ID ---"
    cat .next/BUILD_ID
    echo "--- what HTML does the live Node process itself return (bypass Caddy) ---"
    curl -s http://localhost:3000/impressum | grep -oE 'app/impressum/page-[a-z0-9]+\.js' | head -3
    echo "--- what HTML does Caddy return externally ---"
    curl -s https://www.preisgucken.de/impressum | grep -oE 'app/impressum/page-[a-z0-9]+\.js' | head -3
    echo "--- Caddy config (cache-relevant directives only) ---"
    sudo grep -n -i "cache\|preisgucken.de" /etc/caddy/Caddyfile 2>&1 | head -40
    ;;
  ihoverboard-check)
    # Read-only -- user asked to verify iHoverboard DE's products are
    # actually live (memory says AWIN vendor 110026, 39 products, onboarded
    # 2026-09-08 -- confirming against real data rather than trusting a
    # possibly-stale record). Remove once confirmed.
    exec ./scripts/.venv/bin/python3 -c "
import os, psycopg2
conn = psycopg2.connect(os.environ['DATABASE_URL'])
with conn.cursor() as cur:
    cur.execute('''
        SELECT id, name, slug, is_active, awin_merchant_id
        FROM vendors WHERE name ILIKE '%ihoverboard%' OR slug ILIKE '%ihoverboard%'
    ''')
    vendors = cur.fetchall()
    if not vendors:
        print('No vendor matching iHoverboard found.')
    for vid, name, slug, is_active, mid in vendors:
        print(f'vendor: id={vid} name={name} slug={slug} is_active={is_active} awin_merchant_id={mid}')
        cur.execute('''
            SELECT COUNT(*) FILTER (WHERE is_active), COUNT(*)
            FROM products WHERE vendor_id = %s
        ''', (vid,))
        active_cnt, total_cnt = cur.fetchone()
        print(f'  products: active={active_cnt} total={total_cnt}')
        cur.execute('''
            SELECT c.slug, c.name, COUNT(*) FROM products p
            LEFT JOIN categories c ON c.id = p.category_id
            WHERE p.vendor_id = %s AND p.is_active = TRUE
            GROUP BY c.slug, c.name ORDER BY COUNT(*) DESC
        ''', (vid,))
        for cslug, cname, cnt in cur.fetchall():
            print(f'  category: {cslug} ({cname}): {cnt}')
        cur.execute('''
            SELECT id, title, price FROM products
            WHERE vendor_id = %s AND is_active = TRUE
            ORDER BY random() LIMIT 8
        ''', (vid,))
        print('  sample:')
        for pid, title, price in cur.fetchall():
            print(f'    {pid}|{price}|{title[:100]}')
"
    ;;
  ihoverboard-plan)
    # Read-only -- iHoverboard DE's 39 products are miscategorized (most
    # in 'leuchten'/Lighting, likely a 'LED' substring false-match in the
    # generic guess_category() logic used by the nightly sync). Pulling
    # the full title list plus the E-Scooter category subtree to plan a
    # correct fix -- this is a real mix of hoverboards, e-scooters and
    # e-bikes, not purely hoverboards. Remove once the fix is applied.
    exec ./scripts/.venv/bin/python3 -c "
import os, psycopg2
conn = psycopg2.connect(os.environ['DATABASE_URL'])
with conn.cursor() as cur:
    cur.execute('''
        SELECT id, parent_id, slug, name FROM categories
        WHERE slug ILIKE '%scooter%' OR slug ILIKE '%hoverboard%' OR slug ILIKE '%e-bike%' OR slug ILIKE '%ebike%'
           OR name ILIKE '%scooter%' OR name ILIKE '%hoverboard%' OR name ILIKE '%e-bike%'
        ORDER BY parent_id NULLS FIRST, id
    ''')
    print('--- E-Scooter/Hoverboard/E-Bike category tree ---')
    for row in cur.fetchall():
        print('|'.join(str(x) for x in row))
    cur.execute('''
        SELECT p.id, p.title, p.price, c.slug
        FROM products p
        JOIN vendors v ON v.id = p.vendor_id
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE v.slug = 'ihoverboard-de' AND p.is_active = TRUE
        ORDER BY p.title
    ''')
    print('--- ALL 39 products (id|price|current_category|title) ---')
    for pid, title, price, cslug in cur.fetchall():
        print(f'{pid}|{price}|{cslug}|{title[:130]}')
"
    ;;
  ihoverboard-apply)
    # One-off REAL WRITE, single transaction. All 39 iHoverboard DE
    # titles were manually reviewed via ihoverboard-plan -- confirmed a
    # clean 3-way substring split with zero ambiguity/overlap:
    # 'e-scooter' -> e-scooter (id 180), 'hoverboard' -> hoverboards
    # (id 243, incl. the K3 seat accessory), 'e-bike' -> e-bikes (id
    # 206). Fixes the nightly-sync-induced miscategorization (most had
    # landed in 'leuchten'/Lighting, a false match on 'LED' in titles
    # like 'iHoverboard H8 LED...'). Remove once confirmed.
    exec ./scripts/.venv/bin/python3 -c "
import os, psycopg2
conn = psycopg2.connect(os.environ['DATABASE_URL'])
cur = conn.cursor()
cur.execute('''
    SELECT p.id, p.title FROM products p
    JOIN vendors v ON v.id = p.vendor_id
    WHERE v.slug = 'ihoverboard-de' AND p.is_active = TRUE
''')
rows = cur.fetchall()

RULES = [
    (180, 'e-scooter', ['e-scooter']),
    (243, 'hoverboards', ['hoverboard']),
    (206, 'e-bikes', ['e-bike']),
]

moves = []
unmatched = []
for pid, title in rows:
    t = title.lower()
    hit = None
    for cid, slug, kws in RULES:
        if any(kw in t for kw in kws):
            hit = (cid, slug)
            break
    if hit:
        moves.append((pid, hit[0], hit[1], title))
    else:
        unmatched.append(title)

print(f'{len(moves)} of {len(rows)} matched, {len(unmatched)} unmatched')
for title in unmatched:
    print(f'  UNMATCHED: {title}')

try:
    for pid, cid, slug, title in moves:
        cur.execute('UPDATE products SET category_id = %s WHERE id = %s', (cid, pid))
    conn.commit()
    print('COMMITTED')
except Exception as e:
    conn.rollback()
    print(f'ROLLED BACK -- {e}')
    raise

counts = {}
for pid, cid, slug, title in moves:
    counts[slug] = counts.get(slug, 0) + 1
print('--- final counts ---')
for slug, n in counts.items():
    print(f'{slug}: {n}')
"
    ;;
  toputure-category-check)
    # Read-only -- user confirmed toputure.com's EU storefront charges
    # the identical face-value number in EUR as the AWIN feed lists in
    # USD (verified: TP5 389.00 USD == e389,00 on site, TP3 279.00 USD
    # == e279,00). Reactivating this vendor with a currency-check
    # bypass, but first checking what category fits treadmills/walking
    # pads/exercise bikes -- likely an existing Sport/Fitness category.
    # Remove once diagnosed.
    exec ./scripts/.venv/bin/python3 -c "
import os, psycopg2
conn = psycopg2.connect(os.environ['DATABASE_URL'])
with conn.cursor() as cur:
    cur.execute('''
        SELECT id, parent_id, slug, name FROM categories
        WHERE slug ILIKE '%fitness%' OR slug ILIKE '%sport%' OR name ILIKE '%fitness%' OR name ILIKE '%sport%'
           OR parent_id = 207
        ORDER BY parent_id NULLS FIRST, id
    ''')
    for row in cur.fetchall():
        print('|'.join(str(x) for x in row))
    print('--- existing product count under 207 ---')
    cur.execute('''
        SELECT c.slug, COUNT(*) FROM products p
        JOIN categories c ON c.id = p.category_id
        WHERE (c.id = 207 OR c.parent_id = 207) AND p.is_active = TRUE
        GROUP BY c.slug
    ''')
    for row in cur.fetchall():
        print('|'.join(str(x) for x in row))
"
    ;;
  create-heimtrainer-category)
    # One-off -- create the Heimtrainer (exercise bikes) subcategory
    # under Fitness & Krafttraining (207), sibling to the existing
    # Laufbänder (208). Needed for Toputure's TEB-series exercise
    # bikes, which have no existing home. Idempotent (ON CONFLICT).
    # Remove once confirmed.
    ./scripts/.venv/bin/python3 -c "
import os, psycopg2
conn = psycopg2.connect(os.environ['DATABASE_URL'])
conn.autocommit = True
with conn.cursor() as cur:
    cur.execute('''
        INSERT INTO categories (parent_id, slug, name, is_active)
        VALUES (207, 'heimtrainer', 'Heimtrainer', TRUE)
        ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, is_active = TRUE
        RETURNING id
    ''')
    print(f'Heimtrainer category id: {cur.fetchone()[0]}')
"
    ;;
  reactivate-toputure)
    # Reactivate Toputure US (was deactivated for the USD-price issue,
    # now fixed via a skip_currency_check vendor override + a proper
    # category_fn in import_awin_feeds.py) and run a scoped import.
    # Remove this case once confirmed onboarded.
    ./scripts/.venv/bin/python3 -c "
import os, psycopg2
conn = psycopg2.connect(os.environ['DATABASE_URL'])
conn.autocommit = True
with conn.cursor() as cur:
    cur.execute('''UPDATE vendors SET is_active = TRUE WHERE slug = 'toputure-us' RETURNING name''')
    row = cur.fetchone()
    label = row[0] if row else 'not found'
    print(f'Reactivated: {label}')
"
    export VENDOR_FILTER="Toputure US"
    exec ./scripts/.venv/bin/python3 scripts/import_awin_feeds.py
    ;;
  toputure-verify)
    # Read-only -- confirm the import landed correctly. Remove once
    # confirmed.
    exec ./scripts/.venv/bin/python3 -c "
import os, psycopg2
conn = psycopg2.connect(os.environ['DATABASE_URL'])
with conn.cursor() as cur:
    cur.execute('''
        SELECT p.id, p.price, c.slug, p.title
        FROM products p
        JOIN vendors v ON v.id = p.vendor_id
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE v.slug = 'toputure-us' AND p.is_active = TRUE
        ORDER BY p.title
    ''')
    for pid, price, cslug, title in cur.fetchall():
        print(f'{pid}|{price}|{cslug}|{title[:120]}')
"
    ;;
  coupons-cron-check)
    # Read-only diagnostic -- the hourly deactivate-expired-coupons
    # GitHub Actions cron just failed with HTTP 500. Testing the exact
    # same UPDATE query directly against the DB (bypassing the HTTP
    # layer/CRON_SECRET entirely) to isolate whether this is a genuine
    # DB/schema issue or a deploy/app-layer issue. Also checks the
    # coupons table's actual schema and row state. Read-only (no writes
    # via this job -- it explicitly does NOT commit the UPDATE, just
    # runs it inside a rolled-back transaction to see if it would
    # succeed). Remove once diagnosed.
    exec ./scripts/.venv/bin/python3 -c "
import os, psycopg2
conn = psycopg2.connect(os.environ['DATABASE_URL'])
with conn.cursor() as cur:
    print('--- coupons table columns ---')
    cur.execute('''
        SELECT column_name, data_type FROM information_schema.columns
        WHERE table_name = 'coupons' ORDER BY ordinal_position
    ''')
    for row in cur.fetchall():
        print('|'.join(str(x) for x in row))
    print('--- row counts ---')
    cur.execute('SELECT COUNT(*), COUNT(*) FILTER (WHERE is_active), COUNT(*) FILTER (WHERE valid_until < NOW()) FROM coupons')
    total, active, expired = cur.fetchone()
    print(f'total={total} active={active} expired_by_date={expired}')
    print('--- test the exact cron UPDATE (rolled back, not committed) ---')
    try:
        cur.execute('''
            UPDATE coupons
            SET is_active = FALSE
            WHERE is_active = TRUE
              AND valid_until IS NOT NULL
              AND valid_until < NOW()
            RETURNING id, code
        ''')
        print(f'Would deactivate {cur.rowcount} rows -- query itself is fine')
        conn.rollback()
    except Exception as e:
        print(f'QUERY FAILS: {e}')
        conn.rollback()
"
    ;;
  onboard-outin)
    # One-off vendor onboarding — Outin Germany (AWIN merchant 127821),
    # per explicit user request. Same idempotent-insert + scoped-import
    # pattern as every previous vendor. Pure database operation, no
    # build, no service restart, does not touch the running app.
    # Remove this case once the vendor is confirmed onboarded.
    ./scripts/.venv/bin/python3 -c "
import os, psycopg2
conn = psycopg2.connect(os.environ['DATABASE_URL'])
conn.autocommit = True
with conn.cursor() as cur:
    cur.execute('''
        INSERT INTO vendors (name, slug, feed_url, awin_merchant_id, is_active)
        VALUES (%s, %s, %s, %s, TRUE)
        ON CONFLICT (slug) DO UPDATE SET feed_url = EXCLUDED.feed_url, awin_merchant_id = EXCLUDED.awin_merchant_id
    ''', ('Outin Germany', 'outin-germany',
          'https://ui.awin.com/productdata-darwin-download/publisher/2988023/441dd8c531d5bac0a84d1df5f5ff071f/1/feed/F4050.csv.gz',
          '127821'))
print('vendor row upserted: Outin Germany (outin-germany, AWIN 127821)')
"
    export VENDOR_FILTER="Outin Germany"
    exec ./scripts/.venv/bin/python3 scripts/import_awin_feeds.py
    ;;
  outin-check)
    # One-off — verify Outin Germany's imported products and see what
    # category they landed in. Remove once confirmed.
    exec ./scripts/.venv/bin/python3 -c "
import os, psycopg2
conn = psycopg2.connect(os.environ['DATABASE_URL'])
with conn.cursor() as cur:
    cur.execute('''
        SELECT COUNT(*) FROM products p
        JOIN vendors v ON v.id = p.vendor_id
        WHERE v.slug = 'outin-germany'
    ''')
    print(f'Total Outin Germany products: {cur.fetchone()[0]}')
    cur.execute('''
        SELECT c.slug, c.name, COUNT(*) AS cnt
        FROM products p
        JOIN vendors v ON v.id = p.vendor_id
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE v.slug = 'outin-germany'
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
        WHERE v.slug = 'outin-germany'
        ORDER BY p.title
    ''')
    print('--- ALL products (id|price|title) ---')
    for pid, title, price in cur.fetchall():
        print(f'{pid}|{price}|{title[:150]}')
"
    ;;
  outin-category-check)
    # Read-only -- OutIn Germany's 54 products (all genuine, 0 skipped)
    # are portable espresso machines/coffee gear, mostly landed in
    # generic Sonstiges. Checking for an existing Kaffee/Küche category
    # before deciding whether to route there or create a new one.
    # Remove once diagnosed.
    exec ./scripts/.venv/bin/python3 -c "
import os, psycopg2
conn = psycopg2.connect(os.environ['DATABASE_URL'])
with conn.cursor() as cur:
    cur.execute('''
        SELECT id, parent_id, slug, name FROM categories
        WHERE slug ILIKE '%kaffee%' OR slug ILIKE '%kueche%' OR name ILIKE '%kaffee%' OR name ILIKE '%küche%'
        ORDER BY parent_id NULLS FIRST, id
    ''')
    for row in cur.fetchall():
        print('|'.join(str(x) for x in row))
"
    ;;
  outin-apply)
    # One-off REAL WRITE -- routes all 54 OutIn Germany products (a
    # small, single-focus vendor: portable espresso machines + their
    # accessories, all genuine, 0 junk) into the existing Kaffeemaschinen
    # category (42), same as not fragmenting other small single-brand
    # vendors like EarFun. Remove once confirmed.
    exec ./scripts/.venv/bin/python3 -c "
import os, psycopg2
conn = psycopg2.connect(os.environ['DATABASE_URL'])
cur = conn.cursor()
cur.execute('''
    UPDATE products SET category_id = 42
    WHERE vendor_id = (SELECT id FROM vendors WHERE slug = 'outin-germany')
    AND is_active = TRUE
''')
print(f'Categorized {cur.rowcount} products into Kaffeemaschinen (42)')
conn.commit()
print('COMMITTED')
"
    ;;
  anthbot-blog-data)
    # Read-only -- pulling real current ANTHBOT pricing/inventory for a
    # new preisgucken.com blog post (Mähroboter buying guide). Checking
    # whether the earlier anthbot-finalize write (category creation +
    # junk exclusion) actually landed, since that push got caught in
    # the deploy-outage churn and may never have run. Remove once the
    # blog post data is pulled.
    exec ./scripts/.venv/bin/python3 -c "
import os, psycopg2
conn = psycopg2.connect(os.environ['DATABASE_URL'])
with conn.cursor() as cur:
    cur.execute('''
        SELECT id, parent_id, slug, name FROM categories
        WHERE slug ILIKE '%maehroboter%' OR name ILIKE '%Mähroboter%'
    ''')
    print('--- Mähroboter category ---')
    for row in cur.fetchall():
        print('|'.join(str(x) for x in row))
    cur.execute('''
        SELECT c.slug, COUNT(*) FROM products p
        JOIN vendors v ON v.id = p.vendor_id
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE v.slug = 'anthbot-de' AND p.is_active = TRUE
        GROUP BY c.slug
    ''')
    print('--- current category breakdown ---')
    for row in cur.fetchall():
        print('|'.join(str(x) for x in row))
    cur.execute('''
        SELECT p.id, p.title, p.price
        FROM products p
        JOIN vendors v ON v.id = p.vendor_id
        WHERE v.slug = 'anthbot-de' AND p.is_active = TRUE
        ORDER BY p.price
    ''')
    print('--- all active products ---')
    for pid, title, price in cur.fetchall():
        print(f'{pid}|{price}|{title[:130]}')
"
    ;;
  all-vendors-list)
    # Read-only -- full vendor list with product counts and top-level
    # category, to cross-reference against existing preisgucken.com
    # blog coverage and find genuine content gaps for new vendors
    # (same process as ANTHBOT/OutIn/Toputure). Remove once done.
    exec ./scripts/.venv/bin/python3 -c "
import os, psycopg2
conn = psycopg2.connect(os.environ['DATABASE_URL'])
with conn.cursor() as cur:
    cur.execute('''
        SELECT v.id, v.name, v.slug, v.is_active, COUNT(p.id) FILTER (WHERE p.is_active) AS active_products
        FROM vendors v
        LEFT JOIN products p ON p.vendor_id = v.id
        GROUP BY v.id, v.name, v.slug, v.is_active
        ORDER BY v.id DESC
    ''')
    for row in cur.fetchall():
        print('|'.join(str(x) for x in row))
"
    ;;
  vendor-blog-gap-check)
    # Read-only -- checking Dowinx (gaming chairs?) and hoverboard/
    # e-scooter/e-bike vendors (iHoverboard, isinwheel) for real product
    # mix and price range, to plan two more blog-gap posts: Hoverboard
    # kaufen (confirmed zero coverage -- existing e-scooter post is
    # ABE/eKFV street-legal registration only, nothing about
    # hoverboards) and Gaming-Stuhl kaufen if Dowinx confirms. Remove
    # once the data is pulled.
    exec ./scripts/.venv/bin/python3 -c "
import os, psycopg2
conn = psycopg2.connect(os.environ['DATABASE_URL'])
with conn.cursor() as cur:
    cur.execute('''
        SELECT c.slug, COUNT(*), MIN(p.price), MAX(p.price)
        FROM products p
        JOIN vendors v ON v.id = p.vendor_id
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE v.slug = 'dowinx' AND p.is_active = TRUE
        GROUP BY c.slug ORDER BY COUNT(*) DESC
    ''')
    print('--- Dowinx category breakdown ---')
    for row in cur.fetchall():
        print('|'.join(str(x) for x in row))
    cur.execute('''
        SELECT p.title, p.price FROM products p
        JOIN vendors v ON v.id = p.vendor_id
        WHERE v.slug = 'dowinx' AND p.is_active = TRUE
        ORDER BY random() LIMIT 8
    ''')
    print('--- Dowinx sample ---')
    for title, price in cur.fetchall():
        print(f'{price}|{title[:100]}')
    cur.execute('''
        SELECT v.slug, c.slug, COUNT(*), MIN(p.price), MAX(p.price)
        FROM products p
        JOIN vendors v ON v.id = p.vendor_id
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE v.slug IN ('ihoverboard-de', 'isinwheel')
        AND p.is_active = TRUE AND p.title ILIKE '%hoverboard%'
        GROUP BY v.slug, c.slug ORDER BY v.slug
    ''')
    print('--- hoverboard-titled products across both vendors ---')
    for row in cur.fetchall():
        print('|'.join(str(x) for x in row))
"
    ;;
  ihoverboard-resync)
    # Re-run the scoped import now that iHoverboard DE has a proper
    # category_fn (guess_ihoverboard_category) in import_awin_feeds.py
    # instead of relying on the generic guesser. This is the durable
    # fix -- every future nightly awin-fast sync will re-apply it
    # automatically instead of undoing it. Remove once confirmed.
    export VENDOR_FILTER="iHoverboard DE"
    exec ./scripts/.venv/bin/python3 scripts/import_awin_feeds.py
    ;;
  ihoverboard-verify)
    # Read-only -- confirm the resync landed correctly. Remove once
    # confirmed.
    exec ./scripts/.venv/bin/python3 -c "
import os, psycopg2
conn = psycopg2.connect(os.environ['DATABASE_URL'])
with conn.cursor() as cur:
    cur.execute('''
        SELECT c.slug, COUNT(*), MIN(p.price), MAX(p.price)
        FROM products p
        JOIN vendors v ON v.id = p.vendor_id
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE v.slug = 'ihoverboard-de' AND p.is_active = TRUE
        GROUP BY c.slug ORDER BY COUNT(*) DESC
    ''')
    for row in cur.fetchall():
        print('|'.join(str(x) for x in row))
"
    ;;
  vendor-drift-check)
    # Read-only -- systematic check for the same class of bug found in
    # Aliva and iHoverboard: vendors whose categorization was fixed via
    # a one-off manual UPDATE (not a durable VENDOR_OVERRIDES
    # category_fn) can get silently reverted by the next nightly
    # awin-fast sync re-running the generic guess_category() fallback.
    # Checking Aliva (highest risk -- 35,962 products, no override at
    # all) and Anthbot (also no override) right now, plus a general
    # scan for any vendor with an unusually high 'sonstiges' or
    # 'leuchten' share relative to its likely product type. Remove
    # once diagnosed.
    exec ./scripts/.venv/bin/python3 -c "
import os, psycopg2
conn = psycopg2.connect(os.environ['DATABASE_URL'])
with conn.cursor() as cur:
    cur.execute('''
        SELECT c.slug, COUNT(*) FROM products p
        JOIN vendors v ON v.id = p.vendor_id
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE v.slug = 'aliva-apotheke-de' AND p.is_active = TRUE
        GROUP BY c.slug ORDER BY COUNT(*) DESC LIMIT 25
    ''')
    print('--- Aliva Apotheke DE category breakdown ---')
    for row in cur.fetchall():
        print('|'.join(str(x) for x in row))
    cur.execute('''
        SELECT c.slug, COUNT(*) FROM products p
        JOIN vendors v ON v.id = p.vendor_id
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE v.slug = 'anthbot-de' AND p.is_active = TRUE
        GROUP BY c.slug ORDER BY COUNT(*) DESC
    ''')
    print('--- Anthbot DE category breakdown ---')
    for row in cur.fetchall():
        print('|'.join(str(x) for x in row))
    print('--- vendors with high leuchten share (possible LED trap) ---')
    cur.execute('''
        SELECT v.name, v.slug, COUNT(*) FILTER (WHERE c.slug = 'leuchten') AS leuchten_cnt,
               COUNT(*) AS total
        FROM products p
        JOIN vendors v ON v.id = p.vendor_id
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE p.is_active = TRUE
        GROUP BY v.name, v.slug
        HAVING COUNT(*) FILTER (WHERE c.slug = 'leuchten') > 0
        ORDER BY leuchten_cnt DESC
        LIMIT 15
    ''')
    for row in cur.fetchall():
        print('|'.join(str(x) for x in row))
"
    ;;
  aliva-resync)
    # Re-run the scoped import now that Aliva Apotheke DE has a durable
    # category_fn (guess_aliva_category) in import_awin_feeds.py instead
    # of relying on the generic guesser that scattered it. This is the
    # durable fix -- every future nightly awin-fast sync re-applies it
    # automatically instead of undoing it. Remove once confirmed.
    export VENDOR_FILTER="Aliva Apotheke DE"
    exec ./scripts/.venv/bin/python3 scripts/import_awin_feeds.py
    ;;
  anthbot-resync)
    # Re-run the scoped import now that Anthbot DE has a durable
    # category_fn + junk exclusion in import_awin_feeds.py. Remove once
    # confirmed.
    export VENDOR_FILTER="Anthbot DE"
    exec ./scripts/.venv/bin/python3 scripts/import_awin_feeds.py
    ;;
  aliva-anthbot-verify)
    # Read-only -- confirm both resyncs landed correctly. Remove once
    # confirmed.
    exec ./scripts/.venv/bin/python3 -c "
import os, psycopg2
conn = psycopg2.connect(os.environ['DATABASE_URL'])
with conn.cursor() as cur:
    cur.execute('''
        SELECT c.slug, COUNT(*) FROM products p
        JOIN vendors v ON v.id = p.vendor_id
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE v.slug = 'aliva-apotheke-de' AND p.is_active = TRUE
        GROUP BY c.slug ORDER BY COUNT(*) DESC LIMIT 25
    ''')
    print('--- Aliva Apotheke DE category breakdown after resync ---')
    for row in cur.fetchall():
        print('|'.join(str(x) for x in row))
    cur.execute('''
        SELECT c.slug, COUNT(*) FROM products p
        JOIN vendors v ON v.id = p.vendor_id
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE v.slug = 'anthbot-de' AND p.is_active = TRUE
        GROUP BY c.slug ORDER BY COUNT(*) DESC
    ''')
    print('--- Anthbot DE category breakdown after resync ---')
    for row in cur.fetchall():
        print('|'.join(str(x) for x in row))
    cur.execute('''
        SELECT COUNT(*) FROM products p
        JOIN vendors v ON v.id = p.vendor_id
        WHERE v.slug = 'anthbot-de' AND p.is_active = TRUE AND p.title ILIKE '%Shipping Protection%'
    ''')
    print(f'Anthbot Shipping Protection still active: {cur.fetchone()[0]} (should be 0)')
"
    ;;
  outin-resync)
    # Re-run the scoped import now that Outin Germany has a durable
    # category_fn in import_awin_feeds.py. User reported a product
    # (Nano Tragbare Espressomaschine Pearlweiß) had reverted to
    # Sonstiges -- same durability gap as every other vendor fixed via
    # a one-off manual UPDATE this session. Remove once confirmed.
    export VENDOR_FILTER="Outin Germany"
    exec ./scripts/.venv/bin/python3 scripts/import_awin_feeds.py
    ;;
  outin-verify2)
    # Read-only -- confirm the resync landed correctly. Remove once
    # confirmed.
    exec ./scripts/.venv/bin/python3 -c "
import os, psycopg2
conn = psycopg2.connect(os.environ['DATABASE_URL'])
with conn.cursor() as cur:
    cur.execute('''
        SELECT c.slug, COUNT(*) FROM products p
        JOIN vendors v ON v.id = p.vendor_id
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE v.slug = 'outin-germany' AND p.is_active = TRUE
        GROUP BY c.slug ORDER BY COUNT(*) DESC
    ''')
    for row in cur.fetchall():
        print('|'.join(str(x) for x in row))
"
    ;;
  sessel-schreibtische-ids)
    # Read-only -- need the real category ids for Sessel and Schreibtische
    # (already used correctly by Dowinx) to route Autofull EU's gaming
    # chairs/desk the same way. Remove once diagnosed.
    exec ./scripts/.venv/bin/python3 -c "
import os, psycopg2
conn = psycopg2.connect(os.environ['DATABASE_URL'])
with conn.cursor() as cur:
    cur.execute('''SELECT id, slug, name FROM categories WHERE slug IN ('sessel', 'schreibtische')''')
    for row in cur.fetchall():
        print('|'.join(str(x) for x in row))
"
    ;;
  autofull-resync)
    # Deactivates the 9 confirmed junk checkout line items (Accessory
    # Price Supplement x8, Exclusive use of the difference in price),
    # then re-runs the scoped import now that Autofull EU has a durable
    # category_fn. Exclusion alone only stops FUTURE syncs from
    # touching the junk rows -- they were never explicitly deactivated
    # in the first place, so still active right now without this.
    # Single transaction for the deactivation. Remove once confirmed.
    ./scripts/.venv/bin/python3 -c "
import os, psycopg2
conn = psycopg2.connect(os.environ['DATABASE_URL'])
conn.autocommit = True
with conn.cursor() as cur:
    cur.execute('''
        UPDATE products SET is_active = FALSE
        WHERE vendor_id = (SELECT id FROM vendors WHERE slug = 'autofull-eu')
        AND (title ILIKE '%Accessory Price Supplement%' OR title ILIKE '%Exclusive use of the difference in price%')
    ''')
    print(f'Deactivated {cur.rowcount} junk checkout line items')
"
    export VENDOR_FILTER="Autofull EU"
    exec ./scripts/.venv/bin/python3 scripts/import_awin_feeds.py
    ;;
  autofull-verify)
    # Read-only -- confirm the resync landed correctly. Remove once
    # confirmed.
    exec ./scripts/.venv/bin/python3 -c "
import os, psycopg2
conn = psycopg2.connect(os.environ['DATABASE_URL'])
with conn.cursor() as cur:
    cur.execute('''
        SELECT c.slug, COUNT(*) FROM products p
        JOIN vendors v ON v.id = p.vendor_id
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE v.slug = 'autofull-eu' AND p.is_active = TRUE
        GROUP BY c.slug ORDER BY COUNT(*) DESC
    ''')
    for row in cur.fetchall():
        print('|'.join(str(x) for x in row))
"
    ;;
  top-categories-check)
    # Read-only -- pick the highest-value category pages to manually
    # request indexing for in GSC after the sitemap cleanup. Remove once
    # done.
    exec ./scripts/.venv/bin/python3 -c "
import os, psycopg2
conn = psycopg2.connect(os.environ['DATABASE_URL'])
with conn.cursor() as cur:
    cur.execute('''
        SELECT c.slug, c.name, COUNT(*) FROM products p
        JOIN categories c ON c.id = p.category_id
        WHERE p.is_active = TRUE AND c.is_active = TRUE AND c.slug != 'sonstiges'
        GROUP BY c.slug, c.name ORDER BY COUNT(*) DESC LIMIT 15
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
