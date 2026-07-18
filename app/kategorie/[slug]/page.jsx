// app/kategorie/[slug]/page.jsx
// Server-rendered category landing page — fully indexable by Google
import { notFound } from "next/navigation";
import { query } from "@/lib/db";

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
    const res = await query(
      `SELECT c.name, COUNT(p.id) AS cnt
       FROM categories c
       LEFT JOIN products p ON p.category_id = c.id AND p.is_active = TRUE AND p.in_stock = TRUE
       WHERE c.slug = $1 AND c.is_active = TRUE
       GROUP BY c.name`,
      [slug]
    );
    if (!res.rows.length) return {};
    const { name, cnt } = res.rows[0];
    const count = parseInt(cnt) || 0;
    return {
      title: `${name} Preisvergleich – Günstige ${name} kaufen`,
      description: `${count > 0 ? count : "Viele"} ${name} im Preisvergleich. Finden Sie die günstigsten Angebote für ${name} aus deutschen Online-Shops – täglich aktualisiert.`,
      alternates: { canonical: `${BASE_URL}/kategorie/${slug}` },
      openGraph: {
        type: "website",
        locale: "de_DE",
        url: `${BASE_URL}/kategorie/${slug}`,
        title: `${name} günstig kaufen – Preisvergleich`,
        description: `${count > 0 ? count : "Alle"} ${name}-Produkte im Preisvergleich auf Preisgucken.de`,
      },
    };
  } catch {
    return {};
  }
}

export default async function KategoriePage({ params }) {
  const { slug } = params;

  // Fetch category + children from DB (server-side, crawlable)
  const catRes = await query(
    `SELECT c.id, c.name, c.slug, c.icon,
            child.id AS child_id, child.name AS child_name, child.slug AS child_slug
     FROM categories c
     LEFT JOIN categories child ON child.parent_id = c.id AND child.is_active = TRUE
     WHERE c.slug = $1 AND c.is_active = TRUE AND c.parent_id IS NULL`,
    [slug]
  );

  if (!catRes.rows.length) notFound();

  // Build category object
  const first = catRes.rows[0];
  const category = {
    id: first.id,
    name: first.name,
    slug: first.slug,
    icon: first.icon,
    children: catRes.rows
      .filter((r) => r.child_id)
      .map((r) => ({ id: r.child_id, name: r.child_name, slug: r.child_slug })),
  };

  // Fetch top 24 products server-side (gives Google real content to index)
  const catIds = [category.id, ...category.children.map((c) => c.id)];
  const placeholders = catIds.map((_, i) => `$${i + 1}`).join(",");
  const prodRes = await query(
    `SELECT p.id, p.title, p.price, p.old_price, p.image, p.url, p.in_stock,
            v.name AS vendor, v.logo_url AS vendor_logo
     FROM products p
     LEFT JOIN vendors v ON v.id = p.vendor_id
     WHERE p.category_id IN (${placeholders})
       AND p.is_active = TRUE AND p.in_stock = TRUE
     ORDER BY p.price ASC
     LIMIT 24`,
    catIds
  );

  const products = prodRes.rows;

  // Count per child category
  const childCountRes = await query(
    `SELECT c.slug, COUNT(p.id)::int AS cnt
     FROM categories c
     LEFT JOIN products p ON p.category_id = c.id AND p.is_active = TRUE AND p.in_stock = TRUE
     WHERE c.parent_id = $1
     GROUP BY c.slug`,
    [category.id]
  );
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
        <div className="container py-3">
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

      {/* SSR product list — visible to Googlebot without JS */}
      <main className="container py-3">
        {products.length > 0 ? (
          <>
            <div className="row g-3 mb-4">
              {products.map((p, i) => (
                <article key={p.id} className="col-6 col-sm-4 col-md-3 col-lg-2">
                  <div className="card h-100 shadow-sm">
                    <img
                      src={p.image || "/placeholder.png"}
                      className="card-img-top"
                      alt={`${p.title} – günstig kaufen`}
                      loading={i < 6 ? "eager" : "lazy"}
                      fetchPriority={i < 3 ? "high" : "auto"}
                      width={300}
                      height={150}
                      style={{ objectFit: "cover", height: 150 }}
                      onError={`this.src='/placeholder.png'`}
                    />
                    <div className="card-body p-2">
                      <h3 className="h6 text-truncate mb-1" title={p.title}>{p.title}</h3>
                      {p.vendor && <p className="small text-muted mb-1">{p.vendor}</p>}
                      <p className="fw-bold mb-1" style={{ color: "var(--pg-blue)" }}>
                        {new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(p.price)}
                      </p>
                      <a
                        href={p.url}
                        target="_blank"
                        rel="noopener sponsored"
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
              <a href="/">Alle Produkte durchsuchen →</a>
            </p>
          </>
        ) : (
          <p className="text-muted py-5 text-center">
            Aktuell keine Produkte in dieser Kategorie verfügbar.{" "}
            <a href="/">Zum Preisvergleich</a>
          </p>
        )}

        {/* SEO text block — keyword content for thin categories */}
        <section className="mt-5 pt-4 border-top">
          <div className="row">
            <div className="col-12 col-md-8">
              <h2 className="h5 fw-bold">{category.name} günstig kaufen – Preisvergleich</h2>
              <p className="text-muted small">
                Auf Preisgucken.de vergleichen Sie die Preise für <strong>{category.name}</strong> aus
                hunderten deutschen Online-Shops. Unsere Preissuchmaschine zeigt Ihnen tagesaktuelle
                Preise, damit Sie immer das günstigste Angebot finden – kostenlos und ohne Anmeldung.
              </p>
              <p className="text-muted small">
                Alle Preise verstehen sich inkl. MwSt. Preise können sich seit der letzten
                Aktualisierung geändert haben. Bitte prüfen Sie den aktuellen Preis beim
                jeweiligen Händler vor dem Kauf.
              </p>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
