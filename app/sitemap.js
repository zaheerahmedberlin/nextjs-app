// app/sitemap.js
// Next.js auto-generates /sitemap.xml from this file.
// Google uses this to discover and prioritise your pages.

const BASE_URL = "https://www.preisgucken.de";

export default async function sitemap() {
  // Static pages
  const staticPages = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: "daily", priority: 1.0 },
    { url: `${BASE_URL}/ueber-uns`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE_URL}/so-funktioniert-es`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/kontakt`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.4 },
    { url: `${BASE_URL}/impressum`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/datenschutz`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
  ];

  // Category pages — ideally fetched from your categories.txt / API
  const categories = [
    "elektronik", "smartphones", "laptops-computer", "tv-audio",
    "haushaltsgeraete", "moebelwohnen", "mode-bekleidung", "sport-freizeit",
  ];

  const categoryPages = categories.map((cat) => ({
    url: `${BASE_URL}/kategorie/${cat}`,
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: 0.8,
  }));

  return [...staticPages, ...categoryPages];
}
