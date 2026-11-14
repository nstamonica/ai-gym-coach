// The coaching pipeline: wait for Gemini to process the upload, check it, then
// ask each model in turn for a structured form review.
import "server-only";
import { ApiError, FileState, createPartFromUri, type File as GeminiFile } from "@google/genai";
import { ANALYSIS_SCHEMA, SYSTEM_INSTRUCTION, buildPrompt, parseAnalysis, type Analysis, type SessionContext } from "@/lib/analysis";
import { MAX_DURATION_SEC, MAX_FILE_BYTES } from "@/lib/config";
import { UserFacingError } from "./errors";
import { GEMINI_MODELS, gemini } from "./gemini";

const PROCESSING_TIMEOUT_MS = 60_000;
const POLL_INTERVAL_MS = 2_000;
const MODEL_TIMEOUT_MS = 60_000; // per model attempt; an overloaded model can hang instead of failing
const NO_NEW_ATTEMPTS_AFTER_MS = 180_000; // leaves time to finish inside the route's maxDuration
// Gemini samples 1 frame/sec by default. Lifts are fast, so sample a bit more often.
const FRAMES_PER_SECOND = 2;

export interface CoachResult {
  analysis: Analysis;
  model: string;
  videoSeconds: number | null;
}

/** Analyzes an uploaded video. Throws UserFacingError for problems the user can act on. */
export async function coachVideo(
  fileName: string,
  { notes, history }: { notes?: string | null; history?: SessionContext[] } = {},
): Promise<CoachResult> {
  const started = Date.now();
  const file = await waitUntilActive(fileName);
  const videoSeconds = checkLimits(file);
  const prompt = buildPrompt({ notes, history });
  const { analysis, model } = await analyzeWithFallback(file, prompt, started);
  return { analysis, model, videoSeconds };
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
      throw new UserFacingError("Your video is still processing. Give it a moment and try again.", 504, true);
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    file = await gemini().files.get({ name });
  }

  if (file.state !== FileState.ACTIVE || !file.uri || !file.mimeType) {
    console.error("Video processing failed:", file.state, file.error);
    throw new UserFacingError("We couldn't read that video. Try recording it again as an MP4 or MOV.", 422);
  }
  return file;
}

/** Re-checks the limits on the file Gemini actually received. Returns its length in seconds. */
function checkLimits(file: GeminiFile): number | null {
  if (Number(file.sizeBytes) > MAX_FILE_BYTES) {
    throw new UserFacingError("That video is too large.", 400);
  }
  // e.g. { videoDuration: "12.5s" }
  const duration = parseFloat(String(file.videoMetadata?.videoDuration ?? ""));
  if (duration > MAX_DURATION_SEC + 1) {
    throw new UserFacingError(`Please trim your video to ${MAX_DURATION_SEC} seconds or less.`, 400);
  }
  return Number.isFinite(duration) ? duration : null;
}

/** Tries each model in turn until one returns a valid analysis. */
async function analyzeWithFallback(file: GeminiFile, prompt: string, started: number) {
  let sawBusy = false;

  for (const model of GEMINI_MODELS) {
    if (Date.now() - started > NO_NEW_ATTEMPTS_AFTER_MS) break;
    const attemptStart = Date.now();
    try {
      const response = await gemini().models.generateContent({
        model,
        contents: [{ ...createPartFromUri(file.uri!, file.mimeType!), videoMetadata: { fps: FRAMES_PER_SECOND } }, prompt],
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
      console.log(`Analyzed ${file.name} with ${model} in ${seconds(attemptStart)}s`);
      return { analysis, model };
    } catch (error) {
      const transient = isTransient(error);
      sawBusy ||= transient;
      const reason = error instanceof ApiError ? `HTTP ${error.status}` : (error as Error)?.message;
      console.warn(`Model ${model} failed after ${seconds(attemptStart)}s (${reason}); trying the next one.`);
    }
  }

  if (sawBusy) throw new UserFacingError("The coach is busy right now. Please try again in a minute.", 503, true);
  throw new Error(`All models failed: ${GEMINI_MODELS.join(", ")}`);
}

/** Overloaded, out of quota, or timed out: worth trying again shortly. */
export function isTransient(error: unknown): boolean {
  if (error instanceof ApiError) return error.status === 429 || error.status >= 500;
  return error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError");
}

const seconds = (since: number) => ((Date.now() - since) / 1000).toFixed(1);
