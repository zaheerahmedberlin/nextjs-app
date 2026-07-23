import { NextResponse } from "next/server";
import { execSync } from "child_process";

export async function GET() {
  try {
    const which = execSync("which ffmpeg 2>/dev/null || echo 'not found'").toString().trim();
    const version = execSync("ffmpeg -version 2>&1 | head -1 || echo 'failed'").toString().trim();
    return NextResponse.json({ which, version });
  } catch (err) {
    return NextResponse.json({ error: String(err) });
  }
}
