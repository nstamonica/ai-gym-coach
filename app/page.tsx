"use client";

import { useEffect, useState, type DragEvent } from "react";
import type { Analysis } from "@/lib/analysis";
import { MAX_DURATION_SEC, MAX_FILE_BYTES, MAX_FILE_MB, geminiVideoType } from "@/lib/config";
import ResultCard from "./result-card";

type Status =
  | { step: "idle" }
  | { step: "uploading"; progress: number }
  | { step: "analyzing" }
  | { step: "done"; result: Analysis }
  | { step: "error"; message: string };

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>({ step: "idle" });
  const [dragging, setDragging] = useState(false);

  // Free the preview's memory when it's replaced or the page closes.
  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const busy = status.step === "uploading" || status.step === "analyzing";

  async function selectFile(selected: File | undefined) {
    if (!selected || busy) return;

    const url = URL.createObjectURL(selected);
    const problem = await validate(selected, url);
    if (problem) {
      URL.revokeObjectURL(url);
      setStatus({ step: "error", message: problem });
      return;
    }
    setFile(selected);
    setPreviewUrl(url);
    setStatus({ step: "idle" });
  }

  function reset() {
    setFile(null);
    setPreviewUrl(null);
    setStatus({ step: "idle" });
  }

  async function analyze() {
    if (!file || busy) return;
    try {
      setStatus({ step: "uploading", progress: 0 });
      const { uploadUrl } = await postJson<{ uploadUrl: string }>("/api/upload", {
        name: file.name,
        type: file.type,
        size: file.size,
      });
      const fileName = await uploadWithProgress(uploadUrl, file, (progress) =>
        setStatus({ step: "uploading", progress }),
      );

      setStatus({ step: "analyzing" });
      const result = await postJson<Analysis>("/api/analyze", { fileName });
      setStatus({ step: "done", result });
    } catch (error) {
      setStatus({ step: "error", message: error instanceof Error ? error.message : "Something went wrong." });
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    selectFile(e.dataTransfer.files[0]);
  }

  return (
    <main className="min-h-screen px-4 py-10 sm:py-16">
      <div className="mx-auto max-w-2xl space-y-8">
        <header className="text-center">
          <h1 className="bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-4xl font-extrabold text-transparent sm:text-5xl">
            AI Gym Coach
          </h1>
          <p className="mt-4 text-slate-400">Upload a short clip of your lift and get instant feedback on your form.</p>
        </header>

        {status.step === "done" ? (
          <ResultCard result={status.result} videoUrl={previewUrl} onReset={reset} />
        ) : (
          <section className="space-y-5 rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-2xl sm:p-8">
            {!file || !previewUrl ? (
              <label
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-12 text-center transition focus-within:ring-2 focus-within:ring-blue-400 ${
                  dragging ? "border-blue-400 bg-blue-500/10" : "border-slate-700 hover:border-slate-500"
                }`}
              >
                <UploadIcon />
                <span className="text-lg font-semibold">Choose a video or drag it here</span>
                <span className="text-sm text-slate-400">
                  MP4, MOV or WebM · up to {MAX_DURATION_SEC} seconds · {MAX_FILE_MB} MB max
                </span>
                <input
                  type="file"
                  accept="video/*"
                  className="sr-only"
                  onChange={(e) => {
                    selectFile(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
              </label>
            ) : (
              <div className="space-y-3">
                <video src={previewUrl} controls playsInline muted className="max-h-[60vh] w-full rounded-xl bg-black" />
                <div className="flex items-center justify-between gap-4 text-sm text-slate-400">
                  <span className="truncate">{file.name}</span>
                  <span className="shrink-0">{(file.size / 1024 / 1024).toFixed(1)} MB</span>
                </div>
              </div>
            )}

            {status.step === "uploading" && (
              <div className="space-y-2" aria-live="polite">
                <div className="flex justify-between text-sm text-slate-400">
                  <span>Uploading…</span>
                  <span>{Math.round(status.progress * 100)}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-blue-500 transition-[width]"
                    style={{ width: `${status.progress * 100}%` }}
                  />
                </div>
              </div>
            )}

            {status.step === "analyzing" && (
              <p className="animate-pulse text-center text-sm text-slate-400" aria-live="polite">
                Coach is watching your set. This usually takes 10–60 seconds…
              </p>
            )}

            {status.step === "error" && (
              <p role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {status.message}
              </p>
            )}

            {file && (
              <div className="flex gap-3">
                <button
                  onClick={analyze}
                  disabled={busy}
                  className="flex-1 rounded-xl bg-blue-600 py-4 text-lg font-bold shadow-lg shadow-blue-900/20 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-400"
                >
                  {status.step === "uploading"
                    ? "Uploading…"
                    : status.step === "analyzing"
                      ? "Analyzing…"
                      : status.step === "error"
                        ? "Try again"
                        : "Analyze my form"}
                </button>
                <button
                  onClick={reset}
                  disabled={busy}
                  className="rounded-xl border border-slate-700 px-5 font-semibold text-slate-300 transition hover:border-slate-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Change
                </button>
              </div>
            )}
          </section>
        )}

        {!file && status.step !== "done" && (
          <section className="rounded-2xl border border-slate-800/60 p-5 text-sm text-slate-400 sm:p-6">
            <h2 className="mb-3 font-semibold text-slate-200">For the most accurate feedback</h2>
            <ul className="list-inside list-disc space-y-1.5">
              <li>Film from the side or at a 45° angle, about hip height.</li>
              <li>Keep your whole body (and the bar) in frame the entire time.</li>
              <li>Record a single set, trimmed to the reps you want reviewed.</li>
            </ul>
          </section>
        )}

        <footer className="text-center text-xs leading-relaxed text-slate-500">
          AI feedback can be wrong and isn&apos;t a substitute for a qualified coach or medical advice.
          <br />
          Your video is sent to Google&apos;s Gemini API for analysis and deleted as soon as your result is ready.
        </footer>
      </div>
    </main>
  );
}

async function validate(file: File, url: string): Promise<string | null> {
  if (!geminiVideoType(file.type, file.name)) return "That file type isn't supported. Use an MP4, MOV or WebM video.";
  if (file.size > MAX_FILE_BYTES) return `That video is ${(file.size / 1024 / 1024).toFixed(0)} MB. The limit is ${MAX_FILE_MB} MB.`;

  const duration = await readDuration(url);
  if (duration && duration > MAX_DURATION_SEC + 1) {
    return `That video is ${Math.round(duration)} seconds long. Please trim it to ${MAX_DURATION_SEC} seconds or less.`;
  }
  return null;
}

/** Reads a video's length in seconds, or null if the browser can't tell (the server checks again). */
function readDuration(url: string): Promise<number | null> {
  const video = document.createElement("video");
  const result = new Promise<number | null>((resolve) => {
    video.preload = "metadata";
    video.onloadedmetadata = () => resolve(Number.isFinite(video.duration) ? video.duration : null);
    video.onerror = () => resolve(null);
    setTimeout(() => resolve(null), 5000);
    video.src = url;
  });
  return result.finally(() => video.removeAttribute("src"));
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error ?? `Something went wrong (error ${res.status}). Please try again.`);
  return data as T;
}

/** Uploads the video straight to Gemini (not through our server) and reports progress from 0 to 1. */
function uploadWithProgress(uploadUrl: string, file: File, onProgress: (progress: number) => void): Promise<string> {
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
    xhr.onload = () => {
      const name = parseUploadedFileName(xhr.responseText);
      if (xhr.status >= 200 && xhr.status < 300 && name) resolve(name);
      else failed();
    };
    // slice() drops the browser's MIME type; the type was already declared when the upload was created.
    xhr.send(file.slice());
  });
}

function parseUploadedFileName(responseText: string): string | null {
  try {
    const name = JSON.parse(responseText)?.file?.name;
    return typeof name === "string" ? name : null;
  } catch {
    return null;
  }
}

function UploadIcon() {
  return (
    <svg className="h-10 w-10 text-blue-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z"
      />
    </svg>
  );
}
