import { NextRequest, NextResponse } from "next/server";
import { MAX_FILE_BYTES, MAX_FILE_MB, geminiVideoType } from "@/lib/config";
import { createUploadSession } from "@/lib/server/gemini";
import { clientIp, rateLimit } from "@/lib/server/rate-limit";

// Step 1 of an analysis: hand the browser a one-time URL to upload its video to.
export async function POST(request: NextRequest) {
  const limit = rateLimit(`upload:${clientIp(request)}`, 10, 60 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: `You've hit the hourly limit. Try again in ${Math.ceil(limit.retryAfterSec / 60)} min.` },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }

  const body = await request.json().catch(() => null);
  const size = Number(body?.size);
  const mimeType = geminiVideoType(String(body?.type ?? ""), String(body?.name ?? ""));

  if (!mimeType) {
    return NextResponse.json({ error: "That file type isn't supported. Use an MP4, MOV or WebM video." }, { status: 400 });
  }
  if (!Number.isInteger(size) || size <= 0 || size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: `Videos must be under ${MAX_FILE_MB} MB.` }, { status: 400 });
  }

  try {
    const uploadUrl = await createUploadSession({ bytes: size, mimeType, origin: request.headers.get("origin") });
    return NextResponse.json({ uploadUrl });
  } catch (error) {
    console.error("Upload session error:", error);
    return NextResponse.json({ error: "Couldn't start the upload. Please try again." }, { status: 502 });
  }
}
