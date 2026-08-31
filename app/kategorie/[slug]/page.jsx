// app/kategorie/[slug]/page.jsx
// Server-rendered category landing page — fully indexable by Google
import { notFound } from "next/navigation";
import { query } from "@/lib/db";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProductImage from "@/components/ProductImage";

const BASE_URL = "https://www.preisgucken.de";

// Tell Next.js which slugs to pre-render at build time
export async function generateStaticParams() {
  try {
    const res = await query("SELECT slug FROM categories WHERE is_active = TRUE AND parent_id IS NULL");
    return res.rows.map((r) => ({ slug: r.slug }));
  } catch {
    return [];
  }
}

// Per-category metadata for Google
export async function generateMetadata({ params }) {
  const { slug } = params;
  try {
    const catRes = await query(
      `SELECT id, name FROM categories WHERE slug = $1 AND is_active = TRUE`,
      [slug]
    );
    if (!catRes.rows.length) return {};
    const { id, name } = catRes.rows[0];

    // Same recursive-descendant + linked-category aggregation the page body
    // below uses for its own product query — a plain `p.category_id = c.id`
    // match only counts products filed directly on this category, missing
    // everything under its subcategories. For a parent category that undercounts
    // massively: confirmed live, "Baby World" (39,951 products across its
    // subtree) was showing "1 Angebote für Baby World" in the actual Google/Bing
    // snippet, reading as an empty page and killing click-through regardless of
    // ranking. Same root cause noted in the body query's comment below (found
    // 2026-08-24), just missed here since this is a separate query.
    const descendantsRes = await query(
      `WITH RECURSIVE descendants AS (
         SELECT id FROM categories WHERE id = $1
         UNION ALL
         SELECT ch.id FROM categories ch JOIN descendants d ON ch.parent_id = d.id
       )
       SELECT id FROM descendants`,
      [id]
    );
    const linkedRes = await query(
      `SELECT lc.id FROM category_links cl
       JOIN categories lc ON lc.id = cl.linked_category_id AND lc.is_active = TRUE
       WHERE cl.category_id = $1`,
      [id]
    );
    const catIds = [...new Set([...descendantsRes.rows.map((r) => r.id), ...linkedRes.rows.map((r) => r.id)])];

    const countRes = await query(
      `SELECT COUNT(*) AS cnt FROM products WHERE category_id = ANY($1) AND is_active = TRUE AND in_stock = TRUE`,
      [catIds]
    );
    const count = parseInt(countRes.rows[0].cnt) || 0;

    // Shorter than the old "{name} Preisvergleich – Günstige {name} kaufen" (which
    // repeated the category name twice and pushed the title tag past 100 chars
    // once the root layout's " | Preisgucken – Preisvergleich" suffix was added,
    // getting truncated in search results). Also switched to de-DE thousands
    // separators and more natural phrasing than the old "{count} {name} im..."
    // construction, which read awkwardly for plural/compound category names.
    const countText = count === 1 ? "1 Angebot" : count > 1 ? `${count.toLocaleString("de-DE")} Angebote` : "Aktuelle Angebote";
    const socialTitle = `${name} günstig kaufen – Preisvergleich`;
    const socialDescription = `${countText} für ${name} im direkten Preisvergleich auf Preisgucken.de.`;
    return {
      title: `${name} günstig kaufen`,
      description: `${countText} für ${name} im Preisvergleich – täglich aktualisiert aus deutschen Online-Shops, kostenlos & ohne Anmeldung.`,
      alternates: { canonical: `${BASE_URL}/kategorie/${slug}` },
      // openGraph/twitter objects fully replace (not merge with) the root
      // layout's defaults once a page defines its own, so the image has to
      // be repeated here — omitting it silently drops the preview image on
      // Facebook/WhatsApp/LinkedIn shares even though Twitter still shows
      // one (twitter inherits separately since this page never redefined it).
      openGraph: {
        type: "website",
        locale: "de_DE",
        url: `${BASE_URL}/kategorie/${slug}`,
        title: socialTitle,
        description: socialDescription,
        images: [{ url: `${BASE_URL}/og-image.png`, width: 1200, height: 630, alt: `${name} – Preisvergleich` }],
      },
      // Defining any twitter object here means the page's own values are
      // used verbatim, not merged with the root layout's — card has to be
      // repeated too or it silently reverts to Next's "summary" default
      // instead of "summary_large_image" (caught by checking the actual
      // rendered output, not just assuming inheritance would hold).
      twitter: {
        card: "summary_large_image",
        title: socialTitle,
        description: socialDescription,
      },
    };
  } catch {
    return {};
  }
}

export default async function KategoriePage({ params, searchParams }) {
  const { slug } = params;
  const vendorFilter = typeof searchParams?.vendor === "string" ? searchParams.vendor : null;

  // Fetch category + children from DB (server-side, crawlable)
  const catRes = await query(
    `SELECT c.id, c.name, c.slug, c.icon,
            child.id AS child_id, child.name AS child_name, child.slug AS child_slug
     FROM categories c
     LEFT JOIN categories child ON child.parent_id = c.id AND child.is_active = TRUE
     WHERE c.slug = $1 AND c.is_active = TRUE`,
    [slug]
  );

  if (!catRes.rows.length) notFound();

  // Build category object
  const first = catRes.rows[0];
  const directChildren = catRes.rows
    .filter((r) => r.child_id)
    .map((r) => ({ id: r.child_id, name: r.child_name, slug: r.child_slug }));

  // Linked categories: a category can pull in another category's products
  // without being re-parented under it (e.g. Hochzeit shows Brautkleider's
  // dresses, which stay filed under Damenmode too) — see category_links.
  // More can be added later with a plain INSERT, no code change needed.
  const linkedRes = await query(
    `SELECT lc.id, lc.name, lc.slug
     FROM category_links cl
     JOIN categories lc ON lc.id = cl.linked_category_id AND lc.is_active = TRUE
     WHERE cl.category_id = $1`,
    [first.id]
  );

  const category = {
    id: first.id,
    name: first.name,
    slug: first.slug,
    icon: first.icon,
    children: [...directChildren, ...linkedRes.rows],
  };

  // Fetch top 24 products server-side (gives Google real content to index).
  // Recursive because the tree can go 3+ levels deep (Möbel > Schlafen >
  // Betten) — direct children alone would miss products filed on the
  // grandchildren, same bug as the one fixed in app/api/products/route.js
  // (found 2026-08-24 right after creating the Möbel parent).
  const descendantsRes = await query(
    `WITH RECURSIVE descendants AS (
       SELECT id FROM categories WHERE id = $1
       UNION ALL
       SELECT ch.id FROM categories ch JOIN descendants d ON ch.parent_id = d.id
     )
     SELECT id FROM descendants`,
    [category.id]
  );
  const catIds = [
    ...new Set([...descendantsRes.rows.map((r) => r.id), ...category.children.map((c) => c.id)]),
  ];

  // Vendor filter (?vendor=SIRUI+Optical) — narrows the same category view
  // to one vendor's products, e.g. useful when one vendor dominates a
  // category. Plain query param + server re-render, no client JS.
  const queryParams = [catIds];
  let vendorCondition = "";
  if (vendorFilter) {
    queryParams.push(vendorFilter);
    vendorCondition = "AND v.name = $2";
  }
  const prodRes = await query(
    `SELECT p.id, p.title, p.price, p.old_price, p.image, p.url, p.in_stock,
            v.name AS vendor, v.logo_url AS vendor_logo
     FROM products p
     LEFT JOIN vendors v ON v.id = p.vendor_id
     WHERE p.category_id = ANY($1) ${vendorCondition}
       AND p.is_active = TRUE AND p.in_stock = TRUE
     ORDER BY p.price ASC
     LIMIT 24`,
    queryParams
  );

  const products = prodRes.rows;

  // Vendor chips: every vendor selling in this category, regardless of
  // which one (if any) is currently selected, so a shopper can switch
  // between them freely.
  const vendorCountRes = await query(
    `SELECT v.name, COUNT(p.id)::int AS cnt
     FROM products p
     JOIN vendors v ON v.id = p.vendor_id
     WHERE p.category_id = ANY($1) AND p.is_active = TRUE AND p.in_stock = TRUE
     GROUP BY v.name
     ORDER BY cnt DESC`,
    [catIds]
  );
  const vendorCounts = vendorCountRes.rows;

  // Count per child category (direct children + linked categories) —
  // always the child's own products PLUS its own grandchildren, summed
  // via a single COUNT over the combined id set (not an either/or choice
  // between them — see lib/categoryTree.js for why: a small own-bucket
  // can coexist with much larger grandchild categories, and picking one
  // over the other either undercounts or hides real inventory).
  const childCountRes = category.children.length
    ? await query(
        `SELECT c.slug, (
           SELECT COUNT(*)::int FROM products p
           WHERE p.is_active = TRUE AND p.in_stock = TRUE
             AND p.category_id IN (
               SELECT c.id
               UNION
               SELECT gc.id FROM categories gc WHERE gc.parent_id = c.id
             )
         ) AS cnt
         FROM categories c
         WHERE c.id = ANY($1)`,
        [category.children.map((c) => c.id)]
      )
    : { rows: [] };
  const childCounts = Object.fromEntries(childCountRes.rows.map((r) => [r.slug, r.cnt]));

  // BreadcrumbList schema
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Startseite", item: BASE_URL },
      { "@type": "ListItem", position: 2, name: "Preisvergleich", item: `${BASE_URL}/preisvergleich` },
      { "@type": "ListItem", position: 3, name: category.name, item: `${BASE_URL}/kategorie/${slug}` },
    ],
  };

  // ItemList schema for the products
  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${category.name} – Preisvergleich`,
    description: `Günstige ${category.name} im Preisvergleich auf Preisgucken.de`,
    numberOfItems: products.length,
    itemListElement: products.slice(0, 12).map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Product",
        name: p.title,
        image: p.image || `${BASE_URL}/placeholder.png`,
        url: p.url,
        offers: {
          "@type": "Offer",
          price: p.price,
          priceCurrency: "EUR",
          availability: "https://schema.org/InStock",
          priceValidUntil: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
          seller: { "@type": "Organization", name: p.vendor || "Händler" },
        },
      },
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }} />

      <Navbar />

      {/* Server-rendered content Google can index without JS */}
      <header className="bg-light border-bottom py-4">
        <div className="container">
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb mb-2 small">
              <li className="breadcrumb-item"><a href="/">Startseite</a></li>
              <li className="breadcrumb-item"><a href="/">Preisvergleich</a></li>
              <li className="breadcrumb-item active">{category.name}</li>
            </ol>
          </nav>
          <h1 className="mb-1 fw-bold">{category.icon && <i className={`bi ${category.icon} me-2`}></i>}{category.name} Preisvergleich</h1>
          <p className="text-muted mb-0">
            Vergleichen Sie {products.length > 0 ? `${products.length}+` : "alle"} {category.name}-Produkte
            aus deutschen Online-Shops – günstig, aktuell, kostenlos.
          </p>
        </div>
      </header>

      {/* Sub-category pills — server rendered, crawlable links */}
      {category.children.length > 0 && (
        <div className="container pt-3">
          <div className="d-flex flex-wrap gap-2">
            {category.children.map((child) => (
              <a
                key={child.slug}
                href={`/kategorie/${child.slug}`}
                className="btn btn-sm btn-outline-secondary"
              >
                {child.name}
                {childCounts[child.slug] > 0 && (
                  <span className="ms-1 text-muted">({childCounts[child.slug]})</span>
                )}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Vendor filter pills — same category, narrowed to one vendor via
          a plain query param. Server rendered, crawlable links. */}
      {vendorCounts.length > 1 && (
        <div className="container pt-3 pb-1">
          <p className="small text-muted mb-2 fw-semibold">Marken:</p>
          <div className="d-flex flex-wrap gap-2">
            <a
              href={`/kategorie/${slug}`}
              className={`btn btn-sm ${vendorFilter ? "btn-outline-secondary" : "btn-secondary"}`}
            >
              Alle
            </a>
            {vendorCounts.map((v) => (
              <a
                key={v.name}
                href={`/kategorie/${slug}?vendor=${encodeURIComponent(v.name)}`}
                className={`btn btn-sm ${vendorFilter === v.name ? "btn-secondary" : "btn-outline-secondary"}`}
              >
                {v.name}
                <span className={vendorFilter === v.name ? "ms-1" : "ms-1 text-muted"}>({v.cnt})</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* SSR product list — visible to Googlebot without JS */}
      <main className="container py-3">
        {products.length > 0 ? (
          <>
            <div className="row g-3 mb-4">
              {products.map((p, i) => (
                <article key={p.id} className="col-6 col-sm-4 col-md-3 col-lg-2">
                  <div className="card h-100 shadow-sm">
                    <ProductImage
                      src={p.image}
                      alt={`${p.title} – günstig kaufen`}
                      height={150}
                      priority={i < 3}
                    />
                    <div className="card-body p-2">
                      <h3 className="h6 text-truncate mb-1" title={p.title}>{p.title}</h3>
                      {p.vendor && <p className="small text-muted mb-1">{p.vendor}</p>}
                      <p className="fw-bold mb-1" style={{ color: "var(--pg-blue)" }}>
                        {new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(p.price)}
                      </p>
                      <a
                        href={`/produkt/${p.id}`}
                        className="btn btn-sm btn-outline-secondary w-100"
                      >
                        Zum Angebot →
                      </a>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            <p className="text-muted text-center small">
              Zeige die günstigsten {products.length} {category.name}-Angebote.{" "}
              <a href={`/?category=${category.slug}`}>Alle {category.name}-Angebote durchsuchen →</a>
            </p>
          </>
        ) : (
          <p className="text-muted py-5 text-center">
            {vendorFilter ? (
              <>
                Keine {category.name}-Produkte von {vendorFilter} verfügbar.{" "}
                <a href={`/kategorie/${slug}`}>Filter zurücksetzen</a>
              </>
            ) : (
              <>
                Aktuell keine Produkte in dieser Kategorie verfügbar.{" "}
                <a href="/">Zum Preisvergleich</a>
              </>
            )}
          </p>
        )}

        {/* SEO text block — was identical boilerplate (just {category.name}
            swapped in) across all ~200 category pages, which reads as
            near-duplicate thin content to Google at that scale. Now uses
            real per-category data this page already fetches (vendorCounts,
            products sorted ASC by price) so every page states genuine,
            differentiated facts instead — no new query, same data already
            proven correct by the rest of the page. */}
        <section className="mt-5 pt-4 border-top">
          <div className="row">
            <div className="col-12 col-md-8">
              <h2 className="h5 fw-bold">{category.name} günstig kaufen – Preisvergleich</h2>
              {products.length > 0 ? (
                <p className="text-muted small">
                  Auf Preisgucken.de vergleichen Sie aktuell <strong>{category.name}</strong>-Angebote von{" "}
                  {vendorCounts.length > 0 ? (
                    <>{vendorCounts.length} {vendorCounts.length === 1 ? "Händler" : "verschiedenen Händlern"}</>
                  ) : (
                    "mehreren deutschen Online-Shops"
                  )}
                  {" "}– bereits ab{" "}
                  <strong>{new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(products[0].price)}</strong>.
                  Unsere Preissuchmaschine zeigt Ihnen tagesaktuelle Preise, damit Sie immer das
                  günstigste Angebot finden – kostenlos und ohne Anmeldung.
                </p>
              ) : (
                <p className="text-muted small">
                  Auf Preisgucken.de vergleichen Sie die Preise für <strong>{category.name}</strong> aus
                  hunderten deutschen Online-Shops. Unsere Preissuchmaschine zeigt Ihnen tagesaktuelle
                  Preise, damit Sie immer das günstigste Angebot finden – kostenlos und ohne Anmeldung.
                </p>
              )}
              <p className="text-muted small">
                Alle Preise verstehen sich inkl. MwSt. Preise können sich seit der letzten
                Aktualisierung geändert haben. Bitte prüfen Sie den aktuellen Preis beim
                jeweiligen Händler vor dem Kauf.
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
