// Server-only: the Gemini API key must never reach the browser.
import "server-only";
import { GoogleGenAI } from "@google/genai";

// Models to try, in order. If one is overloaded, out of quota, slow or retired,
// the next one is used. Override with GEMINI_MODEL (a comma-separated list).
const DEFAULT_MODELS = ["gemini-2.5-flash", "gemini-3-flash-preview", "gemini-3.5-flash", "gemini-flash-latest"];

const configuredModels = (process.env.GEMINI_MODEL ?? "")
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);

export const GEMINI_MODELS = configuredModels.length ? configuredModels : DEFAULT_MODELS;

let client: GoogleGenAI | null = null;

function apiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set. Add it to .env.local (or your host's environment variables).");
  return key;
}

export function gemini(): GoogleGenAI {
  // v1beta: the SDK defaults to v1, which rejects system instructions on some models and hides preview models.
  client ??= new GoogleGenAI({ apiKey: apiKey(), apiVersion: "v1beta" });
  return client;
}

/**
 * Starts a resumable upload with the Gemini Files API and returns the one-time
 * upload URL. The browser sends the video straight to that URL, so large files
 * never pass through our server (Vercel caps request bodies at ~4.5 MB) and the
 * API key never reaches the browser.
 *
 * `name` is chosen by us (`files/<analysis id>`), so the server knows which file
 * belongs to which analysis before the upload starts; clients never get to name
 * the file that is analyzed.
 *
 * `origin` must be the browser's origin: Google only adds CORS headers to the
 * upload response for the origin the session was created with.
 */
export async function createUploadSession(opts: { name: string; bytes: number; mimeType: string; origin: string | null }) {
  const res = await fetch("https://generativelanguage.googleapis.com/upload/v1beta/files", {
    method: "POST",
    headers: {
      "x-goog-api-key": apiKey(),
      "X-Goog-Upload-Protocol": "resumable",
      "X-Goog-Upload-Command": "start",
      "X-Goog-Upload-Header-Content-Length": String(opts.bytes),
      "X-Goog-Upload-Header-Content-Type": opts.mimeType,
      "Content-Type": "application/json",
      ...(opts.origin ? { Origin: opts.origin } : {}),
    },
    body: JSON.stringify({ file: { name: opts.name, display_name: "form-check" } }),
  });

  const uploadUrl = res.headers.get("x-goog-upload-url");
  if (!res.ok || !uploadUrl) {
    throw new Error(`Gemini upload session failed (${res.status}): ${await res.text()}`);
  }
  return uploadUrl;
}

/** Deletes an uploaded video. Never throws: files also expire on their own after 48 hours. */
export async function deleteGeminiFile(name: string): Promise<void> {
  await gemini()
    .files.delete({ name })
    .catch((error) => {
      // 403/404: never uploaded or already deleted.
      if (error?.status !== 403 && error?.status !== 404) {
        console.warn(`Couldn't delete ${name}:`, error?.message ?? error);
      }
    });
}
