// Integration tests for the data layer, against a real (in-memory) Postgres.
import { and, count, eq, gte, ne } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Analysis } from "@/lib/analysis";
import type { Grade } from "@/lib/grades";
import {
  claimAnalysis,
  completeAnalysis,
  deleteAnalysis,
  failAnalysis,
  getAnalysis,
  getAnalysisStatus,
  getPreviousResult,
  getSharedAnalysis,
  listAnalyses,
  quotaUsage,
  recentSessions,
  releaseAnalysis,
  reserveAnalysis,
  setShareToken,
} from "@/lib/server/analyses";
import { db } from "@/lib/server/db";
import { analysis, user } from "@/lib/server/db/schema";
import { createUser, newAnalysis } from "./helpers/db";

const mocks = vi.hoisted(() => ({ deleteGeminiFile: vi.fn<(name: string) => Promise<void>>(async () => {}) }));
vi.mock("@/lib/server/gemini", () => ({ deleteGeminiFile: mocks.deleteGeminiFile }));
vi.mock("@/lib/server/db", async () => {
  const { createTestDb } = await import("./helpers/db");
  return { db: await createTestDb() };
});

const DAY = 24 * 60 * 60 * 1000;
const LIMITS = { perUser: 3, global: 10_000, windowMs: DAY };

const RESULT: Analysis = {
  isExercise: true,
  exercise: "High-bar back squat",
  exerciseKey: "back_squat",
  grade: "B",
  feedback: {
    summary: "Solid set.",
    strengths: ["Good depth"],
    tips: [{ title: "Chest up", detail: "Brace harder." }],
    safetyWarning: "",
    cameraTip: "",
    progressNote: "",
  },
};

/** Inserts an already-finished analysis, `daysAgo` days in the past. */
async function insertCompleted(userId: string, exerciseKey: string, grade: Grade, daysAgo: number, tip = "Fix it") {
  const values = newAnalysis(userId);
  const at = new Date(Date.now() - daysAgo * DAY);
  await db.insert(analysis).values({
    ...values,
    status: "complete",
    isExercise: true,
    exercise: exerciseKey,
    exerciseKey,
    grade,
    feedback: { ...RESULT.feedback, tips: [{ title: tip, detail: "" }] },
    createdAt: at,
    completedAt: at,
  });
  return values.id;
}

beforeEach(() => mocks.deleteGeminiFile.mockClear());

describe("reserveAnalysis (quotas)", () => {
  it("enforces the per-user limit and says when the next slot frees up", async () => {
    const userId = await createUser(db);
    for (let i = 0; i < 3; i++) expect((await reserveAnalysis(newAnalysis(userId), LIMITS)).ok).toBe(true);

    const blocked = await reserveAnalysis(newAnalysis(userId), LIMITS);
    expect(blocked).toMatchObject({ ok: false, reason: "user-limit" });
    if (!blocked.ok && blocked.reason === "user-limit") {
      const hoursUntilSlot = (blocked.retryAt!.getTime() - Date.now()) / (60 * 60 * 1000);
      expect(hoursUntilSlot).toBeGreaterThan(23.9);
    }
    expect((await quotaUsage(userId, LIMITS)).used).toBe(3);
  });

  it("doesn't count failed analyses", async () => {
    const userId = await createUser(db);
    const first = newAnalysis(userId);
    await reserveAnalysis(first, LIMITS);
    await reserveAnalysis(newAnalysis(userId), LIMITS);
    await reserveAnalysis(newAnalysis(userId), LIMITS);
    await failAnalysis(first.id, "unreadable video");
    expect((await reserveAnalysis(newAnalysis(userId), LIMITS)).ok).toBe(true);
  });

  it("doesn't count analyses older than the window", async () => {
    const userId = await createUser(db);
    for (let i = 0; i < 3; i++) await insertCompleted(userId, "deadlift", "B", 2);
    expect((await reserveAnalysis(newAnalysis(userId), LIMITS)).ok).toBe(true);
  });

  it("applies the global limit across all users", async () => {
    // Count the way the quota does: this window, excluding failures.
    const [{ n }] = await db
      .select({ n: count() })
      .from(analysis)
      .where(and(gte(analysis.createdAt, new Date(Date.now() - DAY)), ne(analysis.status, "failed")));
    const limits = { ...LIMITS, global: n + 1 };
    expect((await reserveAnalysis(newAnalysis(await createUser(db)), limits)).ok).toBe(true);
    expect(await reserveAnalysis(newAnalysis(await createUser(db)), limits)).toEqual({ ok: false, reason: "global-limit" });
  });

  it("lets exactly `limit` requests through when they race", async () => {
    const userId = await createUser(db);
    const results = await Promise.all(Array.from({ length: 8 }, () => reserveAnalysis(newAnalysis(userId), LIMITS)));
    expect(results.filter((r) => r.ok)).toHaveLength(3);
  });
});

describe("claiming and completing", () => {
  it("lets only the owner claim an analysis, and only once", async () => {
    const owner = await createUser(db);
    const stranger = await createUser(db);
    const values = newAnalysis(owner, { notes: "lower back felt tight" });
    await reserveAnalysis(values, LIMITS);

    expect(await claimAnalysis(values.id, stranger)).toBeNull();
    expect(await claimAnalysis(values.id, owner)).toEqual({
      id: values.id,
      geminiFile: values.geminiFile,
      notes: "lower back felt tight",
    });
    expect(await claimAnalysis(values.id, owner)).toBeNull();
    expect(await getAnalysisStatus(values.id, owner)).toBe("processing");
    expect(await getAnalysisStatus(values.id, stranger)).toBeNull();
  });

  it("lets a stale claim be retried after a crash", async () => {
    const owner = await createUser(db);
    const values = newAnalysis(owner);
    await reserveAnalysis(values, LIMITS);
    await claimAnalysis(values.id, owner);
    await db
      .update(analysis)
      .set({ updatedAt: new Date(Date.now() - 10 * 60 * 1000) })
      .where(eq(analysis.id, values.id));
    expect(await claimAnalysis(values.id, owner)).not.toBeNull();
  });

  it("makes a busy run retryable", async () => {
    const owner = await createUser(db);
    const values = newAnalysis(owner);
    await reserveAnalysis(values, LIMITS);
    await claimAnalysis(values.id, owner);
    await releaseAnalysis(values.id);
    expect(await getAnalysisStatus(values.id, owner)).toBe("pending");
    expect(await claimAnalysis(values.id, owner)).not.toBeNull();
  });

  it("saves the result and shows it only to its owner, without internal fields", async () => {
    const owner = await createUser(db);
    const stranger = await createUser(db);
    const values = newAnalysis(owner, { thumbnail: new Uint8Array([0xff, 0xd8, 0xff, 1, 2, 3]) });
    await reserveAnalysis(values, LIMITS);
    expect(await completeAnalysis(values.id, RESULT, { model: "test-model", videoSeconds: 9.5 })).toBeNull(); // not claimed yet

    await claimAnalysis(values.id, owner);
    const view = await completeAnalysis(values.id, RESULT, { model: "test-model", videoSeconds: 9.5 });
    expect(view).toMatchObject({
      id: values.id,
      exercise: "High-bar back squat",
      exerciseLabel: "Back squat",
      grade: "B",
      model: "test-model",
      videoSeconds: 9.5,
      hasThumbnail: true,
    });
    for (const secret of ["thumbnail", "userId", "geminiFile", "status", "error"]) {
      expect(view).not.toHaveProperty(secret);
    }
    expect(await getAnalysis(values.id, owner)).toEqual(view);
    expect(await getAnalysis(values.id, stranger)).toBeNull();
  });

  it("stores no grade when the video isn't an exercise", async () => {
    const owner = await createUser(db);
    const values = newAnalysis(owner);
    await reserveAnalysis(values, LIMITS);
    await claimAnalysis(values.id, owner);
    const view = await completeAnalysis(values.id, { ...RESULT, isExercise: false, exerciseKey: "other" }, { model: "m", videoSeconds: null });
    expect(view).toMatchObject({ isExercise: false, grade: null });
  });
});

describe("history and progress", () => {
  it("finds the previous result for the same lift", async () => {
    const owner = await createUser(db);
    await insertCompleted(owner, "back_squat", "D", 20);
    await insertCompleted(owner, "back_squat", "C", 10);
    await insertCompleted(owner, "deadlift", "A", 5);

    expect(await getPreviousResult(owner, "back_squat", new Date())).toMatchObject({ grade: "C" });
    expect(await getPreviousResult(owner, "back_squat", new Date(Date.now() - 15 * DAY))).toMatchObject({ grade: "D" });
    expect(await getPreviousResult(owner, "bench_press", new Date())).toBeNull();
  });

  it("gives the coach the latest session per lift, most recent first", async () => {
    const owner = await createUser(db);
    await insertCompleted(owner, "back_squat", "D", 20, "Old squat tip");
    await insertCompleted(owner, "back_squat", "B", 3, "Chest up");
    await insertCompleted(owner, "deadlift", "C", 1, "Bar close");
    const current = await insertCompleted(owner, "deadlift", "A", 0);

    const sessions = await recentSessions(owner, current);
    expect(sessions.map((s) => [s.exerciseKey, s.grade, s.corrections])).toEqual([
      ["deadlift", "C", ["Bar close"]],
      ["back_squat", "B", ["Chest up"]],
    ]);
  });

  it("lists history newest first, filtered and paged", async () => {
    const owner = await createUser(db);
    for (let day = 1; day <= 5; day++) await insertCompleted(owner, day % 2 ? "back_squat" : "deadlift", "B", day);
    await reserveAnalysis(newAnalysis(owner), LIMITS); // pending: never listed

    const page1 = await listAnalyses(owner, { limit: 2 });
    expect(page1.total).toBe(5);
    expect(page1.items).toHaveLength(2);
    expect(new Date(page1.items[0]!.createdAt) > new Date(page1.items[1]!.createdAt)).toBe(true);

    const squats = await listAnalyses(owner, { exerciseKey: "back_squat" });
    expect(squats.total).toBe(3);
    expect(squats.items.every((i) => i.exerciseKey === "back_squat")).toBe(true);
  });
});

describe("sharing", () => {
  it("only lets the owner share, hides notes, and can be revoked", async () => {
    const owner = await createUser(db, "Alex Rivera");
    const stranger = await createUser(db);
    const id = await insertCompleted(owner, "bench_press", "A", 1);
    await db.update(analysis).set({ notes: "private note" }).where(eq(analysis.id, id));
    const token = "abcdefghijklmnopqrstuvwx";

    expect(await setShareToken(id, stranger, token)).toBe(false);
    expect(await getSharedAnalysis(token)).toBeNull();

    expect(await setShareToken(id, owner, token)).toBe(true);
    const shared = await getSharedAnalysis(token);
    expect(shared).toMatchObject({ id, ownerName: "Alex", notes: null, grade: "A" });

    await setShareToken(id, owner, null);
    expect(await getSharedAnalysis(token)).toBeNull();
  });
});

describe("deleting", () => {
  it("deletes only the owner's analysis and cleans up an unfinished upload", async () => {
    const owner = await createUser(db);
    const stranger = await createUser(db);
    const pending = newAnalysis(owner);
    await reserveAnalysis(pending, LIMITS);

    expect(await deleteAnalysis(pending.id, stranger)).toBe(false);
    expect(mocks.deleteGeminiFile).not.toHaveBeenCalled();

    expect(await deleteAnalysis(pending.id, owner)).toBe(true);
    expect(mocks.deleteGeminiFile).toHaveBeenCalledWith(pending.geminiFile);
    expect(await getAnalysisStatus(pending.id, owner)).toBeNull();
  });

  it("doesn't touch Gemini for finished analyses (their video is already gone)", async () => {
    const owner = await createUser(db);
    const id = await insertCompleted(owner, "dip", "B", 1);
    expect(await deleteAnalysis(id, owner)).toBe(true);
    expect(mocks.deleteGeminiFile).not.toHaveBeenCalled();
  });

  it("removes every analysis when the account is deleted", async () => {
    const owner = await createUser(db);
    await insertCompleted(owner, "dip", "B", 1);
    await reserveAnalysis(newAnalysis(owner), LIMITS);
    await db.delete(user).where(eq(user.id, owner));
    const [{ n }] = await db.select({ n: count() }).from(analysis).where(eq(analysis.userId, owner));
    expect(n).toBe(0);
  });
});
