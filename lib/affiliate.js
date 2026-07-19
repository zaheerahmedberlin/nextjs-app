const AWIN_PUBLISHER_ID = "2988023";

const AWIN_MERCHANTS = {
  nutrientify: "125708",
  deubaxl: "19030",
  lifeextension: "81049",
};

const VENDOR_MERCHANT_MAP = {
  Nutrientify: "nutrientify",
  DeubaXXL: "deubaxl",
  "Life Extension DACH": "lifeextension",
};

export function buildAffiliateUrl(productUrl, vendorName) {
  if (!productUrl) return "#";
  const key = VENDOR_MERCHANT_MAP[vendorName];
  if (!key) return productUrl;
  const merchantId = AWIN_MERCHANTS[key];
  return `https://www.awin1.com/cread.php?awinmid=${merchantId}&awinaffid=${AWIN_PUBLISHER_ID}&ued=${encodeURIComponent(productUrl)}`;
}
