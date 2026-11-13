// Limits shared by the browser and the server. Change them here.
export const MAX_FILE_MB = 100;
export const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;
export const MAX_DURATION_SEC = 90;

// Video MIME types the Gemini API accepts.
const GEMINI_VIDEO_TYPES = new Set([
  "video/mp4",
  "video/mpeg",
  "video/mov",
  "video/avi",
  "video/x-flv",
  "video/mpg",
  "video/webm",
  "video/wmv",
  "video/3gpp",
]);

// Browsers sometimes report a non-standard type, or none at all (common for
// .mov on Windows/Android), so fall back to the file extension.
const TYPES_BY_EXTENSION: Record<string, string> = {
  mp4: "video/mp4",
  m4v: "video/mp4",
  mov: "video/mov",
  qt: "video/mov",
  webm: "video/webm",
  "3gp": "video/3gpp",
  mpeg: "video/mpeg",
  mpg: "video/mpg",
  avi: "video/avi",
  wmv: "video/wmv",
  flv: "video/x-flv",
};

/** The MIME type to declare to Gemini for this file, or null if it isn't a supported video. */
export function geminiVideoType(browserType: string, fileName: string): string | null {
  const type = browserType.toLowerCase();
  if (type === "video/quicktime") return "video/mov"; // iPhone recordings
  if (GEMINI_VIDEO_TYPES.has(type)) return type;
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  return TYPES_BY_EXTENSION[ext] ?? null;
}
