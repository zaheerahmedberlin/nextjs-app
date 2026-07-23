import { NextResponse } from "next/server";
import ffmpeg from "fluent-ffmpeg";
import sharp from "sharp";
import { writeFile, mkdir, readFile, unlink, rmdir } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

// Use system ffmpeg (installed via nixpacks.toml on Railway)
// falls back to ffmpeg-static for local dev
let ffmpegPath = "ffmpeg";
try {
  const { default: ffmpegStatic } = await import("ffmpeg-static");
  if (ffmpegStatic) ffmpegPath = ffmpegStatic;
} catch {}
ffmpeg.setFfmpegPath(ffmpegPath);

const W = 1080;
const H = 1920;
const BLUE = "#1A3A6B";
const DARK_BLUE = "#0d2347";
const ORANGE = "#F5A623";
const RED = "#e63946";

function svgText(lines, opts = {}) {
  const {
    y = H / 2, fontSize = 64, color = "#ffffff", weight = "bold", anchor = "middle",
  } = opts;
  return lines.map((line, i) =>
    `<text x="${W / 2}" y="${y + i * (fontSize * 1.3)}" font-size="${fontSize}" font-weight="${weight}" fill="${color}" text-anchor="${anchor}" font-family="Arial, sans-serif">${line}</text>`
  ).join("\n");
}

function badge(text, cx, cy, rx = 180, ry = 45, bgColor = RED) {
  return `
    <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${bgColor}"/>
    <text x="${cx}" y="${cy + 16}" font-size="44" font-weight="bold" fill="white" text-anchor="middle" font-family="Arial, sans-serif">${text}</text>`;
}

async function makeFrame(svgContent) {
  const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg1" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${BLUE}"/>
        <stop offset="100%" stop-color="${DARK_BLUE}"/>
      </linearGradient>
    </defs>
    ${svgContent}
  </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function frame1Product(title, imageUrl) {
  // Try to download product image
  let productImg = "";
  try {
    const res = await fetch(imageUrl, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const imgBuf = Buffer.from(await res.arrayBuffer());
      const resized = await sharp(imgBuf).resize(600, 600, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } }).png().toBuffer();
      productImg = `<image href="data:image/png;base64,${resized.toString("base64")}" x="240" y="280" width="600" height="600"/>`;
    }
  } catch {}

  const titleLines = title.length > 30
    ? [title.slice(0, 30), title.slice(30, 60)]
    : [title];

  return makeFrame(`
    <rect width="${W}" height="${H}" fill="url(#bg1)"/>
    <rect x="190" y="220" width="700" height="720" rx="32" fill="rgba(255,255,255,0.08)"/>
    ${productImg}
    <text x="${W/2}" y="1080" font-size="28" fill="rgba(255,255,255,0.5)" text-anchor="middle" font-family="Arial, sans-serif">🔥 Heute günstig</text>
    ${svgText(titleLines, { y: 1150, fontSize: 60, color: "#ffffff" })}
  `);
}

async function frame2Price(price, oldPrice, discount) {
  const priceFormatted = `€${parseFloat(price).toFixed(2).replace(".", ",")}`;
  const oldFormatted = oldPrice ? `€${parseFloat(oldPrice).toFixed(2).replace(".", ",")}` : "";

  return makeFrame(`
    <rect width="${W}" height="${H}" fill="${DARK_BLUE}"/>
    <text x="${W/2}" y="560" font-size="52" fill="rgba(255,255,255,0.5)" text-anchor="middle" font-family="Arial, sans-serif">Jetzt nur noch</text>
    ${oldFormatted ? `
      <text x="${W/2}" y="720" font-size="72" fill="rgba(255,255,255,0.35)" text-anchor="middle" font-family="Arial, sans-serif" text-decoration="line-through">${oldFormatted}</text>
      <line x1="${W/2 - 160}" y1="690" x2="${W/2 + 160}" y2="690" stroke="rgba(255,255,255,0.35)" stroke-width="5"/>
    ` : ""}
    <text x="${W/2}" y="1020" font-size="200" font-weight="900" fill="${ORANGE}" text-anchor="middle" font-family="Arial, sans-serif">${priceFormatted}</text>
    ${discount ? badge(`-${discount}% RABATT`, W/2, 1120, 240, 55, RED) : ""}
  `);
}

async function frame3Brand() {
  return makeFrame(`
    <rect width="${W}" height="${H}" fill="url(#bg1)"/>
    <circle cx="${W/2}" cy="760" r="200" fill="rgba(245,166,35,0.15)" stroke="${ORANGE}" stroke-width="8"/>
    <text x="${W/2}" y="820" font-size="160" text-anchor="middle">🔍</text>
    <text x="${W/2}" y="1080" font-size="88" font-weight="900" fill="white" text-anchor="middle" font-family="Arial, sans-serif">preisgucken.de</text>
    <text x="${W/2}" y="1200" font-size="60" font-weight="bold" fill="${ORANGE}" text-anchor="middle" font-family="Arial, sans-serif">Link in Bio ⬆️</text>
    <text x="${W/2}" y="1320" font-size="44" fill="rgba(255,255,255,0.5)" text-anchor="middle" font-family="Arial, sans-serif">Täglich neue Deals aus Deutschland</text>
  `);
}

async function frame4CTA() {
  return makeFrame(`
    <rect width="${W}" height="${H}" fill="${DARK_BLUE}"/>
    <text x="${W/2}" y="680" font-size="180" text-anchor="middle">💸</text>
    <text x="${W/2}" y="900" font-size="88" font-weight="900" fill="white" text-anchor="middle" font-family="Arial, sans-serif">Nie wieder zu</text>
    <text x="${W/2}" y="1010" font-size="88" font-weight="900" fill="${ORANGE}" text-anchor="middle" font-family="Arial, sans-serif">viel bezahlen!</text>
    <rect x="190" y="1100" width="700" height="110" rx="55" fill="${ORANGE}"/>
    <text x="${W/2}" y="1170" font-size="56" font-weight="bold" fill="${BLUE}" text-anchor="middle" font-family="Arial, sans-serif">Jetzt vergleichen →</text>
    <text x="${W/2}" y="1360" font-size="52" fill="rgba(255,255,255,0.5)" text-anchor="middle" font-family="Arial, sans-serif">preisgucken.de</text>
  `);
}

export async function POST(request) {
  const { title, price, old_price, image } = await request.json();
  if (!title || !price) {
    return NextResponse.json({ error: "title and price required" }, { status: 400 });
  }

  const discount = old_price
    ? Math.round((1 - parseFloat(price) / parseFloat(old_price)) * 100)
    : null;

  const dir = join(tmpdir(), `pg-video-${Date.now()}`);
  await mkdir(dir, { recursive: true });

  try {
    const [f1, f2, f3, f4] = await Promise.all([
      frame1Product(title, image),
      frame2Price(price, old_price, discount),
      frame3Brand(),
      frame4CTA(),
    ]);

    const frames = [
      { buf: f1, duration: 3 },
      { buf: f2, duration: 3 },
      { buf: f3, duration: 3 },
      { buf: f4, duration: 3 },
    ];

    const framePaths = [];
    for (let i = 0; i < frames.length; i++) {
      const p = join(dir, `frame${i}.png`);
      await writeFile(p, frames[i].buf);
      framePaths.push({ path: p, duration: frames[i].duration });
    }

    const concatFile = join(dir, "concat.txt");
    const concatContent = framePaths.map(f => `file '${f.path}'\nduration ${f.duration}`).join("\n")
      + `\nfile '${framePaths[framePaths.length - 1].path}'`;
    await writeFile(concatFile, concatContent);

    const outputPath = join(dir, "output.mp4");

    await new Promise((resolve, reject) => {
      ffmpeg()
        .input(concatFile)
        .inputOptions(["-f concat", "-safe 0"])
        .videoCodec("libx264")
        .outputOptions([
          "-pix_fmt yuv420p",
          "-r 30",
          "-movflags +faststart",
        ])
        .output(outputPath)
        .on("end", resolve)
        .on("error", reject)
        .run();
    });

    const videoBuffer = await readFile(outputPath);

    // Cleanup
    for (const f of framePaths) unlink(f.path).catch(() => {});
    unlink(concatFile).catch(() => {});
    unlink(outputPath).catch(() => {});
    rmdir(dir).catch(() => {});

    return new NextResponse(videoBuffer, {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": `attachment; filename="preisgucken-promo.mp4"`,
      },
    });
  } catch (err) {
    console.error("Video generation error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
