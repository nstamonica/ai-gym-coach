"use client";

import { ArrowRight, Clock3, RotateCcw, Upload } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, type DragEvent, type ReactNode } from "react";
import { AnalysisReport } from "@/components/analysis-report";
import { LocalDate } from "@/components/local-date";
import { Button, buttonClasses } from "@/components/ui/button";
import { FormMessage, TextAreaField } from "@/components/ui/field";
import { MAX_NOTES_LENGTH } from "@/lib/analysis";
import { MAX_DURATION_SEC, MAX_FILE_BYTES, MAX_FILE_MB, geminiVideoType } from "@/lib/config";
import { cx } from "@/lib/cx";
import type { AnalysisView, PreviousResult, Quota } from "@/lib/types";
import { readVideoInfo, uploadVideo, type VideoInfo } from "@/lib/video";
import { deleteAnalysisAction } from "../analyses/actions";

type Phase =
  | { step: "idle" }
  | { step: "uploading"; progress: number }
  | { step: "analyzing" }
  | { step: "done"; analysis: AnalysisView; previous: PreviousResult | null }
  | { step: "error"; message: string; retryable: boolean };

const STATUS_MESSAGES = [
  "Processing your video…",
  "Watching your reps…",
  "Checking your positions through each phase…",
  "Writing up your feedback…",
];

class RequestError extends Error {
  constructor(message: string, readonly retryable: boolean) {
    super(message);
  }
}

function messageOf(error: unknown): string {
  // fetch() rejects with a TypeError when the network is down.
  if (error instanceof TypeError) return "Couldn't reach the server. Check your connection and try again.";
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}

async function postJson<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new RequestError(data?.error ?? `Something went wrong (error ${res.status}). Please try again.`, Boolean(data?.retryable));
  }
  return data as T;
}

export function AnalyzeFlow({ initialQuota, tips }: { initialQuota: Quota; tips: ReactNode }) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [info, setInfo] = useState<VideoInfo>({ duration: null, thumbnail: null });
  const [notes, setNotes] = useState("");
  const [phase, setPhase] = useState<Phase>({ step: "idle" });
  const [pickError, setPickError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [quota, setQuota] = useState(initialQuota);
  // An analysis whose video is uploaded but not yet analyzed (the coach was busy).
  const [pendingId, setPendingId] = useState<string | null>(null);
  const resultRef = useRef<HTMLElement>(null);

  // Free the preview's memory when it's replaced or the page closes.
  useEffect(() => () => void (previewUrl && URL.revokeObjectURL(previewUrl)), [previewUrl]);

  useEffect(() => {
    if (phase.step === "done") resultRef.current?.focus();
  }, [phase.step]);

  const busy = checking || phase.step === "uploading" || phase.step === "analyzing";
  const outOfQuota = quota.remaining <= 0 && !pendingId;
  const adjustQuota = (delta: number) =>
    setQuota((q) => ({ ...q, used: q.used + delta, remaining: Math.max(0, q.remaining - delta) }));

  async function selectFile(selected: File | undefined) {
    if (!selected || busy) return;
    setPickError(null);
    if (!geminiVideoType(selected.type, selected.name)) {
      return setPickError("That file type isn't supported. Use an MP4, MOV or WebM video.");
    }
    if (selected.size > MAX_FILE_BYTES) {
      return setPickError(`That video is ${(selected.size / 1024 / 1024).toFixed(0)} MB. The limit is ${MAX_FILE_MB} MB.`);
    }

    setChecking(true);
    const url = URL.createObjectURL(selected);
    const videoInfo = await readVideoInfo(url);
    setChecking(false);
    if (videoInfo.duration && videoInfo.duration > MAX_DURATION_SEC + 1) {
      URL.revokeObjectURL(url);
      return setPickError(
        `That video is ${Math.round(videoInfo.duration)} seconds long. Please trim it to ${MAX_DURATION_SEC} seconds or less.`,
      );
    }
    setFile(selected);
    setPreviewUrl(url);
    setInfo(videoInfo);
    setPhase({ step: "idle" });
  }

  function discardPending() {
    if (pendingId) {
      void deleteAnalysisAction(pendingId).catch(() => {});
      adjustQuota(-1);
      setPendingId(null);
    }
  }

  function reset() {
    discardPending();
    setFile(null);
    setPreviewUrl(null);
    setInfo({ duration: null, thumbnail: null });
    setNotes("");
    setPhase({ step: "idle" });
  }

  async function analyze() {
    if (!file || busy) return;

    // Step 1: reserve an analysis and upload the video (skipped when retrying a busy run).
    let id = pendingId;
    if (!id) {
      try {
        setPhase({ step: "uploading", progress: 0 });
        const created = await postJson<{ id: string; uploadUrl: string }>("/api/analyses", {
          name: file.name,
          type: file.type,
          size: file.size,
          duration: info.duration,
          notes: notes.trim() || null,
          thumbnail: info.thumbnail,
        });
        adjustQuota(1);
        try {
          await uploadVideo(created.uploadUrl, file, (progress) => setPhase({ step: "uploading", progress }));
        } catch (error) {
          // The analysis never started, so give the quota slot back.
          void deleteAnalysisAction(created.id).catch(() => {});
          adjustQuota(-1);
          throw error;
        }
        id = created.id;
        setPendingId(id);
      } catch (error) {
        return setPhase({ step: "error", message: messageOf(error), retryable: false });
      }
    }

    // Step 2: analyze it.
    try {
      setPhase({ step: "analyzing" });
      const result = await postJson<{ analysis: AnalysisView; previous: PreviousResult | null }>(`/api/analyses/${id}/run`);
      setPendingId(null);
      setPhase({ step: "done", analysis: result.analysis, previous: result.previous });
    } catch (error) {
      // A dropped connection is retryable too: the run is idempotent, so retrying
      // returns the saved result if the analysis finished anyway.
      const retryable = error instanceof RequestError ? error.retryable : true;
      if (!retryable) {
        // The server marked it failed, which doesn't count toward the quota.
        adjustQuota(-1);
        setPendingId(null);
      }
      setPhase({ step: "error", message: messageOf(error), retryable });
    }
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    setDragging(false);
    void selectFile(event.dataTransfer.files[0]);
  }

  if (phase.step === "done") {
    return (
      <section
        ref={resultRef}
        tabIndex={-1}
        aria-label="Your form review"
        className="rounded-2xl border border-white/10 bg-[var(--surface-card)] p-5 shadow-2xl shadow-black/30 focus:outline-none sm:p-8"
      >
        <AnalysisReport
          analysis={phase.analysis}
          previous={phase.previous}
          media={
            previewUrl && (
              <video src={previewUrl} controls playsInline muted className="max-h-[55vh] w-full rounded-xl bg-black" />
            )
          }
        />
        <div className="mt-8 flex flex-col gap-3 border-t border-slate-800 pt-6 sm:flex-row">
          <Button size="lg" className="flex-1" onClick={reset}>
            Analyze another video
          </Button>
          <Link href={`/analyses/${phase.analysis.id}`} className={buttonClasses({ variant: "secondary", size: "lg" })}>
            Open saved analysis
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
        <p className="mt-4 text-center text-sm text-slate-400">
          Saved to your history. Your video has been deleted from the AI provider.
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-8">
      <QuotaNotice quota={quota} />

      <section className="space-y-5 rounded-2xl border border-white/10 bg-[var(--surface-card)] p-5 shadow-2xl shadow-black/30 sm:p-8">
        {!file || !previewUrl ? (
          <>
            <label
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className={cx(
                "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-14 text-center transition focus-within:ring-2 focus-within:ring-blue-400",
                dragging ? "border-blue-400 bg-blue-500/10" : "border-slate-700 hover:border-slate-500",
                (checking || outOfQuota) && "pointer-events-none opacity-60",
              )}
            >
              <span className="grid size-14 place-items-center rounded-2xl bg-blue-500/15 text-blue-300">
                <Upload className="size-7" aria-hidden />
              </span>
              <span className="text-lg font-semibold text-white">
                {checking ? "Checking your video…" : "Choose a video or drag it here"}
              </span>
              <span className="text-sm text-slate-400">
                MP4, MOV or WebM · up to {MAX_DURATION_SEC} seconds · {MAX_FILE_MB} MB max
              </span>
              <input
                type="file"
                accept="video/*"
                className="sr-only"
                disabled={checking || outOfQuota}
                onChange={(e) => {
                  void selectFile(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </label>
            {pickError && <FormMessage tone="error">{pickError}</FormMessage>}
          </>
        ) : (
          <>
            <div className="space-y-3">
              <video src={previewUrl} controls playsInline muted className="max-h-[55vh] w-full rounded-xl bg-black" />
              <div className="flex items-center justify-between gap-4 text-sm text-slate-400">
                <span className="truncate">{file.name}</span>
                <span className="shrink-0">
                  {info.duration ? `${Math.round(info.duration)} s · ` : ""}
                  {(file.size / 1024 / 1024).toFixed(1)} MB
                </span>
              </div>
            </div>

            <TextAreaField
              label="Anything the coach should know? (optional)"
              placeholder="e.g. Third set at 100 kg. My lower back felt tight at the bottom."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={MAX_NOTES_LENGTH}
              disabled={busy || Boolean(pendingId)}
              rows={2}
              hint={`${notes.length}/${MAX_NOTES_LENGTH}`}
            />

            {phase.step === "uploading" && <UploadProgress progress={phase.progress} />}
            {phase.step === "analyzing" && <AnalyzingStatus />}
            {phase.step === "error" && <FormMessage tone="error">{phase.message}</FormMessage>}

            <div className="flex gap-3">
              <Button size="lg" className="flex-1" onClick={analyze} loading={busy} disabled={outOfQuota}>
                {phase.step === "uploading"
                  ? "Uploading…"
                  : phase.step === "analyzing"
                    ? "Analyzing…"
                    : phase.step === "error"
                      ? "Try again"
                      : "Analyze my form"}
              </Button>
              <Button variant="secondary" size="lg" onClick={reset} disabled={busy}>
                <RotateCcw className="size-4" aria-hidden />
                Change
              </Button>
            </div>
          </>
        )}
      </section>

      {!file && tips}

      <p className="text-center text-xs leading-relaxed text-slate-400">
        Your video goes straight to Google&apos;s Gemini API for analysis and is deleted as soon as your review is ready.
        We keep the written review and one still frame so you can track your progress.
      </p>
    </div>
  );
}

function QuotaNotice({ quota }: { quota: Quota }) {
  if (quota.remaining > 0) {
    return (
      <p className="flex items-center gap-2 text-sm text-slate-400">
        <Clock3 className="size-4" aria-hidden />
        {quota.remaining} of {quota.limit} analyses left in the last 24 hours
      </p>
    );
  }
  return (
    <FormMessage tone="error">
      You&apos;ve used all {quota.limit} analyses for the last 24 hours.
      {quota.nextSlotAt && (
        <>
          {" "}
          Your next one frees up at <LocalDate iso={quota.nextSlotAt} format="datetime" />.
        </>
      )}
    </FormMessage>
  );
}

function UploadProgress({ progress }: { progress: number }) {
  const percent = Math.round(progress * 100);
  return (
    <div className="space-y-2" aria-live="polite">
      <div className="flex justify-between text-sm text-slate-400">
        <span>Uploading…</span>
        <span>{percent}%</span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-slate-800"
        role="progressbar"
        aria-label="Upload progress"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="h-full rounded-full bg-blue-500 transition-[width]" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function AnalyzingStatus() {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setIndex((i) => Math.min(i + 1, STATUS_MESSAGES.length - 1)), 5000);
    return () => clearInterval(timer);
  }, []);
  return (
    <div className="flex items-center gap-3 rounded-xl bg-blue-500/10 px-4 py-3" aria-live="polite">
      <span className="relative flex size-3 shrink-0">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-blue-400 opacity-60" />
        <span className="relative inline-flex size-3 rounded-full bg-blue-400" />
      </span>
      <p className="text-sm text-blue-100">
        {STATUS_MESSAGES[index]} <span className="text-blue-200/70">This usually takes 10–60 seconds.</span>
      </p>
    </div>
  );
}
