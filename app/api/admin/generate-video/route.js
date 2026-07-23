import { NextResponse } from "next/server";
import ffmpeg from "fluent-ffmpeg";
import sharp from "sharp";
import { writeFile, mkdir, readFile, unlink, rmdir } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

ffmpeg.setFfmpegPath(process.env.FFMPEG_BIN ?? "/root/.nix-profile/bin/ffmpeg");

const W = 1080;
const H = 1920;
const BLUE = "#1A3A6B";
const DARK_BLUE = "#0d2347";
const ORANGE = "#F5A623";
const RED = "#e63946";
const FONT = "Liberation Sans,DejaVu Sans,Arial,sans-serif";

function txt(content, x, y, opts = {}) {
  const { fontSize = 60, fill = "#ffffff", weight = "normal", anchor = "middle", opacity = 1 } = opts;
  const opacityAttr = opacity < 1 ? ` fill-opacity="${opacity}"` : "";
  return `<text x="${x}" y="${y}" font-size="${fontSize}" font-weight="${weight}" fill="${fill}"${opacityAttr} text-anchor="${anchor}" font-family="${FONT}">${content}</text>`;
}

function badge(text, cx, cy, rx = 180, ry = 45, bgColor = RED) {
  return `
    <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${bgColor}"/>
    ${txt(text, cx, cy + 16, { fontSize: 44, fill: "white", weight: "bold" })}`;
}

async function makeFrame(svgContent) {
  const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
    <defs>
      <linearGradient id="bg1" x1="0" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox">
        <stop offset="0%" stop-color="${BLUE}"/>
        <stop offset="100%" stop-color="${DARK_BLUE}"/>
      </linearGradient>
    </defs>
    ${svgContent}
  </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function frame1Product(title, imageUrl) {
  let productImg = "";
  try {
    const res = await fetch(imageUrl, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const imgBuf = Buffer.from(await res.arrayBuffer());
      const resized = await sharp(imgBuf)
        .resize(600, 600, { fit: "contain", background: { r: 26, g: 58, b: 107, alpha: 1 } })
        .png()
        .toBuffer();
      productImg = `<image xlink:href="data:image/png;base64,${resized.toString("base64")}" x="240" y="280" width="600" height="600"/>`;
    }
  } catch {}

  const titleLines = title.length > 28
    ? [title.slice(0, 28), title.slice(28, 56)]
    : [title];

  return makeFrame(`
    <rect width="${W}" height="${H}" fill="url(#bg1)"/>
    <rect x="190" y="220" width="700" height="720" rx="32" fill="white" fill-opacity="0.08"/>
    ${productImg}
    ${txt("Heute guenstig", W / 2, 1080, { fontSize: 36, fill: "#ffffff", opacity: 0.5 })}
    ${titleLines.map((line, i) => txt(line, W / 2, 1160 + i * 80, { fontSize: 58, fill: "#ffffff", weight: "bold" })).join("\n")}
  `);
}

async function frame2Price(price, oldPrice, discount) {
  const priceFormatted = `EUR ${parseFloat(price).toFixed(2).replace(".", ",")}`;
  const oldFormatted = oldPrice ? `EUR ${parseFloat(oldPrice).toFixed(2).replace(".", ",")}` : "";

  return makeFrame(`
    <rect width="${W}" height="${H}" fill="${DARK_BLUE}"/>
    ${txt("Jetzt nur noch", W / 2, 560, { fontSize: 52, fill: "#ffffff", opacity: 0.5 })}
    ${oldFormatted ? `
      ${txt(oldFormatted, W / 2, 720, { fontSize: 72, fill: "#ffffff", opacity: 0.35 })}
      <line x1="${W / 2 - 200}" y1="695" x2="${W / 2 + 200}" y2="695" stroke="white" stroke-opacity="0.35" stroke-width="6"/>
    ` : ""}
    ${txt(priceFormatted, W / 2, 1020, { fontSize: 120, fill: ORANGE, weight: "900" })}
    ${discount ? badge(`-${discount}% RABATT`, W / 2, 1160, 240, 55, RED) : ""}
  `);
}

async function frame3Brand() {
  const cx = W / 2, cy = 720, r = 120, stroke = 24;
  const hx1 = cx + r * 0.72, hy1 = cy + r * 0.72;
  const hx2 = hx1 + 85, hy2 = hy1 + 85;
  return makeFrame(`
    <rect width="${W}" height="${H}" fill="url(#bg1)"/>
    <circle cx="${cx}" cy="${cy}" r="210" fill="${ORANGE}" fill-opacity="0.12" stroke="${ORANGE}" stroke-width="6"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="white" stroke-width="${stroke}"/>
    <line x1="${hx1}" y1="${hy1}" x2="${hx2}" y2="${hy2}" stroke="white" stroke-width="${stroke}" stroke-linecap="round"/>
    ${txt("preisgucken.de", W / 2, 1080, { fontSize: 88, fill: "#ffffff", weight: "900" })}
    ${txt("Link in Bio", W / 2, 1200, { fontSize: 60, fill: ORANGE, weight: "bold" })}
    ${txt("Taeglich neue Deals", W / 2, 1320, { fontSize: 44, fill: "#ffffff", opacity: 0.5 })}
  `);
}

async function frame4CTA() {
  const cx = W / 2, cy = 580;
  return makeFrame(`
    <rect width="${W}" height="${H}" fill="${DARK_BLUE}"/>
    <circle cx="${cx}" cy="${cy}" r="160" fill="${ORANGE}"/>
    ${txt("EUR", cx, cy - 20, { fontSize: 64, fill: DARK_BLUE, weight: "900" })}
    ${txt("DEAL", cx, cy + 60, { fontSize: 64, fill: DARK_BLUE, weight: "900" })}
    ${txt("Nie wieder zu", W / 2, 900, { fontSize: 88, fill: "#ffffff", weight: "900" })}
    ${txt("viel bezahlen!", W / 2, 1010, { fontSize: 88, fill: ORANGE, weight: "900" })}
    <rect x="190" y="1100" width="700" height="110" rx="55" fill="${ORANGE}"/>
    ${txt("Jetzt vergleichen", W / 2, 1168, { fontSize: 54, fill: BLUE, weight: "bold" })}
    ${txt("preisgucken.de", W / 2, 1360, { fontSize: 52, fill: "#ffffff", opacity: 0.5 })}
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
        .outputOptions(["-pix_fmt yuv420p", "-r 30", "-movflags +faststart"])
        .output(outputPath)
        .on("end", resolve)
        .on("error", reject)
        .run();
    });

    const videoBuffer = await readFile(outputPath);

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
