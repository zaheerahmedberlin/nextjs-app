#!/usr/bin/env python3
"""
Daily AWIN product feed importer.
Loops all vendors with a feed_url and upserts products into the DB.
"""
import csv
import gzip
import hashlib
import html
import io
import os
import re
import sys
import urllib.request
import psycopg2
from psycopg2.extras import execute_values

BATCH_SIZE = 500

DATABASE_URL = os.environ.get("RAILWAY_DATABASE_URL") or os.environ.get("DATABASE_URL")

CATEGORY_KEYWORDS = {
    # Checked before 7 ("bad") — some vendors nest baby scales under their
    # own "Badezimmer"/"Badzubehör" merchandising path (e.g. DeubaXXL:
    # "Möbel & Wohnen > Badezimmer > Badzubehör > Baby- & Personenwaagen"),
    # and naive substring matching on "bad" would otherwise catch it before
    # this more specific rule gets a chance.
    52: ["babywaage"],
    # Checked before 87 ("herren"/"hemd") — GERMENS titles like "Hemd Bluse
    # Damen ..." contain both "damen" and "hemd", so the more specific
    # gender needs first crack. GERMENS's merchant_category is blank for
    # every row, so title is the only signal available.
    61: ["damen"],
    # "hemd"/"hemden" alone (no explicit gender) is GERMENS's men's shirt
    # line under a different naming style (e.g. "Sommerhemden STOP NOW!",
    # "Langarmhemd ..." vs. the explicitly-labeled "Herrenhemden ...") —
    # same product family, just inconsistent titling from the vendor.
    # "langarmhemd"/"kurzarmhemd"/"sommerhemd" are listed separately
    # because _keyword_starts_a_word only matches "hemd" at the front of
    # a compound — these titles put it at the *end* (Langarm+hemd,
    # Kurzarm+hemd, Sommer+hemd), which German compounding does just as
    # often as the leading form. Found 2026-08-16: 180 GERMENS shirts
    # sitting in Sonstiges instead of Herrenmode because of this.
    # "t shirt" is GERMENS's gender-unlabeled artfashion T-shirt line
    # ("Coole T Shirts ...", "Bedruckte T Shirts ..."). Found 2026-08-16:
    # same gap as the Langarmhemd bug above — no keyword covered it at
    # all, so these fell straight through to Sonstiges.
    87: ["herren", "männer", "hemd", "langarmhemd", "kurzarmhemd", "sommerhemd", "t shirt"],
    # GERMENS silk scarves — wearable fashion accessories, but placed in
    # Wohntextilien (home textiles) per explicit user decision on
    # 2026-08-16 despite the mismatch, since no scarf-specific category
    # exists yet. No keyword covered these at all before, so they fell
    # through to Sonstiges and the nightly sync kept undoing the manual
    # DB fix that moved them.
    71: ["seidentuch", "seidenschal", "wolltuch"],
    # GERMENS socks — new dedicated category created 2026-08-16, same
    # no-keyword-at-all gap as the scarves above. "socken"/"socke " (not
    # the bare word "socke") because that's also a prefix of "Sockel"
    # ("CPU Sockel AM4", "Sockel-Eckstück") — caught before push by
    # checking real 0815 titles, not left to reset something new.
    169: ["socken", "socke "],
    # BlazeVideo (feed_url vendor) titles their trail/wildlife cameras and
    # solar-kit accessories under a generic "Elektronik" merchant_category,
    # and some solar-kit titles also say "Outdoor" — must be checked before
    # 8 below or "outdoor" wins first. Found 2026-08-17: 22 products
    # scattered across Elektronik/Outdoor/Gartenmöbel/Leuchten instead of
    # grouped with the site's existing Überwachungskameras (78) category
    # (ieGeek/Imou security cameras).
    78: ["wildkamera", "wildtierkamera", "jagdkamera", "fotofalle"],
    36: ["garten", "terrasse", "balkon", "sonnenschirm", "pflanzk", "gartenmöbel"],
    8:  ["pool", "outdoor", "sport", "fahrrad", "camping", "freizeit"],
    5:  ["leuchte", "lampe", "licht", "led"],
    6:  ["küche", "kochen", "grill", "backen"],
    4:  ["tisch", "esstisch", "couchtisch", "schreibtisch"],
    2:  ["sofa", "couch", "sessel", "stuhl", "sitzen"],
    1:  ["bett", "matratze", "schlafen", "kissen", "decke"],
    3:  ["schrank", "regal", "kommode", "sideboard", "aufbewahrung"],
    7:  ["bad", "dusche", "sanitär", "waschbecken"],
    41: ["vitamin", "nahrungsergänzung", "supplement", "gesundheit", "booster"],
    27: ["elektronik", "computer", "laptop", "smartphone", "tablet"],
}

def _keyword_starts_a_word(keyword, text):
    """True if `keyword` appears at the start of a word in `text` — i.e. not
    preceded by another letter. German compounds always lead with the
    category word (Damenhose, Gartenmöbelset), they never bury it mid-word,
    so a plain substring check has real false positives: "Fundament"
    contains "damen" ("fun-damen-t"), miscategorizing greenhouse-foundation
    products as Damenmode. No trailing boundary is required, since
    compound suffixes (the "hose" in "Damenhose") are exactly what a
    plain substring check is supposed to still catch."""
    return re.search(rf"(?:^|[^a-zäöüß]){re.escape(keyword)}", text) is not None

def guess_category(merchant_category, title):
    text = (merchant_category + " " + title).lower()
    for cat_id, keywords in CATEGORY_KEYWORDS.items():
        if any(_keyword_starts_a_word(kw, text) for kw in keywords):
            return cat_id
    return 9  # Sonstiges

# ── Vendor-specific overrides ────────────────────────────────────────────────
# The generic keyword guesser above is too coarse for some vendors — either
# it misclassifies them (e.g. "Armband" matches nothing, falls to Sonstiges)
# or the vendor needs content excluded (Voghion's marketplace feed includes
# Vape/Sex Products, not appropriate for a general-audience site and, for
# Vape specifically, a German advertising/age-verification regulatory risk).
# Ported from the one-off onboarding scripts in the scraper repo — keep in
# sync with import_voghion.py / import_smartwatcharmbaender.py there if the
# category taxonomy changes.

VOGHION_EXCLUDED_TOP_LEVEL = {"vape", "sex products"}

# Some explicit-content leaf categories hide under an otherwise normal
# top-level path (e.g. "Underwear & Sleepwears/Women's Intimates/Sexy
# lingerie") and would slip past the top-level check above. Matched
# against the full lowercased product_type string. "Plus Size Lingerie"
# under the same top-level was checked and is ordinary clothing, not
# excluded.
VOGHION_EXCLUDED_SUBSTRINGS = {"sexy lingerie"}

# Voghion's own product_type taxonomy is unreliable for flagging explicit
# content — the same explicit item can land under any ordinary-looking
# leaf category (seen so far: "Sexy lingerie" AND "Bra & Brief Sets" for
# equally explicit items). These title keywords were checked against the
# full feed and matched zero non-explicit products, unlike generic terms
# like "sexy" alone (also used on ordinary dresses/tops).
VOGHION_EXCLUDED_TITLE_SUBSTRINGS = {"porno", "erotisch", "ouvert", "ohne schritt", "offenem schritt"}

VOGHION_CATEGORY_RULES = [
    # Schuhe (90) subtree
    ("men's shoes", 91),
    ("women's shoes", 92),
    ("athletic shoes", 93),
    ("mother & kids/children's shoes", 166),  # Kinderschuhe — must precede the generic "shoes" fallback below
    ("shoes", 91),  # generic shoes fallback -> Herrenschuhe (majority of raw volume is men's)

    # Schmuck (80) subtree
    # "earring" MUST be checked before "rings": the string "earrings"
    # itself contains "rings" as a substring, so every single Earrings
    # leaf was matching "rings" first and landing in Ringe(84) instead
    # of Ohrringe(81). Found 2026-08-11 in the scraper-repo copy of this
    # logic; this embedded copy still had the old buggy order until
    # 2026-08-16, since nothing had kept the two in sync.
    ("earring", 81),
    ("rings", 84),
    ("necklace", 82),
    ("bracelet", 83),
    ("anklet", 85),
    ("jewelry sets", 86),  # leaf-only match — see LEAF_ONLY_KEYWORDS below
    ("jewelry", 80),

    # Uhren (79)
    ("watches", 79),

    # Baby World (52) — "Mother & Kids" bundles genuine infant-care with
    # children's clothing, shoes, and toys. These specific rules must
    # come first; the blanket "mother & kids" fallback below still
    # catches genuine infant-care items. Ported 2026-08-16 from the
    # scraper-repo fix (found 2026-08-15) — this embedded copy still had
    # only the blanket rule, so the nightly sync kept re-routing kids'
    # shoes/clothing/toys back into Baby World every night.
    ("mother & kids/baby girls' clothing", 165),      # Kinderbekleidung
    ("mother & kids/baby boys' clothing", 165),
    ("mother & kids/toddler boys clothing", 165),
    ("mother & kids/toddler girls clothing", 165),
    ("mother & kids/matching family outfits", 165),
    ("mother & kids/activity & entertainment", 137),  # Spielzeug
    ("mother & kids", 52),

    # Herrenmode (87) subtree
    ("suits & blazers", 88),
    ("hoodies", 89),
    ("men's sets", 89),
    ("men's clothing", 87),

    # Damenmode (61) subtree
    ("women's clothing/tops", 64),
    ("women's clothing/dress", 62),
    ("women's clothing/party wear", 62),
    ("women's clothing/sets/shorts", 67),
    ("women's clothing/sets", 62),
    ("women's clothing", 61),

    # Handyzubehör (94)
    ("cellphones & telecommunications", 94),
    ("computer & office", 94),

    # Taschen & Koffer (95)
    ("luggage & bags", 95),

    # Unterwäsche (96)
    ("underwear", 96),

    # Consumer electronics generic -> Elektronik
    ("consumer electronics", 27),

    # Home Appliances/* — despite the name, entirely personal-care/small
    # household electronics (hair trimmers/dryers/shavers, fans), not
    # kitchen gear. Personal Care items don't fit Gesundheit & Pflege
    # either (that's medical/mobility-aid focused, not beauty/grooming).
    ("home appliances/personal care", 9),   # Sonstiges
    ("home appliances", 27),                # Elektronik (generic fallback)
]

# Keywords that must match the taxonomy path's LEAF segment exactly, not
# just appear anywhere in the path. Voghion nests unrelated leaves like
# "Tie Clips & Cufflinks" under a parent GROUP labeled "Jewelry Sets &
# More", so a plain substring match on "jewelry sets" wrongly swept
# those into Schmucksets(86) too. Found 2026-08-11 in the scraper-repo
# copy; ported here 2026-08-16 since this embedded copy never had it.
VOGHION_LEAF_ONLY_KEYWORDS = {"jewelry sets"}

# Dowinx is a single-product-line vendor (gaming/office chairs) whose
# feed has no usable merchant_category and titles like "Cute Series
# LS-6655" or "Luxury Series LS-66D89D" that don't contain "chair" or
# "stuhl" at all — the generic keyword map defaulted every row to
# Sonstiges. Found 2026-08-16: this vendor has feed_url set, so the
# nightly sync was silently re-undoing a manual DB fix every night.
# A handful of titles really are accessories, not chairs, and stay in
# Sonstiges since there's no dedicated category for them yet.
# "desk footrest"/"underdesk footrest" (not the bare word "footrest")
# because real chairs like "Dowinx Chair LS-66D89C with Extended
# Footrest Brown" also contain "footrest" as a built-in feature —
# found 2026-08-16, the bare-word version excluded 10 genuine chairs.
DOWINX_NON_CHAIR_SUBSTRINGS = ("desk footrest", "underdesk footrest", "glasses", "chair mat", "chair castors")

def guess_dowinx_category(_category_text, title=None):
    title_lower = (title or "").lower()
    if "gaming desk" in title_lower:
        return 26  # Schreibtische — the "L-Shaped Cute Gaming Desk" line
    if any(s in title_lower for s in DOWINX_NON_CHAIR_SUBSTRINGS):
        return 9  # Sonstiges
    return 17  # Sessel

def guess_voghion_category(product_type, title=None):
    pt = product_type.lower()
    t = (title or "").lower()

    # Voghion's "cellphones & telecommunications" product_type is a single
    # blanket bucket covering phone cases, watch bands, chargers, AND (for
    # this marketplace-style feed) actual counterfeit/generic phone and
    # tablet listings all at once — title-level detail the product_type
    # field doesn't carry. Checked before the coarse product_type rule
    # below. Found 2026-08-25 while sorting Handy & Tablet sitewide: 1,878
    # of 3,003 non-ESR products in that category were plain cases/covers,
    # not accessories in the electronics sense (user: a case isn't
    # electronics). Reuses the same PHONE_CASE_KEYWORDS list — same product
    # type, same rule.
    if "band für apple watch" in t or re.search(r"apple watch \d+ \w+ m[gb] (s/m|m/l|m\b)", t):
        return 98  # Smartwatch-Armbänder
    if any(k in t for k in PHONE_CASE_KEYWORDS):
        return 200  # Handyhüllen
    # A handful of genuine complete-device listings (not accessories) hide
    # in this bucket too — deliberately exact-substring, not a broad
    # "smartphone"/"tablet" keyword, since those words appear constantly in
    # real accessory titles ("Halterung für Smartphones") and a loose
    # keyword match swallowed almost the entire category on the first pass.
    if "android-gaming-tablet" in t or "tablet-pc" in t or ("tablet computer" in t and "android" in t):
        return 32  # Tablets & Zubehör
    if re.search(r"\bsmartphone\b.*(neues modell|hd-display|dual-sim)", t) or "ultra 7,3-zoll-smartphone" in t:
        return 28  # Smartphones

    leaf = pt.rsplit("/", 1)[-1].strip()
    for keyword, cat_id in VOGHION_CATEGORY_RULES:
        if keyword in VOGHION_LEAF_ONLY_KEYWORDS:
            if leaf == keyword:
                return cat_id
            continue
        if keyword in pt:
            return cat_id
    return 9  # Sonstiges

# Peter Hahn leaves the standard merchant_category column blank, but its
# feed supports AWIN's extended "product_type" field with a genuine
# "Damen > ..." / "Herren > ..." / "Wohnen > ..." hierarchy — the vendor
# sells both genders (not women's-only, despite the AWIN program being
# named "Hochwertige Damenmode"). Title keywords and brand names both
# proved unreliable here: most titles carry no gender word at all, and
# the same brands (including the "Peter Hahn" house label itself) sell
# both men's and women's lines under one name. product_type is real
# per-product ground truth, not a guess.
# Second-level product_type -> category id, built from the real distinct
# values found in the feed (not a guess). Reuses whatever subcategory
# already existed under Damenmode/Herrenmode/Mode & Accessories when the
# name matched closely enough (e.g. Damen "Hosen" -> existing Damenhosen),
# and adds new ones only where nothing fit.
PETERHAHN_DAMEN_SUBCATEGORY = {
    "hosen": 66,             # Damenhosen
    "pullover": 99,          # Damenpullover
    "blusen": 57,            # Blusen (top-level, shared)
    "shirts": 100,           # Damenshirts
    "schuhe": 92,            # Damenschuhe
    "jeans": 101,            # Damenjeans
    "wäsche": 96,            # Unterwäsche (top-level, shared)
    "strickjacken": 69,      # Strickwaren
    "jacken & mäntel": 68,   # Jacken & Mäntel (renamed from Mäntel)
    "kleider": 62,           # Kleider
    "röcke": 63,             # Röcke
    "blazer": 102,           # Blazer
    "accessoires": 70,       # Accessoires
    "twinsets": 103,         # Twinsets
    "westen": 104,           # Westen
    "bademode": 105,         # Bademode
    "lederbekleidung": 106,  # Lederbekleidung
}
PETERHAHN_HERREN_SUBCATEGORY = {
    "shirts": 58,             # T-Shirts
    "pullover": 107,          # Herrenpullover
    "hosen": 59,              # Hosen
    "wäsche": 96,             # Unterwäsche (top-level, shared)
    "jacken & mäntel": 108,   # Herrenjacken
    "strickjacken": 109,      # Herrenstrickjacken
    "hemden": 56,             # Hemden
    "jeans": 110,             # Herrenjeans
    "sakkos": 88,             # Anzüge (folded — both are formal jackets)
}

def guess_peterhahn_category(category_text, _title=None):
    parts = [p.strip() for p in category_text.split(">")]
    top_level = parts[0].lower() if parts else ""
    sub_level = parts[1].lower() if len(parts) > 1 else ""
    if top_level == "herren":
        return PETERHAHN_HERREN_SUBCATEGORY.get(sub_level, 87)  # fallback: Herrenmode
    if top_level == "damen":
        return PETERHAHN_DAMEN_SUBCATEGORY.get(sub_level, 61)  # fallback: Damenmode
    return 9  # Wohnen (home textiles) and anything unrecognized -> Sonstiges

# DeubaXXL has feed_url set but had no vendor override at all, so the
# nightly sync fell back to the generic guess_category() — which has no
# keyword covering Sessel(17), Spielzeug(137), Baby-Ausstattung(168), or
# Auto & Fahrzeugzubehör(144), so it defaulted everything to Sonstiges.
# Found 2026-08-16: every manual DB fix made to DeubaXXL products this
# session (chairs, toys, baby gear, car parts) was silently undone by
# the 2am run. Title-only, same approach as the pre-existing standalone
# fix_deubaxxx_categories.py in the scraper repo (merchant_category is
# not reliably populated for this vendor) — today's specific product
# lines are checked first since they're more precise than that script's
# broad keyword buckets, which stays as the fallback for everything else.
# Each entry: (category_id, [keywords]) — first match wins.
DEUBAXXL_CATEGORY_RULES = [
    # Root-cause fix (2026-08-17): this whole file had been running from a
    # months-stale `develop` branch — GitHub Actions schedule triggers use
    # the repo's default branch, which was `develop`, not `main` where every
    # fix in this file actually landed. Default branch switched to `main`;
    # this block is the backlog of DeubaXXL titles that piled up in
    # Sonstiges as a result, audited against all 456 real Sonstiges rows
    # for this vendor with zero left unmatched.
    (150, ["fenstergriff", "handlauf", "treppengeländer", "eingangsgeländer"]),  # Beschläge & Schlösser
    (144, ["auffahrrampe", "bremsscheibenschloss", "kofferraumtasche", "ölabsaugpumpe",
           "parkplatzsperre", "fahrradanhänger", "fahrrad-montageständer", "fahrradständer",
           "fahrradtasche", "felgen-reinigungsbürste", "rollentrainer fahrrad",
           "batterieladegerät", "fahrradschloss"]),  # Auto & Fahrzeugzubehör
    (95,  ["hartschalenkoffer", "reisetasche", "koffer set", "wasserdichte tasche",
           "einkaufstrolley"]),  # Taschen & Koffer
    (119, ["häcksler", "unkrautbrenner", "elektrischer hochentaster", "laubsauger",
           "rasensprenger", "rasenwalze", "schubkarre", "schubkarrenrad", "mähroboter garage",
           "doppel-fadenspule", "streuwagen", "freischneider"]),  # Gartengeräte
    (146, ["heringe", "festzelt"]),  # Zelte & Markisen
    (36,  ["rankhilfe", "rosenbogen", "rosensäule", "pflanzenschutzhaube",
           "ausgießer"]),  # Gartenmöbel
    (38,  ["ampelschirm", "schirmständer"]),  # Sonnenschirme
    (137, ["adventskalender", "sandkasten", "schaukeltier", "kindersitzgruppe", "schwibbogen",
           "weihnachtskugeln", "stuntscooter"]),  # Spielzeug
    (52,  ["kinderdreirad", "lernturm"]),  # Baby World
    (41,  ["digitale personenwaage", "elektrischer fußwärmer", "heimtrainer fahrrad",
           "erste hilfe-medizinschrank", "medizinschrank", "arzneischrank"]),  # Gesundheit
    (118, ["knieschoner"]),  # Arbeitskleidung & Arbeitsschutz
    (175, ["heizdecke", "kuscheldecke"]),  # Schlafen > Decken
    (3,   ["mülleimer", "elektrischer möbeltresor", "elektrischer tresor",
           "elektr möbeltresor"]),  # Aufbewahrung
    (6,   ["holzkohlebriketts", "nudelmaschine", "schüsselset", "teegläser", "teekanne",
           "wurstfüller", "spülmaschine"]),  # Küche
    (145, ["nass- trockensauger", "waschsauger", "staubsaugerbeutel",
           "staubwedel", "heizkörperbürste"]),  # Reinigung & Wäsche
    (140, ["funkwanduhr", "retrolook bahnhofsuhr", "wandhalter", "zugluftstopper"]),  # Wohnaccessoires
    (139, ["teleskopschublade"]),  # Möbelbeschläge
    (148, ["digitaler messschieber"]),  # Messwerkzeuge
    (115, ["beil", "spaltaxt", "spaltkeil", "arbeitsbock", "holzsägebock", "trockenbauschleifer",
           "farbsprühgerät", "automatik kabeltrommel", "dachrinnenschutzgitter",
           "stahl türspanner", "zargenspanner", "tauchpumpe", "ersatz-klingen", "cuttermesser",
           "doppel-stahlzylinder", "hochdruck luftpumpe", "trapezblech",
           "bodenanker"]),  # Werkzeug & Heimwerken
    (8,   ["abdeckplane", "pool", "schwimmliege", "schwimmring", "insektenhotel", "komposter",
           "feuerschale", "feuerstelle", "paravent", "gerätehaus", "geräteschuppen",
           "doppelstegplatten", "fahnenmast", "flagge", "holzfliese", "nordic walking",
           "schlauchstück", "schlauchverbinder", "tropfschlauch", "wasserschlauchaufroller",
           "wassertester", "wasser tester", "wasser messgerät", "druckwächter", "dosierschwimmer",
           "variolux schnellkupplung", "elektrische fliegenklatsche", "sackkarre",
           "sackkarrenrad", "seilwinde", "treppenkarre", "gummiauflage", "getränkekühler",
           "getränkehalter", "lay-z-spa", "sandfilter", "sandfilfteranlage", "eisspikes",
           "auflagenbox", "spanngummi", "pumpensteuerung"]),  # Outdoor
    # Today's session fixes (2026-08-16), most specific first.
    (144, ["wagenheber", "felgenbaum", "gummiauflage wagenheber", "kofferraumschutz",
           "autoschutzdecke", "autositzbezug", "kfz-montageliege", "metallkanister",
           "reifenregal", "starthilfekabel", "anhängerschloss"]),
    (17,  ["gaming stuhl", "gaming chair", "gaming-sessel", "gaming-stuhl",
           "bürostuhl", "büro-stuhl", "office chair", "rollhocker"]),
    # SPIELWERK kids' foam play mat — not the generic gym/floor mats below.
    (137, ["puzzlematte 86-tlg", "tipi spielzelt", "multifunktionales kinderdreirad",
           "spielküche", "aufblasbare weihnachtsdeko", "aufblasbarer weihnachtsmann",
           "plüschtier", "kuscheltier"]),
    (168, ["babyfußsack", "bollerwagen"]),
    (31,  ["mobile klimaanlage"]),  # Elektronik > Klima > Kühlen & Gefrieren
    (173, ["luftentfeuchter"]),     # Elektronik > Klima
    # Elektronik > Klima > Heizung — new category created 2026-08-16.
    (174, ["heizlüfter", "heizstrahler", "elektrischer kamin", "elektrischer wandkamin",
           "elektrischer doppeltür-kamin"]),
    (115, ["druckluft", "werkzeugkoffer", "schraubendreherset", "werkzeugwand", "crimpzange",
           "rohrreinigungsset", "pinselset", "sortimentskasten", "werkzeug", "nietzange",
           "magnetleiste", "drehmomentschlüssel", "heißluftpistole", "schlagtacker",
           "elektrotacker", "maßband", "abschleppstange", "tackerklammern",
           "abisolierzange"]),  # Werkzeug & Heimwerken
    (171, ["hundetransportbox", "hunderampe", "hundebox"]),  # Tierbedarf > Hunde
    (172, ["kratzbaum", "katzenhaus", "katzentransportbox", "katzenrucksack"]),  # Tierbedarf > Katzen
    (170, ["hasenstall", "kaninchenstall", "freilaufgehege", "hühnerstall"]),  # Tierbedarf (generic)
    # Must precede the generic "regal" -> Aufbewahrung(3) rule below,
    # which would otherwise catch these first and miss the more
    # specific Regale(22) subcategory.
    (22,  ["schwerlastregal", "schwerlasteckregal", "schwerlast- und eckregal"]),
    # Baseline, ported from fix_deubaxxx_categories.py (scraper repo) —
    # keep in sync there if the category taxonomy changes.
    (52,  ["baby", "kinderwagen", "buggy", "kinderbet", "babywiege", "kinderfahrrad", "laufrad"]),
    (41,  ["puzzlematte", "bodenschutz", "basketballkorb", "hantelbank", "hanteln", "fitness",
           "massag", "blutdruck", "heizkissen", "rollator", "gehhilfe", "orthopäd"]),
    (36,  ["gartenmöbel", "gartenmoebel", "garten-lounge", "gartenset", "loungeset", "garten-set",
           "gartentisch", "gartenbank", "gartenliege", "liegestuhl", "sonnenlieg", "hängematte",
           "haengematte", "pavillon", "hollywoodschaukel", "pflanzkübel", "pflanzkasten", "hochbeet",
           "blumenkübel", "blumentopf", "blumenkasten", "beeteinfassung", "rankgitter", "sichtschutz",
           "wäschespinne", "briefkasten"]),
    (37,  ["gartenstuhl", "gartenstühle", "klappstuhl", "stapelstuhl"]),
    (8,   ["garten", "outdoor", "terrasse", "balkon", "sonnenschirm", "rasenm", "gewächshaus", "trampolin"]),
    (5,   ["leuchte", "lampe", "licht", "led", "stehlampe", "tischlampe", "wandlampe", "hängelampe",
           "deckenlampe", "lichterkette", "fluter", "solar"]),
    (3,   ["regal", "aufbewahrungsbox", "aufbewahrung", "sideboard", "truhe", "aktenschrank"]),
    (20,  ["kleiderschrank", "garderobe", "garderobenschrank"]),
    (21,  ["kommode", "schubladenkommode"]),
    (22,  ["standregal", "wandregal", "bücherregal", "schuhregal"]),
    (6,   ["küche", "kueche", "kaffeemaschine", "wasserkocher", "geschirrspüler", "kühlschrank",
           "kuehlschrank", "mikrowelle", "toaster", "mixer", "entsafter", "grill", "fritteuse",
           "backofen", "sandwichmaker"]),
    (1,   ["bett", "matratze", "kopfkissen", "bettdecke", "bettwäsche", "lattenrost", "klappbett", "schlafsof"]),
    (7,   ["bad", "dusche", "waschbecken", "badezimmer", "badmöbel", "badschrank", "wc", "toilette", "badewanne"]),
    (25,  ["couchtisch"]),
    (24,  ["esstisch"]),
    (4,   ["tisch", "beistelltisch", "schreibtisch", "klapptisch", "bartisch"]),
    (16,  ["sofa", "couch", "ecksofa", "schlafsofa"]),
    (17,  ["sessel", "relaxstuhl", "fernsehsessel"]),
    (2,   ["stuhl", "hocker", "sitzbank"]),
]

def guess_deubaxxl_category(_category_text, title=None):
    t = (title or "").lower()
    for cat_id, keywords in DEUBAXXL_CATEGORY_RULES:
        if any(kw in t for kw in keywords):
            return cat_id
    return 9  # Sonstiges

# Centa-Star DE is a bedding-only vendor. Blanket/duvet and pillow
# product lines are covered here — mattress toppers and covers found
# 2026-08-16 still need their own category and are left at the
# Sonstiges fallback for now.
CENTASTAR_DECKEN_KEYWORDS = ["winterdecke", "sommerdecke", "ganzjahresdecke",
                             "vierjahreszeitendecke", "wohndecke", "gesteppt"]
# "kissen" alone isn't used here — it's already a generic-classifier
# keyword, but only matches when it STARTS a word (see
# _keyword_starts_a_word), and "Kopfkissen"/"Nackenstützkissen" have it
# as a compound suffix instead — same bug class as Langarmhemd.
CENTASTAR_KISSEN_KEYWORDS = ["kopfkissen", "nackenstützkissen", "seitenschläferkissen",
                             "stillkissen", "kissenbezug", "kissenhülle", "seitenkissen",
                             "jerseybezug für recharge"]
# Product-line names with no "kissen" in the title at all — verified
# against each product's description (all confirmed Kopfkissen or
# Nackenstützkissen lines) before adding, 2026-08-16.
CENTASTAR_KISSEN_PRODUCT_LINES = ["classic supersoft", "comfort exquisit variabel",
                                  "comfort soft soft", "golf von alaska soft"]

def guess_centastar_category(category_text, title=None):
    t = (title or "").lower()
    if any(kw in t for kw in CENTASTAR_DECKEN_KEYWORDS):
        return 175  # Schlafen > Decken
    if any(kw in t for kw in CENTASTAR_KISSEN_KEYWORDS) or any(kw in t for kw in CENTASTAR_KISSEN_PRODUCT_LINES):
        return 176  # Schlafen > Kissen
    # Fall through to the generic classifier instead of hardcoding
    # Sonstiges — titles like "Bettwäsche ..." and "... Matratzenauflage"
    # already route correctly via its "bett"/"matratze"/"kissen" rules
    # (bucket 1). A hardcoded fallback here would have reset those
    # already-correct products on the next sync.
    return guess_category(category_text, title)

# ESR Tech (EU) — Darwin/Google Shopping feed, sells almost nothing but
# mobile/tablet accessories, but the generic guesser has no rule for that
# at all: English product_type text like "Electronics > Communications >
# Telephony > Mobile Phone Accessories > Mobile Phone Cases" never matches
# any German keyword in CATEGORY_KEYWORDS, so most rows fell through to
# Sonstiges (9), and the "Computer Accessories"-labeled rows (keyboards,
# PDA cases, mice) matched "computer" and landed on the bare Elektronik
# parent (27) instead of a real leaf category. Found 2026-08-25, one
# nightly sync after onboarding — it had already silently overwritten the
# hand-done categorization from the import.
#
# Cases/covers/wallets are routed to the standalone Handyhüllen category
# (200) rather than Handy & Tablet (94) — a protective case isn't
# electronics, per explicit user decision 2026-08-25. Genuine electronics
# accessories (screen/keyboard protectors, chargers, power banks, stylus
# pens, camera lens attachments) stay in Handy & Tablet.
PHONE_CASE_KEYWORDS = ["case", "wallet", "cover", "sleeve", "hülle"]

def guess_esr_category(category_text, title=None):
    text = ((category_text or "") + " " + (title or "")).lower()
    if "watch band" in text:
        return 98  # Smartwatch-Armbänder
    if "vehicle" in text:
        return 144  # Auto & Fahrzeugzubehör
    if any(kw in text for kw in PHONE_CASE_KEYWORDS):
        return 200  # Handyhüllen
    return 94  # Handy & Tablet

# Cosmetière — classic AWIN feed, merchant_category is a clean, well-
# organized German taxonomy (unlike ESR's English Darwin format), but the
# generic guesser's CATEGORY_KEYWORDS has no cosmetics rules at all, so
# every row would fall straight to Sonstiges on the next sync without an
# override — same failure mode as ESR, caught before it happened this time.
#
# "Erotik" (66 rows: lubricants, intimate items) is skipped outright, not
# routed anywhere — same German-advertising-law call as Voghion's Vape/Sex
# Products exclusion, not appropriate for a general-audience site.
#
# "Make-up" and "Kinder & Babys" are single blanket merchant_category
# buckets covering several genuinely different product types each — split
# by title keyword (incl. Spanish terms — the feed's product names mix
# English/German/Spanish). "Kinder & Babys" items with "Case"/"Bag" in the
# title looked like a backpack-vs-toiletries split at first glance, but
# they're all cosmetic gift sets *packaged in* a themed bag/case (e.g.
# "Mustela Baby-Boy Jungle Toiletry Bag Case 5 Pcs"), not standalone
# luggage — confirmed by full-title review before shipping, not left as
# an assumption. All of it stays in Baby-Ausstattung.
COSMETIERE_NAIL_KW = ["nail", "nagel", "esmalte"]
COSMETIERE_LIP_KW = ["lip", "lippen", "labial", "barra de labios", "lápiz de labios"]
COSMETIERE_EYE_KW = ["mascara", "eyeliner", "eyeshadow", "lidschatten", "wimperntusche",
                      "eye brow", "eyebrow", "augenbrauen", "eye ", "eyelash", "false lash",
                      "wimper", "delineador", "pestañas", "sombra de ojos", "rimel"]
COSMETIERE_FACE_KW = ["foundation", "concealer", "puder", "powder", "rouge", "blush",
                       "bronzer", "contour", "primer", "make-up base", "bb cream",
                       "cc cream", "colorete"]

COSMETIERE_CATEGORY_MAP = {
    "Haare": 157,            # Haarpflege
    "Hygiene": 156,          # Körperpflege
    "Körperkosmetik": 156,   # Körperpflege
    "Gesundheit": 41,        # Gesundheit & Pflege
    "Ernährung": 41,
    "Sporternährung": 41,
    "Haustiere": 170,        # Tierbedarf
    "Homecare": 145,         # Reinigung & Wäsche — household paper/cleaning, not cosmetics
    "Gesichtskosmetik": 155, # Gesichtspflege
    "Parfums": 201,          # Parfüm (new)
    "Sonnenpflege": 203,     # Sonnenschutz (new)
    "Brillen": 204,          # Brillen (new, under Mode & Accessories)
}

def guess_cosmetiere_category(merchant_category, title=None):
    if merchant_category in COSMETIERE_CATEGORY_MAP:
        return COSMETIERE_CATEGORY_MAP[merchant_category]
    if merchant_category == "Make-up":
        t = (title or "").lower()
        if any(k in t for k in COSMETIERE_NAIL_KW):
            return 202  # Nägel (new)
        if any(k in t for k in COSMETIERE_LIP_KW):
            return 154  # Lippen
        if any(k in t for k in COSMETIERE_EYE_KW):
            return 153  # Make-up Augen
        return 152  # Make-up Gesicht (also the default for unmatched Make-up)
    if merchant_category == "Kinder & Babys":
        return 168  # Baby-Ausstattung
    return 9  # Mode/Wines/Sport stray rows (1 each) + anything unexpected

# isinwheel.DE — classic AWIN feed, but merchant_category is a single
# uniform value ("Cycling") on every row with zero discriminating power,
# so this override is title-only. The feed mixes three genuinely
# different product lines under that one label: adult street-legal
# e-scooters, children's electric ride-on toys (ages 3-12), and e-bikes
# — plus, unrelated to any of those, a small run of home-fitness walking
# pads. Researched against idealo.de's live category structure before
# creating new categories, 2026-08-25: idealo files e-bikes under
# Fahrräder > E-Bikes (a bicycle subtype, not grouped with scooters) and
# treadmills under Fitness & Krafttraining > Laufbänder (its own
# vertical, unrelated to e-mobility) — this site's new categories (205-208)
# mirror that structure.
def guess_isinwheel_category(_merchant_category, title=None):
    t = (title or "").lower()
    if "kinder" in t or "jungen" in t or "minispider" in t or ("s4" in t and "roller" in t) or ("s7" in t and "roller" in t):
        return 137  # Spielzeug — ages 3-12, not the adult E-Scooter category
    if "laufband" in t:
        return 208  # Laufbänder
    if "e-bike" in t or "e-mountainbike" in t or "e-fatbike" in t or "fatbike" in t:
        return 206  # E-Bikes
    return 180  # E-Scooter (incl. the E-Scooter battery spare part)

# Kohl DE — 5 combined AWIN data feeds (Harley-Davidson, BMW Motorrad,
# a multi-brand touring feed, AC Schnitzer, and Wunderlich) under one
# vendor, all sharing a blank merchant_category, so this override is
# title-only. The BMW feed mixes genuine motorcycle parts and genuine
# BMW/MINI car-tuning parts together; AC Schnitzer likewise sells both
# BMW car tuning AND BMW motorcycle parts (verified via real model names
# like R nineT/K1600/S1000RR appearing inside its car-tuning-branded
# feed), so a per-feed split would have been wrong — this classifies
# every row by title content instead. Several early keyword attempts
# false-positived badly before this version: a bare "gs" matched inside
# "LeiSTUNGSteigerung" (292 AC Schnitzer items), "bremsbelä" and
# "auspuffblende" are generic terms Harley uses too, "mini " matched
# "BatWing Mini Ape Hanger" (a small handlebar, not the MINI car brand),
# bare "1er"-"7er" matched pack-quantity notation ("Ölwechsel Kit 4er")
# and model years ("1962er"), and a bare "m performance" substring
# matched inside "Cam Performance" / "Goldstorm Performance" (Harley
# items). Caught and fixed before import, 2026-08-25, via full
# cross-tabulation by data_feed_id against the real 18,323-row feed.
KOHL_MOTO_MODEL_KW = ['rninet', 'r ninet', 'r nine', 'k1600', 'k 1600', 'k1200', 'k1300', 'k70', 'k72',
                      's1000xr', 's1000rr', 's 1000', 'r1200', 'r1250', 'f800', 'f850', 'f750', 'f700', 'f650']
KOHL_MOTO_GENERIC_KW = ['motorrad', 'topcase', 'koffersystem', 'windschutzscheibe', 'sturzbügel', 'fußrasten',
                        'fussraste', 'satteltasche', 'hecktasche', 'kettenschutz', 'kardanantrieb',
                        'schutzblech', 'enduro', 'systemkoffer', 'kofferhalter', 'sena', 'zega', 'touratech',
                        'akrapovic', 'spiegelglas', 'windabweiser', 'sportschalldämpfer', 'schalldämpfer',
                        'hp carbon', 'airbox', 'höckerabdeckung', 'seitentasche', 'sozius', 'kupplungshebel',
                        'bremshebel', 'tankrucksack', 'sitzbank', 'ventildeckelschutz', 'rückenpolster',
                        'montageständer', 'motorschutzbügel', 'handschutz', 'handprotektor', 'innentasche',
                        'für koffer', 'für tourenkoffer', 'rahmenschutz', 'gabelfedern', 'federbein',
                        'tieferlegung', 'radabdeckung vorne', 'rallye-sitzbank', 'schließzylinder',
                        'gepäckplatte', 'harley', ' hd ', 'wunderlich', 'ape hanger', 'lenker',
                        'gepäckträger', 'ölwechsel kit']
KOHL_CAR_CHASSIS_RE = re.compile(r'\b(e46|e60|e8[1278]|e9[0123]|f2[0123]|f2[56]|f3[0136]|f8[0235-7]|f90|g3[01])\b', re.I)
KOHL_M_PERFORMANCE_RE = re.compile(r'\bm performance\b', re.I)
KOHL_CAR_BRAND_KW = ['ac schnitzer', 'frontziergitter', 'ladeluftkühler', 'seitenschweller', 'heckdiffusor',
                     'heckspoiler', 'schaltknauf', 'wählhebel', 'fahrradhalter', 'schlüsseletui',
                     'alu-pedale', 'scheibenwischer', 'wischerblatt']

def guess_kohl_category(_merchant_category, title=None):
    t = (title or "").lower()
    if any(k in t for k in KOHL_MOTO_MODEL_KW):
        return 209  # Motorradzubehör
    if (KOHL_CAR_CHASSIS_RE.search(t) or KOHL_M_PERFORMANCE_RE.search(t) or any(k in t for k in KOHL_CAR_BRAND_KW)
            or t.strip().startswith('mini ') or t.startswith('i3 ')):
        return 210  # Tuning
    if any(k in t for k in KOHL_MOTO_GENERIC_KW):
        return 209
    return 209  # default: the vendor is overwhelmingly motorcycle parts

VENDOR_OVERRIDES = {
    "Kohl DE": {
        "excluded_top_level": set(),
        "excluded_substrings": set(),
        "excluded_title_substrings": set(),
        "category_fn": guess_kohl_category,
    },
    "isinwheel.DE": {
        "excluded_top_level": set(),
        "excluded_substrings": set(),
        "excluded_title_substrings": set(),
        "category_fn": guess_isinwheel_category,
    },
    "ESR Tech (EU)": {
        "excluded_top_level": set(),
        "excluded_substrings": set(),
        "excluded_title_substrings": set(),
        "category_fn": guess_esr_category,
    },
    "Cosmetière": {
        # "Erotik" (66 rows: lubricants, intimate items) — German
        # advertising law risk for a general-audience site, same call as
        # Voghion's Vape/Sex Products exclusion. merchant_category has no
        # "/" hierarchy for this vendor, so the whole value is the "top
        # level" — an exact-match exclusion here, not a substring one.
        "excluded_top_level": {"erotik"},
        "excluded_substrings": set(),
        # Condoms (9 rows) are filed under "Gesundheit", not "Erotik" —
        # the merchant_category exclusion above doesn't catch them.
        # User explicitly asked to apply the same conservative standard
        # here as Erotik, 2026-08-25.
        "excluded_title_substrings": {"condom"},
        "category_fn": guess_cosmetiere_category,
    },
    "Centa-Star DE": {
        "excluded_top_level": set(),
        "excluded_substrings": set(),
        "excluded_title_substrings": set(),
        "category_fn": guess_centastar_category,
    },
    "DeubaXXL": {
        "excluded_top_level": set(),
        "excluded_substrings": set(),
        "excluded_title_substrings": set(),
        "category_fn": guess_deubaxxl_category,
    },
    "Voghion Global": {
        "excluded_top_level": VOGHION_EXCLUDED_TOP_LEVEL,
        "excluded_substrings": VOGHION_EXCLUDED_SUBSTRINGS,
        "excluded_title_substrings": VOGHION_EXCLUDED_TITLE_SUBSTRINGS,
        "category_fn": guess_voghion_category,
    },
    "Smartwatcharmbaender DE": {
        "excluded_top_level": set(),
        "excluded_substrings": set(),
        "excluded_title_substrings": set(),
        "category_fn": lambda _category_text, _title=None: 98,  # Smartwatch-Armbänder
    },
    "GERMENS DE": {
        "excluded_top_level": set(),
        "excluded_substrings": set(),
        # Explicitly excluded by request — the daily sync would otherwise
        # keep re-adding it every run since it's still in GERMENS's live
        # feed; deleting the row alone doesn't stick.
        "excluded_title_substrings": {"rückenabnäher"},
        "category_fn": guess_category,
    },
    "Dowinx": {
        "excluded_top_level": set(),
        "excluded_substrings": set(),
        # Checkout add-ons that AWIN's feed lists as if they were real,
        # separately-orderable products. Found 2026-08-16: 103 rows.
        "excluded_title_substrings": {"shipping protection", "gift wrap"},
        "category_fn": guess_dowinx_category,
    },
    "Peter Hahn": {
        "excluded_top_level": set(),
        "excluded_substrings": set(),
        "excluded_title_substrings": set(),
        "category_fn": guess_peterhahn_category,
        # Every size/color variant is its own feed row with a distinct
        # aw_deep_link even though they share one real product page —
        # merchant_deep_link is the actual per-product identity here.
        "url_field": "merchant_deep_link",
        # See guess_peterhahn_category — the vendor's stored feed_url must
        # request the "product_type" column for this to be populated.
        "category_field": "product_type",
        # Multi-brand feed (Peter Hahn's own label plus Brax, BOSS, GANT,
        # Bugatti, ...) — prepend the actual brand so it's the first thing
        # a shopper reads, not buried in free-text description copy.
        "brand_field": "brand_name",
    },
}

# Some vendors are deliberately capped at a pilot size rather than their full
# feed (e.g. Smartwatcharmbaender DE: ~91,620 raw rows, business decision to
# import only 2,000). Without this, the daily sync would silently re-import
# the full feed on its first run. Step-sampled (not a plain head-cut) so the
# capped subset stays representative of the feed's overall distribution.
VENDOR_ROW_LIMITS = {
    "Smartwatcharmbaender DE": 2000,
}

def sample_rows(rows, limit):
    # Keyed on aw_deep_link (stable per product/SKU across days) rather than
    # position in the feed. A positional/step sample looked stable in testing
    # but broke on the very next real run: the vendor's raw row count shifted
    # day to day, which shifted every sampled index, selecting a mostly
    # *different* set of products and leaving the previous day's selection
    # in place too — capped-2000 grew to ~3,938 after a single re-run.
    # Hashing the URL means the same subset of products gets selected every
    # time regardless of how the feed reorders or grows/shrinks elsewhere.
    if not limit or limit >= len(rows):
        return rows
    def stable_key(row):
        url = row.get("aw_deep_link", "")
        return hashlib.md5(url.encode()).hexdigest()
    return sorted(rows, key=stable_key)[:limit]

def parse_row(row, is_darwin, url_field="aw_deep_link", category_field="merchant_category", brand_field=None):
    """Normalize a CSV row from either the classic AWIN format (product_name,
    search_price, aw_image_url, merchant_category) or the Darwin/Google
    Shopping format (title, price, image_link, product_type) — Dowinx uses
    Darwin, GERMENS/BlazeVideo/DeubaXXL use classic. Returns None to skip
    the row (missing data, or non-EUR price in Darwin feeds).

    url_field defaults to aw_deep_link (AWIN's own pclick.php tracking
    redirect, unique per feed row) since that's what most vendors' url
    column stores directly as the outbound affiliate link. Some feeds
    (Peter Hahn) list every size/color as its own row with a distinct
    aw_deep_link even though they share one real product page — for those,
    the vendor override passes url_field="merchant_deep_link" instead, and
    lib/affiliate.js wraps that raw URL into a proper AWIN tracking link
    at render time via its merchant-id map."""
    if is_darwin:
        title = (row.get("title") or "").strip()
        url = (row.get(url_field) or "").strip()
        price_raw = (row.get("price") or "").strip()
        parts = price_raw.split()
        if len(parts) == 2 and parts[1] != "EUR":
            return None  # non-EUR entry, skip rather than misreport currency
        try:
            price = float(parts[0]) if parts else 0.0
        except ValueError:
            price = 0.0
        image = row.get("image_link", "")
        category_text = row.get("product_type") or row.get("google_product_category", "")
        desc = (row.get("description", "") or "")[:1000]
    else:
        title = (row.get("product_name") or "").strip()
        url = (row.get(url_field) or "").strip()
        try:
            price = float(row.get("search_price", "0") or 0)
        except ValueError:
            price = 0.0
        image = row.get("aw_image_url") or row.get("merchant_image_url", "")
        category_text = row.get(category_field, "")
        desc = (row.get("description", "") or "")[:1000]

    if not title or not url:
        return None

    # Some merchant feeds (DeubaXXL, LIKA, ...) export title/description
    # already HTML-entity-encoded (e.g. "&" -> "&amp;"/"&#038;") — unescape
    # so stored text matches what a shopper actually reads.
    title = html.unescape(title)
    desc = html.unescape(desc)

    if brand_field:
        brand = (row.get(brand_field) or "").strip()
        if brand and not desc.lower().startswith(brand.lower()):
            desc = f"{brand}. {desc}" if desc else brand

    return {"title": title, "url": url, "price": price, "image": image,
            "category_text": category_text, "description": desc}

def import_vendor(cur, vendor_id, vendor_name, feed_url):
    print(f"  Downloading feed for {vendor_name}...")
    try:
        req = urllib.request.Request(feed_url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=60) as resp:
            raw = resp.read()
    except Exception as e:
        print(f"  ERROR downloading feed: {e}")
        return 0

    inserted = updated = skipped = 0

    try:
        f = gzip.decompress(raw)
        reader = csv.DictReader(io.StringIO(f.decode("utf-8")))
    except Exception:
        reader = csv.DictReader(io.StringIO(raw.decode("utf-8")))

    is_darwin = reader.fieldnames and "title" in reader.fieldnames and "product_name" not in reader.fieldnames
    if is_darwin:
        print(f"  Detected Darwin/Google Shopping feed format for {vendor_name}")

    override = VENDOR_OVERRIDES.get(vendor_name)

    rows = list(reader)
    row_limit = VENDOR_ROW_LIMITS.get(vendor_name)
    if row_limit:
        rows = sample_rows(rows, row_limit)
        print(f"  Capped to {len(rows)} rows (pilot limit for {vendor_name})")

    # Parse + categorize every row first, deduping by url within this batch
    # (keep the last occurrence, matching the old row-by-row loop's natural
    # self-correcting behavior when a feed lists the same url twice).
    parsed_by_url = {}
    url_field = override.get("url_field", "aw_deep_link") if override else "aw_deep_link"
    category_field = override.get("category_field", "merchant_category") if override else "merchant_category"
    brand_field = override.get("brand_field") if override else None
    for row in rows:
        parsed = parse_row(row, is_darwin, url_field, category_field, brand_field)
        if not parsed:
            skipped += 1
            continue

        title, url, price = parsed["title"], parsed["url"], parsed["price"]
        image, desc = parsed["image"], parsed["description"]

        # AWIN's own "no image available" placeholder is a real URL, not
        # an empty string — this script had no image check at all before,
        # so it silently imported it as if it were a real product photo.
        # Found 2026-08-14: 36,132 live products site-wide (727 of them
        # Peter Hahn, synced nightly by this exact script) were showing
        # this broken placeholder instead of being skipped.
        if not image or "noimage" in image.lower():
            skipped += 1
            continue

        if override:
            pt_lower = parsed["category_text"].lower()
            top_level = pt_lower.split("/")[0].strip()
            title_lower = title.lower()
            if (
                top_level in override["excluded_top_level"]
                or any(s in pt_lower for s in override["excluded_substrings"])
                or any(s in title_lower for s in override["excluded_title_substrings"])
            ):
                skipped += 1
                continue
            category_id = override["category_fn"](parsed["category_text"], title)
        else:
            category_id = guess_category(parsed["category_text"], title)

        parsed_by_url[url] = (title, desc, image, price, category_id)

    # One round-trip for every existing row instead of one SELECT per feed
    # row — this (plus batching the writes below) is the whole fix: ~24,000
    # individual round-trips to Railway from a GitHub runner is what pushed
    # Voghion past the 60-minute job timeout, even though the same script
    # finished in minutes when run locally.
    cur.execute("SELECT url, id FROM products WHERE vendor_id = %s", (vendor_id,))
    existing_by_url = dict(cur.fetchall())

    to_update = []  # (id, price, title, image, category_id, desc)
    to_insert = []  # (title, desc, image, price, url, vendor_id, category_id, title, desc)
    for url, (title, desc, image, price, category_id) in parsed_by_url.items():
        existing_id = existing_by_url.get(url)
        if existing_id:
            to_update.append((existing_id, price, title, image, category_id, desc))
        else:
            to_insert.append((title, desc, image, price, url, vendor_id, category_id, title, desc))

    if to_update:
        execute_values(cur, """
            UPDATE products AS p SET
                price = v.price, title = v.title, image = v.image, category_id = v.category_id,
                description = v.descr,
                search_vector = to_tsvector('german', unaccent(coalesce(v.title,'')||' '||coalesce(v.descr,'')))
            FROM (VALUES %s) AS v(id, price, title, image, category_id, descr)
            WHERE p.id = v.id
        """, to_update, template="(%s,%s,%s,%s,%s,%s)", page_size=BATCH_SIZE)
        updated = len(to_update)
        cur.connection.commit()

    if to_insert:
        execute_values(cur, """
            INSERT INTO products (title, description, image, price, url, vendor_id, category_id, in_stock, is_active, search_vector)
            VALUES %s
        """, to_insert, template=(
            "(%s,%s,%s,%s,%s,%s,%s,true,true,"
            "to_tsvector('german', unaccent(coalesce(%s,'')||' '||coalesce(%s,''))))"
        ), page_size=BATCH_SIZE)
        inserted = len(to_insert)
        cur.connection.commit()

    print(f"  {vendor_name}: {inserted} inserted, {updated} updated, {skipped} skipped")
    return inserted + updated

def flush_redis_cache():
    redis_url = os.environ.get("REDIS_URL")
    if not redis_url:
        print("No REDIS_URL set — skipping cache flush")
        return
    try:
        import urllib.parse
        parsed = urllib.parse.urlparse(redis_url)
        import socket, ssl as ssl_mod
        host, port = parsed.hostname, parsed.port or 6379
        use_ssl = parsed.scheme == "rediss"
        sock = socket.create_connection((host, port), timeout=10)
        if use_ssl:
            sock = ssl_mod.wrap_socket(sock)
        if parsed.password:
            sock.sendall(f"AUTH {parsed.password}\r\n".encode())
            sock.recv(100)
        sock.sendall(b"FLUSHDB\r\n")
        resp = sock.recv(100)
        sock.close()
        print(f"Redis FLUSHDB: {resp.decode().strip()}")
    except Exception as e:
        print(f"Redis flush skipped: {e}")

def connect():
    return psycopg2.connect(
        DATABASE_URL,
        keepalives=1,
        keepalives_idle=60,
        keepalives_interval=10,
        keepalives_count=5,
        connect_timeout=30,
    )

def main():
    print("Connecting to database...")
    conn = connect()
    conn.autocommit = False
    with conn.cursor() as cur:
        cur.execute("SELECT id, name, feed_url FROM vendors WHERE feed_url IS NOT NULL AND feed_url != ''")
        vendors = cur.fetchall()
    conn.close()

    # Optional comma-separated allow/deny lists so the workflow can split
    # vendors across parallel jobs (e.g. Voghion's large feed alone vs.
    # everyone else) — a single job processing everything sequentially
    # risks the 60-minute timeout, which silently skips every step after
    # it (including the separate Shopify-vendor refresh) rather than just
    # that one vendor. VENDOR_EXCLUDE is preferred for the "everyone else"
    # bucket since it auto-adapts when a new vendor gets a feed_url later.
    vendor_filter = os.environ.get("VENDOR_FILTER", "").strip()
    if vendor_filter:
        allowed = {v.strip() for v in vendor_filter.split(",") if v.strip()}
        vendors = [v for v in vendors if v[1] in allowed]
        print(f"VENDOR_FILTER active: {sorted(allowed)}")

    vendor_exclude = os.environ.get("VENDOR_EXCLUDE", "").strip()
    if vendor_exclude:
        excluded = {v.strip() for v in vendor_exclude.split(",") if v.strip()}
        vendors = [v for v in vendors if v[1] not in excluded]
        print(f"VENDOR_EXCLUDE active: {sorted(excluded)}")

    print(f"Found {len(vendors)} vendor(s) with feed URLs")

    total = 0
    failed = []
    for vendor_id, vendor_name, feed_url in vendors:
        print(f"\nProcessing {vendor_name} (id={vendor_id})...")
        # Fresh connection per vendor — a connection drop or crash on one
        # vendor no longer kills the rest of the run.
        try:
            vendor_conn = connect()
            vendor_conn.autocommit = False
            with vendor_conn.cursor() as vendor_cur:
                count = import_vendor(vendor_cur, vendor_id, vendor_name, feed_url)
            vendor_conn.commit()
            vendor_conn.close()
            total += count
        except Exception as e:
            print(f"  ERROR processing {vendor_name}: {e}")
            failed.append(vendor_name)

    print(f"\nDone — {total} products imported/updated across {len(vendors) - len(failed)}/{len(vendors)} vendors")
    if failed:
        print(f"Failed vendors (not updated this run): {', '.join(failed)}")
    flush_redis_cache()

    if failed:
        sys.exit(1)

if __name__ == "__main__":
    main()
