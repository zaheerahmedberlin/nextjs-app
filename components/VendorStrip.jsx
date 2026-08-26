"use client";

const VENDORS = [
  { name: "DeubaXXL",          logo: "/vendors/deubaxl.webp",       filter: "DeubaXXL" },
  { name: "Nutrientify",       logo: "/vendors/nutrientify.png",    filter: "Nutrientify" },
  { name: "Life Extension",    logo: "/vendors/lifeextension.png",  filter: "Life Extension DACH" },
  { name: "Dowinx",            logo: "/vendors/dowinx.png",         filter: "Dowinx" },
  { name: "BlazeVideo",        logo: "/vendors/blazevideo.png",     filter: "BlazeVideo DE" },
  { name: "GERMENS",           logo: "/vendors/germens.png",        filter: "GERMENS DE" },
  { name: "Acer",              logo: "/vendors/acer.png",           filter: "Acer DE" },
  { name: "babymarkt",         logo: "/vendors/babymarkt.svg",      filter: "babymarkt DE" },
  { name: "Kohl",              logo: "/vendors/kohl.svg",           filter: "Kohl DE" },
];

export default function VendorStrip() {
  return (
    <section className="py-4 border-top" style={{ background: "#f8f9fa" }}>
      <div className="container">
        <p
          className="text-center text-muted fw-semibold mb-3"
          style={{ letterSpacing: "0.06em", textTransform: "uppercase", fontSize: "0.7rem" }}
        >
          Unsere offiziellen Partner
        </p>
        <div className="d-flex flex-wrap justify-content-center align-items-center gap-4">
          {VENDORS.map((v) => (
            <a
              key={v.name}
              href={`/?vendor=${encodeURIComponent(v.filter)}`}
              title={`${v.name} Angebote auf Preisgucken.de`}
              className="text-decoration-none"
              style={{ opacity: 0.7, transition: "opacity 0.2s" }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = 1)}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = 0.7)}
            >
              <img
                src={v.logo}
                alt={v.name}
                style={{ height: 36, maxWidth: 120, objectFit: "contain", filter: "grayscale(20%)" }}
              />
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
