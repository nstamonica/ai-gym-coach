// Browser-only helpers for reading a video before it's uploaded.
import { THUMBNAIL_MAX_BYTES, THUMBNAIL_MAX_SIDE } from "./config";

export interface VideoInfo {
  /** Length in seconds, or null if the browser can't tell (the server checks again). */
  duration: number | null;
  /** A base64 JPEG frame, or null if the browser can't decode this video (e.g. HEVC on some PCs). */
  thumbnail: string | null;
}

function once(target: HTMLVideoElement, event: string, timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timed out waiting for ${event}`)), timeoutMs);
    target.addEventListener(event, () => (clearTimeout(timer), resolve()), { once: true });
    target.addEventListener("error", () => (clearTimeout(timer), reject(new Error("video error"))), { once: true });
  });
}

export async function readVideoInfo(url: string): Promise<VideoInfo> {
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.src = url;
  try {
    await once(video, "loadedmetadata", 8000);
    if (video.duration === Infinity) {
      // WebM files from MediaRecorder (Chrome, Android) have no duration in their
      // header. Seeking far past the end makes the browser work it out.
      video.currentTime = Number.MAX_SAFE_INTEGER;
      await once(video, "seeked", 8000).catch(() => {});
    }
    const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : null;
    let thumbnail: string | null = null;
    try {
      // A frame part-way through is more likely to show the lift than the setup.
      video.currentTime = duration ? Math.min(duration * 0.4, Math.max(0, duration - 0.1)) : 0.5;
      await once(video, "seeked", 8000);
      thumbnail = captureFrame(video);
    } catch {
      // No thumbnail; the analysis still works.
    }
    return { duration, thumbnail };
  } catch {
    return { duration: null, thumbnail: null };
  } finally {
    video.removeAttribute("src");
    video.load();
  }
}

function captureFrame(video: HTMLVideoElement): string | null {
  if (!video.videoWidth || !video.videoHeight) return null;
  const scale = Math.min(1, THUMBNAIL_MAX_SIDE / Math.max(video.videoWidth, video.videoHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(video.videoWidth * scale);
  canvas.height = Math.round(video.videoHeight * scale);
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  for (const quality of [0.8, 0.65, 0.5]) {
    const dataUrl = canvas.toDataURL("image/jpeg", quality);
    const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
    if ((base64.length * 3) / 4 <= THUMBNAIL_MAX_BYTES) return base64;
  }
  return null;
}

/** Uploads the video straight to Gemini (not through our server), reporting progress from 0 to 1. */
export function uploadVideo(uploadUrl: string, file: File, onProgress: (progress: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const failed = () => reject(new Error("Upload failed. Check your connection and try again."));
    const xhr = new XMLHttpRequest();
    xhr.open("POST", uploadUrl);
    xhr.setRequestHeader("X-Goog-Upload-Command", "upload, finalize");
    xhr.setRequestHeader("X-Goog-Upload-Offset", "0");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total);
    };
    xhr.onerror = failed;
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : failed());
    // slice() drops the browser's MIME type; the type was already declared when the upload was created.
    xhr.send(file.slice());
  });
}
