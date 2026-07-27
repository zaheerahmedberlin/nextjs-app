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

            return (
              <a
                key={vendor.id}
                href={`/?vendor=${encodeURIComponent(vendor.name)}`}
                title={`${vendor.name} Angebote auf Preisgucken.de`}
                className="text-decoration-none"
                style={{ opacity: 0.75, transition: "opacity 0.2s" }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = 1)}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = 0.75)}
              >
                {logoSrc ? (
                  <img
                    src={logoSrc}
                    alt={vendor.name}
                    title={vendor.name}
                    style={{ height: 32, maxWidth: 110, objectFit: "contain", filter: "grayscale(30%)" }}
                    onError={(e) => {
                      // fallback to text badge if logo fails
                      e.currentTarget.outerHTML = `<span style="font-size:13px;font-weight:600;color:#1A3A6B;padding:4px 10px;border:1px solid #1A3A6B;border-radius:4px">${vendor.name}</span>`;
                    }}
                  />
                ) : (
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "#1A3A6B", padding: "4px 10px", border: "1px solid #1A3A6B", borderRadius: 4 }}>
                    {vendor.name}
                  </span>
                )}
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}
