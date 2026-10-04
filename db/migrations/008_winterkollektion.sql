-- ─────────────────────────────────────────────────────────────
-- Migration 008 – Winterkollektion seasonal collection category
-- Run: psql -d preisgucken -f db/migrations/008_winterkollektion.sql
--
-- New top-level category that aggregates existing categories via the
-- category_links table (already live and used today for Hochzeit →
-- Brautkleider — see app/kategorie/[slug]/page.jsx) instead of moving
-- or duplicating any product. Herrenjacken (108) and Jacken & Mäntel
-- (68, Damenmode's jacket/coat category — there is no separate
-- "Damenjacken") keep their own category_id, their own product counts,
-- and their own pages exactly as before; Winterkollektion has zero
-- directly-assigned products of its own and exists purely as a lens
-- over those two. Herrenstrickjacken (cardigans) deliberately excluded
-- per explicit instruction — not real winter outerwear.
--
-- Note: the homepage's category-tile grid counts products through the
-- parent_id tree only (lib/categoryTree.js), not through category_links,
-- so this category will show 0 there and won't appear as a homepage
-- tile — same pre-existing behavior Hochzeit already has. Its own page
-- at /kategorie/winterkollektion works fully regardless. Discoverability
-- is handled separately via a Footer.jsx link, not a schema concern.
-- ─────────────────────────────────────────────────────────────

INSERT INTO categories (parent_id, slug, name, is_active)
VALUES (NULL, 'winterkollektion', 'Winterkollektion', TRUE)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, is_active = TRUE;

INSERT INTO category_links (category_id, linked_category_id)
SELECT c.id, 108 FROM categories c WHERE c.slug = 'winterkollektion'
ON CONFLICT (category_id, linked_category_id) DO NOTHING;

INSERT INTO category_links (category_id, linked_category_id)
SELECT c.id, 68 FROM categories c WHERE c.slug = 'winterkollektion'
ON CONFLICT (category_id, linked_category_id) DO NOTHING;
