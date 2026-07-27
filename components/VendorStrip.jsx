"use client";
import { useEffect, useState } from "react";

export default function VendorStrip() {
  const [vendors, setVendors] = useState([]);

  useEffect(() => {
    fetch("/api/vendor/list")
      .then((r) => r.json())
      .then((data) => setVendors(data.vendors || []))
      .catch(() => {});
  }, []);

  if (!vendors.length) return null;

  return (
    <section className="py-4 border-top border-bottom" style={{ background: "#f8f9fa" }}>
      <div className="container">
        <p className="text-center text-muted small fw-semibold mb-3" style={{ letterSpacing: "0.05em", textTransform: "uppercase", fontSize: "0.75rem" }}>
          Unsere offiziellen Partner
        </p>
        <div className="d-flex flex-wrap justify-content-center align-items-center gap-4">
          {vendors.map((vendor) => {
            const domain = vendor.website_url
              ? vendor.website_url.replace(/https?:\/\/(www\.)?/, "").replace(/\/$/, "")
              : null;
            const logoSrc = vendor.logo_url || (domain ? `https://logo.clearbit.com/${domain}` : null);

            if (!logoSrc) return null;

            return (
              <a
                key={vendor.id}
                href={`/?vendor=${encodeURIComponent(vendor.name)}`}
                title={`${vendor.name} Angebote auf Preisgucken.de`}
                style={{ opacity: 0.75, transition: "opacity 0.2s" }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = 1)}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = 0.75)}
              >
                <img
                  src={logoSrc}
                  alt={vendor.name}
                  title={vendor.name}
                  style={{ height: 32, maxWidth: 100, objectFit: "contain", filter: "grayscale(30%)" }}
                  onError={(e) => { e.currentTarget.closest("a").style.display = "none"; }}
                />
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}
