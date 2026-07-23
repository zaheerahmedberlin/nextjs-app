import { NextResponse } from "next/server";
import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import { writeFile, mkdir, readFile, unlink } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { createCanvas, loadImage } from "canvas";

ffmpeg.setFfmpegPath(ffmpegStatic);

// Draw a single frame as PNG using canvas
async function drawFrame(type, data, width, height) {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  const blue = "#1A3A6B";
  const orange = "#F5A623";
  const darkBlue = "#0d2347";
  const red = "#e63946";

  const centerX = width / 2;

  if (type === "product") {
    // Dark gradient background
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, blue);
    grad.addColorStop(1, darkBlue);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Product image
    try {
      const img = await loadImage(data.image);
      const imgSize = 400;
      const imgX = centerX - imgSize / 2;
      const imgY = height * 0.2;
      // White rounded card behind image
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      roundRect(ctx, imgX - 20, imgY - 20, imgSize + 40, imgSize + 40, 24);
      ctx.fill();
      ctx.drawImage(img, imgX, imgY, imgSize, imgSize);
    } catch {}

    // Product title
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 52px sans-serif";
    ctx.textAlign = "center";
    wrapText(ctx, data.title, centerX, height * 0.75, width - 80, 64);

  } else if (type === "price") {
    ctx.fillStyle = darkBlue;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = "52px sans-serif";
    ctx.textAlign = "center";
    if (data.old_price) {
      ctx.fillText(`€${parseFloat(data.old_price).toFixed(2)}`, centerX, height * 0.35);
      // strikethrough
      ctx.strokeStyle = "rgba(255,255,255,0.4)";
      ctx.lineWidth = 4;
      const w = ctx.measureText(`€${parseFloat(data.old_price).toFixed(2)}`).width;
      ctx.beginPath();
      ctx.moveTo(centerX - w / 2, height * 0.35 - 8);
      ctx.lineTo(centerX + w / 2, height * 0.35 - 8);
      ctx.stroke();
    }

    // Big price
    ctx.fillStyle = orange;
    ctx.font = "bold 130px sans-serif";
    ctx.fillText(`€${parseFloat(data.price).toFixed(0)}`, centerX, height * 0.55);

    // Discount badge
    if (data.discount) {
      ctx.fillStyle = red;
      roundRect(ctx, centerX - 120, height * 0.62, 240, 70, 35);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 44px sans-serif";
      ctx.fillText(`-${data.discount}% RABATT`, centerX, height * 0.62 + 48);
    }

    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "38px sans-serif";
    ctx.fillText("Jetzt nur noch", centerX, height * 0.25);

  } else if (type === "brand") {
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, blue);
    grad.addColorStop(1, darkBlue);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Circle
    ctx.fillStyle = "rgba(245,166,35,0.15)";
    ctx.beginPath();
    ctx.arc(centerX, height * 0.35, 160, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = orange;
    ctx.lineWidth = 6;
    ctx.stroke();

    // Magnifier emoji via text
    ctx.font = "120px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("🔍", centerX, height * 0.35 + 44);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 72px sans-serif";
    ctx.fillText("preisgucken.de", centerX, height * 0.62);

    ctx.fillStyle = orange;
    ctx.font = "bold 48px sans-serif";
    ctx.fillText("Link in Bio ⬆️", centerX, height * 0.72);

    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "38px sans-serif";
    ctx.fillText("Täglich neue Deals aus Deutschland", centerX, height * 0.82);

  } else if (type === "cta") {
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, blue);
    grad.addColorStop(1, "#0a1a3d");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    ctx.font = "110px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("💸", centerX, height * 0.3);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 68px sans-serif";
    wrapText(ctx, "Nie wieder zu viel bezahlen!", centerX, height * 0.5, width - 80, 80);

    // Orange button
    ctx.fillStyle = orange;
    roundRect(ctx, centerX - 260, height * 0.68, 520, 90, 45);
    ctx.fill();
    ctx.fillStyle = blue;
    ctx.font = "bold 52px sans-serif";
    ctx.fillText("Jetzt vergleichen →", centerX, height * 0.68 + 60);

    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "38px sans-serif";
    ctx.fillText("preisgucken.de", centerX, height * 0.85);
  }

  return canvas.toBuffer("image/png");
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(" ");
  let line = "";
  let currentY = y;
  for (const word of words) {
    const test = line + word + " ";
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line.trim(), x, currentY);
      line = word + " ";
      currentY += lineHeight;
    } else {
      line = test;
    }
  }
  ctx.fillText(line.trim(), x, currentY);
}

export async function POST(request) {
  const { title, price, old_price, image } = await request.json();
  if (!title || !price) {
    return NextResponse.json({ error: "title and price required" }, { status: 400 });
  }

  const discount = old_price
    ? Math.round((1 - parseFloat(price) / parseFloat(old_price)) * 100)
    : null;

  const W = 1080;
  const H = 1920;
  const dir = join(tmpdir(), `pg-video-${Date.now()}`);
  await mkdir(dir, { recursive: true });

  // Generate 4 frames
  const frames = [
    { type: "product", duration: 3, data: { title, price, old_price, image } },
    { type: "price",   duration: 3, data: { price, old_price, discount } },
    { type: "brand",   duration: 3, data: {} },
    { type: "cta",     duration: 3, data: {} },
  ];

  const framePaths = [];
  for (let i = 0; i < frames.length; i++) {
    const f = frames[i];
    const buf = await drawFrame(f.type, f.data, W, H);
    const p = join(dir, `frame${i}.png`);
    await writeFile(p, buf);
    framePaths.push({ path: p, duration: f.duration });
  }

  // Build concat input file
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
        "-vf scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black",
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

  return new NextResponse(videoBuffer, {
    headers: {
      "Content-Type": "video/mp4",
      "Content-Disposition": `attachment; filename="preisgucken-promo.mp4"`,
    },
  });
}
