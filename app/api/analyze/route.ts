import { NextRequest, NextResponse } from "next/server";
import { ApiError, FileState, createPartFromUri, type File as GeminiFile } from "@google/genai";
import { ANALYSIS_PROMPT, ANALYSIS_SCHEMA, SYSTEM_INSTRUCTION, parseAnalysis, type Analysis } from "@/lib/analysis";
import { MAX_DURATION_SEC, MAX_FILE_BYTES } from "@/lib/config";
import { GEMINI_MODELS, gemini } from "@/lib/server/gemini";
import { clientIp, rateLimit } from "@/lib/server/rate-limit";

// Processing + analysis (with model fallbacks) can take a while. 300s is the Vercel Hobby maximum.
export const maxDuration = 300;

const PROCESSING_TIMEOUT_MS = 60_000;
const MODEL_TIMEOUT_MS = 60_000; // per model attempt; an overloaded model can hang instead of failing
const NO_NEW_ATTEMPTS_AFTER_MS = 180_000;
// Gemini samples 1 frame/sec by default. Lifts are fast, so sample a bit more often.
const FRAMES_PER_SECOND = 2;

class UserFacingError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

// Step 2 of an analysis: the browser has uploaded its video to Gemini; analyze it.
export async function POST(request: NextRequest) {
  const limit = rateLimit(`analyze:${clientIp(request)}`, 10, 60 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: `You've hit the hourly limit. Try again in ${Math.ceil(limit.retryAfterSec / 60)} min.` },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }

  const body = await request.json().catch(() => null);
  const fileName = String(body?.fileName ?? "");
  if (!/^files\/[a-z0-9-]{1,40}$/.test(fileName)) {
    return NextResponse.json({ error: "Missing or invalid video reference." }, { status: 400 });
  }

  const started = Date.now();
  try {
    const file = await waitUntilActive(fileName);
    checkLimits(file);
    return NextResponse.json(await analyzeWithFallback(file, started));
  } catch (error) {
    if (error instanceof UserFacingError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Analysis error:", error);
    return NextResponse.json({ error: "Something went wrong while analyzing your video. Please try again." }, { status: 500 });
  } finally {
    // Don't keep people's videos around any longer than needed.
    await gemini()
      .files.delete({ name: fileName })
      .catch((e) => console.warn(`Couldn't delete ${fileName}:`, e?.message));
  }
}

async function waitUntilActive(name: string): Promise<GeminiFile> {
  const deadline = Date.now() + PROCESSING_TIMEOUT_MS;
  let file = await gemini()
    .files.get({ name })
    .catch((error) => {
      // Gemini answers 403 (not 404) for files that don't exist or were already deleted.
      if (error instanceof ApiError && (error.status === 403 || error.status === 404)) {
        throw new UserFacingError("We couldn't find your uploaded video. Please upload it again.", 404);
      }
      throw error;
    });

  while (file.state === FileState.PROCESSING) {
    if (Date.now() > deadline) {
      throw new UserFacingError("Processing your video took too long. Try a shorter clip.", 504);
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
    file = await gemini().files.get({ name });
  }

  if (file.state !== FileState.ACTIVE || !file.uri || !file.mimeType) {
    console.error("Video processing failed:", file.state, file.error);
    throw new UserFacingError("We couldn't read that video. Try recording it again as an MP4 or MOV.", 422);
  }
  return file;
}

function checkLimits(file: GeminiFile) {
  if (Number(file.sizeBytes) > MAX_FILE_BYTES) {
    throw new UserFacingError("That video is too large.", 400);
  }
  // e.g. { videoDuration: "12.5s" }
  const duration = parseFloat(String(file.videoMetadata?.videoDuration ?? ""));
  if (duration > MAX_DURATION_SEC + 1) {
    throw new UserFacingError(`Please trim your video to ${MAX_DURATION_SEC} seconds or less.`, 400);
  }
}

/** Tries each model in turn until one returns a valid analysis. */
async function analyzeWithFallback(file: GeminiFile, started: number): Promise<Analysis> {
  let sawBusy = false;

  for (const model of GEMINI_MODELS) {
    if (Date.now() - started > NO_NEW_ATTEMPTS_AFTER_MS) break;
    const attemptStart = Date.now();
    try {
      const response = await gemini().models.generateContent({
        model,
        contents: [
          { ...createPartFromUri(file.uri!, file.mimeType!), videoMetadata: { fps: FRAMES_PER_SECOND } },
          ANALYSIS_PROMPT,
        ],
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: "application/json",
          responseJsonSchema: ANALYSIS_SCHEMA,
          httpOptions: { timeout: MODEL_TIMEOUT_MS },
        },
      });
      if (!response.text) {
        throw new Error(`empty response (finish reason: ${response.candidates?.[0]?.finishReason ?? "unknown"})`);
      }
      const analysis = parseAnalysis(JSON.parse(response.text));
      console.log(`Analyzed ${file.name} with ${model} in ${((Date.now() - attemptStart) / 1000).toFixed(1)}s`);
      return analysis;
    } catch (error) {
      const transient = isTransient(error);
      sawBusy ||= transient;
      const reason = error instanceof ApiError ? `HTTP ${error.status}` : (error as Error)?.message;
      console.warn(`Model ${model} failed after ${((Date.now() - attemptStart) / 1000).toFixed(1)}s (${reason}); trying the next one.`);
    }
  }

  if (sawBusy) throw new UserFacingError("The coach is busy right now. Please try again in a minute.", 503);
  throw new Error(`All models failed: ${GEMINI_MODELS.join(", ")}`);
}

/** Overloaded, out of quota, or timed out: worth telling the user to try again shortly. */
function isTransient(error: unknown): boolean {
  if (error instanceof ApiError) return error.status === 429 || error.status >= 500;
  return error instanceof Error && error.name === "AbortError";
}
