import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { MAX_NOTES_LENGTH } from "@/lib/analysis";
import { MAX_DURATION_SEC, MAX_FILE_BYTES, MAX_FILE_MB, THUMBNAIL_MAX_BYTES, geminiVideoType } from "@/lib/config";
import { failAnalysis, reserveAnalysis } from "@/lib/server/analyses";
import { createUploadSession } from "@/lib/server/gemini";
import { jsonError } from "@/lib/server/http";
import { QUOTA_LIMITS } from "@/lib/server/quota";
import { userFromRequest } from "@/lib/server/session";

const CreateAnalysis = z.object({
  name: z.string().min(1).max(255),
  type: z.string().max(100).default(""),
  size: z
    .number()
    .int()
    .positive()
    .max(MAX_FILE_BYTES, { error: `Videos must be under ${MAX_FILE_MB} MB.` }),
  duration: z
    .number()
    .positive()
    .max(MAX_DURATION_SEC + 1, { error: `Please trim your video to ${MAX_DURATION_SEC} seconds or less.` })
    .nullish(),
  notes: z
    .string()
    .trim()
    .max(MAX_NOTES_LENGTH, { error: `Keep your note under ${MAX_NOTES_LENGTH} characters.` })
    .nullish(),
  // A small JPEG frame from the video, base64-encoded.
  thumbnail: z.base64().max(Math.ceil((THUMBNAIL_MAX_BYTES * 4) / 3) + 4).nullish(),
});

/**
 * Step 1 of an analysis: check the quota, record a pending analysis and hand
 * the browser a one-time URL to upload its video to.
 */
export async function POST(request: NextRequest) {
  const user = await userFromRequest(request);
  if (!user) return jsonError("Please sign in to analyze a video.", 401);

  const parsed = CreateAnalysis.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const friendly = issue && ["size", "duration", "notes"].includes(String(issue.path[0]));
    return jsonError(friendly ? issue.message : "Invalid request.", 400);
  }
  const input = parsed.data;

  const mimeType = geminiVideoType(input.type, input.name);
  if (!mimeType) {
    return jsonError("That file type isn't supported. Use an MP4, MOV or WebM video.", 400);
  }

  const id = crypto.randomUUID();
  const geminiFile = `files/${id}`;
  const reserved = await reserveAnalysis(
    {
      id,
      userId: user.id,
      geminiFile,
      videoName: input.name,
      videoBytes: input.size,
      videoSeconds: input.duration ?? null,
      notes: input.notes || null,
      thumbnail: decodeJpeg(input.thumbnail),
    },
    QUOTA_LIMITS,
  );

  if (!reserved.ok) {
    if (reserved.reason === "global-limit") {
      return jsonError("The coach has reached its limit for today. Please try again tomorrow.", 429, {
        headers: { "Retry-After": String(60 * 60) },
      });
    }
    const retryAfterSec = reserved.retryAt ? Math.max(1, Math.ceil((reserved.retryAt.getTime() - Date.now()) / 1000)) : 3600;
    const wait = retryAfterSec >= 3600 ? `${Math.ceil(retryAfterSec / 3600)} h` : `${Math.ceil(retryAfterSec / 60)} min`;
    return jsonError(
      `You've used all ${QUOTA_LIMITS.perUser} analyses for the last 24 hours. Your next one frees up in about ${wait}.`,
      429,
      { headers: { "Retry-After": String(retryAfterSec) } },
    );
  }

  try {
    const uploadUrl = await createUploadSession({
      name: geminiFile,
      bytes: input.size,
      mimeType,
      origin: request.headers.get("origin"),
    });
    return NextResponse.json({ id, uploadUrl }, { status: 201 });
  } catch (error) {
    console.error("Upload session error:", error);
    await failAnalysis(id, "Couldn't create the upload session.");
    return jsonError("Couldn't start the upload. Please try again.", 502);
  }
}

/** Decodes the thumbnail and keeps it only if it really is a JPEG. */
function decodeJpeg(base64: string | null | undefined): Uint8Array | null {
  if (!base64) return null;
  const bytes = Buffer.from(base64, "base64");
  const isJpeg = bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  return isJpeg && bytes.length <= THUMBNAIL_MAX_BYTES ? new Uint8Array(bytes) : null;
}
