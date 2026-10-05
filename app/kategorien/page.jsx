// app/kategorien/page.jsx
// Server-rendered directory of every category that has products. Gives Google
// (and visitors) plain <a href> links to the whole category tree: the homepage
// sidebar uses buttons, so before this page the only crawl path to the ~200
// category pages was the sitemap.
import { query } from "@/lib/db";
import { buildCategoryTree } from "@/lib/categoryTree";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const BASE_URL = "https://www.preisgucken.de";
export const revalidate = 3600;

export const metadata = {
  title: "Alle Kategorien im Preisvergleich",
  description:
    "Alle Produktkategorien im Überblick: Elektronik, Werkzeug, Möbel, Mode und mehr. Preise aus deutschen Online-Shops vergleichen und das günstigste Angebot finden.",
  alternates: { canonical: `${BASE_URL}/kategorien` },
};

const fmt = (n) => n.toLocaleString("de-DE");

function CategoryList({ nodes, depth = 0 }) {
  const visible = nodes.filter((n) => n.productCount > 0);
  if (!visible.length) return null;
  return (
    <ul className={depth === 0 ? "list-unstyled mb-0" : "list-unstyled ms-3 mb-0 small"}>
      {visible.map((n) => (
        <li key={n.id} className="mb-1">
          <a href={`/kategorie/${n.slug}`} className="text-decoration-none">
            {n.name}
          </a>{" "}
          <span className="text-muted">({fmt(n.productCount)})</span>
          {depth < 2 && <CategoryList nodes={n.children} depth={depth + 1} />}
        </li>
      ))}
    </ul>
  );
}

export default async function KategorienPage() {
  const res = await query(
    `SELECT c.id, c.slug, c.name, c.parent_id, c.sort_order, COUNT(p.id)::int AS product_count
     FROM categories c
     LEFT JOIN products p ON p.category_id = c.id AND p.is_active = TRUE AND p.in_stock = TRUE
     WHERE c.is_active = TRUE AND c.slug <> 'sonstiges'
     GROUP BY c.id
     ORDER BY c.parent_id NULLS FIRST, c.sort_order, c.name`
  );
  const tree = buildCategoryTree(
    res.rows.map((r) => ({ id: r.id, slug: r.slug, name: r.name, parentId: r.parent_id, productCount: r.product_count }))
  ).filter((n) => n.productCount > 0);
  const total = tree.reduce((sum, n) => sum + n.productCount, 0);

  return (
    <>
      <Navbar />
      <header className="bg-light border-bottom py-4">
        <div className="container">
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb mb-2 small">
              <li className="breadcrumb-item"><a href="/">Startseite</a></li>
              <li className="breadcrumb-item active">Kategorien</li>
            </ol>
          </nav>
          <h1 className="brand-heading mb-1 fw-bold">Alle Kategorien im Preisvergleich</h1>
          <p className="text-muted mb-0">
            {fmt(total)} Angebote in {tree.length} Hauptkategorien aus deutschen Online-Shops – wähle eine Kategorie und vergleiche die Preise.
          </p>
        </div>
      </header>
      <main className="container py-4">
        <div className="row g-4">
          {tree.map((n) => (
            <section key={n.id} className="col-12 col-md-6 col-lg-4">
              <h2 className="h5 fw-bold">
                <a href={`/kategorie/${n.slug}`} className="text-decoration-none">{n.name}</a>{" "}
                <span className="text-muted fw-normal fs-6">({fmt(n.productCount)})</span>
              </h2>
              <CategoryList nodes={n.children} depth={1} />
            </section>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
