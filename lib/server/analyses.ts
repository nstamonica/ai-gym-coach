// Data access for analyses. Every read and write that acts for a user takes
// that user's id and filters on it, so one user can never touch another's data.
import "server-only";
import { and, asc, count, desc, eq, gte, inArray, lt, ne, or, sql } from "drizzle-orm";
import { normalizeFeedback, type Analysis, type SessionContext } from "@/lib/analysis";
import { exerciseLabel } from "@/lib/exercises";
import type { Grade } from "@/lib/grades";
import type { AnalysisSummary, AnalysisView, PreviousResult } from "@/lib/types";
import { db } from "./db";
import { analysis, user, type AnalysisRow } from "./db/schema";
import { deleteGeminiFile } from "./gemini";

/**
 * A run request "claims" an analysis while it works on it. If the function dies
 * mid-run, the claim expires after this long so the user can retry. It must be
 * longer than the run route's maxDuration.
 */
export const CLAIM_TIMEOUT_MS = 6 * 60 * 1000;

const viewColumns = {
  id: analysis.id,
  createdAt: analysis.createdAt,
  isExercise: analysis.isExercise,
  exercise: analysis.exercise,
  exerciseKey: analysis.exerciseKey,
  grade: analysis.grade,
  feedback: analysis.feedback,
  notes: analysis.notes,
  videoName: analysis.videoName,
  videoSeconds: analysis.videoSeconds,
  model: analysis.model,
  shareToken: analysis.shareToken,
  hasThumbnail: sql<boolean>`${analysis.thumbnail} is not null`,
};

type ViewRow = Pick<
  AnalysisRow,
  Exclude<keyof typeof viewColumns, "hasThumbnail">
> & { hasThumbnail: boolean };

function toView(row: ViewRow): AnalysisView {
  const exercise = row.exercise ?? "";
  const key = row.exerciseKey ?? "other";
  return {
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    isExercise: row.isExercise ?? false,
    exercise,
    exerciseKey: key,
    exerciseLabel: exerciseLabel(key, exercise),
    grade: row.grade,
    feedback: normalizeFeedback(row.feedback),
    notes: row.notes,
    videoName: row.videoName,
    videoSeconds: row.videoSeconds,
    model: row.model,
    hasThumbnail: Boolean(row.hasThumbnail),
    shareToken: row.shareToken,
  };
}

// --- Creating and running ---------------------------------------------------

export interface QuotaLimits {
  perUser: number;
  global: number;
  windowMs: number;
}

/** Analyses in the window count toward quotas unless they failed. */
const countsTowardQuota = (since: Date) => and(gte(analysis.createdAt, since), ne(analysis.status, "failed"));

/** When the user's count next drops below `limit`, given their counted analyses (oldest first). */
function nextSlot(createdAt: Date[], limit: number, windowMs: number): Date | null {
  if (createdAt.length < limit) return null;
  return new Date(createdAt[createdAt.length - limit].getTime() + windowMs);
}

/** How many analyses the user has used in the current window. */
export async function quotaUsage(userId: string, limits: QuotaLimits) {
  const since = new Date(Date.now() - limits.windowMs);
  const rows = await db
    .select({ createdAt: analysis.createdAt })
    .from(analysis)
    .where(and(eq(analysis.userId, userId), countsTowardQuota(since)))
    .orderBy(asc(analysis.createdAt));
  return { used: rows.length, nextSlotAt: nextSlot(rows.map((r) => r.createdAt), limits.perUser, limits.windowMs) };
}

export type ReserveResult =
  | { ok: true }
  | { ok: false; reason: "user-limit"; retryAt: Date | null }
  | { ok: false; reason: "global-limit" };

/**
 * Checks the quotas and records a new pending analysis in one transaction. A
 * per-user advisory lock stops parallel requests from both passing the check.
 */
export async function reserveAnalysis(
  values: {
    id: string;
    userId: string;
    geminiFile: string;
    videoName: string;
    videoBytes: number;
    videoSeconds: number | null;
    notes: string | null;
    thumbnail: Uint8Array | null;
  },
  limits: QuotaLimits,
): Promise<ReserveResult> {
  const since = new Date(Date.now() - limits.windowMs);
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${values.userId}))`);

    const mine = await tx
      .select({ createdAt: analysis.createdAt })
      .from(analysis)
      .where(and(eq(analysis.userId, values.userId), countsTowardQuota(since)))
      .orderBy(asc(analysis.createdAt));
    if (mine.length >= limits.perUser) {
      return { ok: false, reason: "user-limit", retryAt: nextSlot(mine.map((r) => r.createdAt), limits.perUser, limits.windowMs) };
    }

    const [all] = await tx.select({ n: count() }).from(analysis).where(countsTowardQuota(since));
    if ((all?.n ?? 0) >= limits.global) return { ok: false, reason: "global-limit" };

    await tx.insert(analysis).values(values);
    return { ok: true };
  });
}

/**
 * Atomically marks an analysis as being processed, so a double-click or a
 * second tab can't run (and pay for) the same analysis twice. Returns null if
 * it doesn't exist, isn't the user's, or is already finished or in progress.
 */
export async function claimAnalysis(id: string, userId: string) {
  const staleBefore = new Date(Date.now() - CLAIM_TIMEOUT_MS);
  const [row] = await db
    .update(analysis)
    .set({ status: "processing", error: null })
    .where(
      and(
        eq(analysis.id, id),
        eq(analysis.userId, userId),
        or(
          eq(analysis.status, "pending"),
          and(eq(analysis.status, "processing"), lt(analysis.updatedAt, staleBefore)),
        ),
      ),
    )
    .returning({ id: analysis.id, geminiFile: analysis.geminiFile, notes: analysis.notes });
  return row ?? null;
}

/** The status of one of the user's analyses, or null if there's no such analysis. */
export async function getAnalysisStatus(id: string, userId: string) {
  const [row] = await db
    .select({ status: analysis.status })
    .from(analysis)
    .where(and(eq(analysis.id, id), eq(analysis.userId, userId)));
  return row?.status ?? null;
}

/** Saves a finished analysis. Returns null if it was deleted while running. */
export async function completeAnalysis(
  id: string,
  result: Analysis,
  meta: { model: string; videoSeconds: number | null },
): Promise<AnalysisView | null> {
  const [row] = await db
    .update(analysis)
    .set({
      status: "complete",
      isExercise: result.isExercise,
      exercise: result.exercise,
      exerciseKey: result.exerciseKey,
      grade: result.isExercise ? result.grade : null,
      feedback: result.feedback,
      model: meta.model,
      ...(meta.videoSeconds != null ? { videoSeconds: meta.videoSeconds } : {}),
      completedAt: new Date(),
      error: null,
    })
    .where(and(eq(analysis.id, id), eq(analysis.status, "processing")))
    .returning(viewColumns);
  return row ? toView(row) : null;
}

/** Hands a claimed analysis back so it can be retried (the model was busy). */
export async function releaseAnalysis(id: string): Promise<void> {
  await db
    .update(analysis)
    .set({ status: "pending" })
    .where(and(eq(analysis.id, id), eq(analysis.status, "processing")));
}

export async function failAnalysis(id: string, error: string): Promise<void> {
  await db
    .update(analysis)
    .set({ status: "failed", error: error.slice(0, 500) })
    .where(eq(analysis.id, id));
}

/**
 * The most recent completed session per exercise (up to `limit`), so the coach
 * can say what improved since last time.
 */
export async function recentSessions(userId: string, excludeId: string, limit = 5): Promise<SessionContext[]> {
  const rows = await db
    .selectDistinctOn([analysis.exerciseKey], {
      createdAt: analysis.createdAt,
      exercise: analysis.exercise,
      exerciseKey: analysis.exerciseKey,
      grade: analysis.grade,
      feedback: analysis.feedback,
    })
    .from(analysis)
    .where(
      and(
        eq(analysis.userId, userId),
        eq(analysis.status, "complete"),
        eq(analysis.isExercise, true),
        ne(analysis.id, excludeId),
      ),
    )
    .orderBy(analysis.exerciseKey, desc(analysis.createdAt));

  return rows
    .filter((r) => r.grade && r.exerciseKey)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, limit)
    .map((r) => ({
      date: r.createdAt,
      exercise: r.exercise || exerciseLabel(r.exerciseKey!),
      exerciseKey: r.exerciseKey!,
      grade: r.grade!,
      corrections: normalizeFeedback(r.feedback).tips.map((t) => t.title).filter(Boolean),
    }));
}

// --- Reading ------------------------------------------------------------------

export async function getAnalysis(id: string, userId: string): Promise<AnalysisView | null> {
  const [row] = await db
    .select(viewColumns)
    .from(analysis)
    .where(and(eq(analysis.id, id), eq(analysis.userId, userId), eq(analysis.status, "complete")));
  return row ? toView(row) : null;
}

/** The user's previous graded result for the same exercise, before `before`. */
export async function getPreviousResult(
  userId: string,
  exerciseKey: string,
  before: Date,
): Promise<PreviousResult | null> {
  const [row] = await db
    .select({ id: analysis.id, createdAt: analysis.createdAt, grade: analysis.grade })
    .from(analysis)
    .where(
      and(
        eq(analysis.userId, userId),
        eq(analysis.status, "complete"),
        eq(analysis.isExercise, true),
        eq(analysis.exerciseKey, exerciseKey),
        lt(analysis.createdAt, before),
      ),
    )
    .orderBy(desc(analysis.createdAt))
    .limit(1);
  return row?.grade ? { id: row.id, createdAt: row.createdAt.toISOString(), grade: row.grade } : null;
}

export async function listAnalyses(
  userId: string,
  { exerciseKey, limit = 20, offset = 0 }: { exerciseKey?: string; limit?: number; offset?: number } = {},
): Promise<{ items: AnalysisSummary[]; total: number }> {
  const where = and(
    eq(analysis.userId, userId),
    eq(analysis.status, "complete"),
    exerciseKey ? eq(analysis.exerciseKey, exerciseKey) : undefined,
  );

  const [rows, [totalRow]] = await Promise.all([
    db
      .select({
        id: analysis.id,
        createdAt: analysis.createdAt,
        isExercise: analysis.isExercise,
        exercise: analysis.exercise,
        exerciseKey: analysis.exerciseKey,
        grade: analysis.grade,
        summary: sql<string | null>`${analysis.feedback}->>'summary'`,
        hasThumbnail: sql<boolean>`${analysis.thumbnail} is not null`,
      })
      .from(analysis)
      .where(where)
      .orderBy(desc(analysis.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ n: count() }).from(analysis).where(where),
  ]);

  return {
    total: totalRow?.n ?? 0,
    items: rows.map((r) => {
      const exercise = r.exercise ?? "";
      const key = r.exerciseKey ?? "other";
      return {
        id: r.id,
        createdAt: r.createdAt.toISOString(),
        isExercise: r.isExercise ?? false,
        exercise,
        exerciseKey: key,
        exerciseLabel: exerciseLabel(key, exercise),
        grade: r.grade,
        summary: r.summary ?? "",
        hasThumbnail: Boolean(r.hasThumbnail),
      };
    }),
  };
}

export interface ProgressEntry {
  id: string;
  createdAt: Date;
  exercise: string;
  exerciseKey: string;
  grade: Grade;
}

/** Every graded analysis for the user, oldest first: the raw data for the dashboard. */
export async function listProgress(userId: string): Promise<ProgressEntry[]> {
  const rows = await db
    .select({
      id: analysis.id,
      createdAt: analysis.createdAt,
      exercise: analysis.exercise,
      exerciseKey: analysis.exerciseKey,
      grade: analysis.grade,
    })
    .from(analysis)
    .where(and(eq(analysis.userId, userId), eq(analysis.status, "complete"), eq(analysis.isExercise, true)))
    .orderBy(asc(analysis.createdAt));

  return rows.flatMap((r) =>
    r.grade && r.exerciseKey
      ? [{ id: r.id, createdAt: r.createdAt, exercise: r.exercise ?? "", exerciseKey: r.exerciseKey, grade: r.grade }]
      : [],
  );
}

// --- Sharing ------------------------------------------------------------------

/** Turns the public link on (with a new token) or off. Returns false if not found. */
export async function setShareToken(id: string, userId: string, token: string | null): Promise<boolean> {
  const rows = await db
    .update(analysis)
    .set({ shareToken: token })
    .where(and(eq(analysis.id, id), eq(analysis.userId, userId), eq(analysis.status, "complete")))
    .returning({ id: analysis.id });
  return rows.length > 0;
}

export async function getSharedAnalysis(token: string): Promise<(AnalysisView & { ownerName: string }) | null> {
  const [row] = await db
    .select({ ...viewColumns, ownerName: user.name })
    .from(analysis)
    .innerJoin(user, eq(user.id, analysis.userId))
    .where(and(eq(analysis.shareToken, token), eq(analysis.status, "complete")));
  if (!row) return null;
  const { ownerName, ...view } = row;
  // Notes are private: strip them here so no page can leak them by accident.
  return { ...toView(view), notes: null, ownerName: ownerName.split(" ")[0] ?? "" };
}

export async function getThumbnail(id: string) {
  const [row] = await db
    .select({ userId: analysis.userId, shareToken: analysis.shareToken, thumbnail: analysis.thumbnail })
    .from(analysis)
    .where(eq(analysis.id, id));
  return row ?? null;
}

// --- Deleting and exporting ------------------------------------------------------

/** Deletes one of the user's analyses (and its video, if it's still on Gemini). */
export async function deleteAnalysis(id: string, userId: string): Promise<boolean> {
  const [row] = await db
    .delete(analysis)
    .where(and(eq(analysis.id, id), eq(analysis.userId, userId)))
    .returning({ geminiFile: analysis.geminiFile, status: analysis.status });
  if (!row) return false;
  if (row.status === "pending" || row.status === "processing") await deleteGeminiFile(row.geminiFile);
  return true;
}

/** Deletes videos still waiting on Gemini, before the user's account is deleted. */
export async function deleteUploadsForUser(userId: string): Promise<void> {
  const rows = await db
    .select({ geminiFile: analysis.geminiFile })
    .from(analysis)
    .where(and(eq(analysis.userId, userId), inArray(analysis.status, ["pending", "processing"])));
  await Promise.all(rows.map((r) => deleteGeminiFile(r.geminiFile)));
}

/** Everything we store about the user's analyses, for the "download my data" button. */
export async function exportAnalyses(userId: string): Promise<AnalysisView[]> {
  const rows = await db
    .select(viewColumns)
    .from(analysis)
    .where(and(eq(analysis.userId, userId), eq(analysis.status, "complete")))
    .orderBy(desc(analysis.createdAt));
  return rows.map(toView);
}
