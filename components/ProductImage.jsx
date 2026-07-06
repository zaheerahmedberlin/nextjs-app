"use client";
import { useState } from "react";

export default function ProductImage({ src, alt, height = 150 }) {
  const [broken, setBroken] = useState(false);

  if (!src || broken) {
    return (
      <div
        className="d-flex align-items-center justify-content-center bg-light card-img-top"
        style={{ height }}
      >
        <i className="bi bi-box-seam text-secondary" style={{ fontSize: height > 120 ? "3rem" : "2rem" }}></i>
      </div>
    );
  }

  return (
    <img
      src={src}
      className="card-img-top"
      alt={alt}
      onError={() => setBroken(true)}
      style={{ height, objectFit: "cover" }}
    />
  );
}
