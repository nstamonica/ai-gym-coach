// Route handler tests: real database and validation; session, Gemini and the
// coach are mocked.
import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST as runAnalysis } from "@/app/api/analyses/[id]/run/route";
import { POST as createAnalysis } from "@/app/api/analyses/route";
import type { Analysis } from "@/lib/analysis";
import { db } from "@/lib/server/db";
import { analysis } from "@/lib/server/db/schema";
import { UserFacingError } from "@/lib/server/errors";
import { createUser } from "./helpers/db";

const mocks = vi.hoisted(() => {
  process.env.DAILY_ANALYSIS_LIMIT = "2";
  return {
    user: null as { id: string; name: string; email: string } | null,
    createUploadSession: vi.fn<
      (opts: { name: string; bytes: number; mimeType: string; origin: string | null }) => Promise<string>
    >(async () => "https://upload.example/session"),
    deleteGeminiFile: vi.fn<(name: string) => Promise<void>>(async () => {}),
    coachVideo: vi.fn(),
  };
});

vi.mock("@/lib/server/db", async () => {
  const { createTestDb } = await import("./helpers/db");
  return { db: await createTestDb() };
});
vi.mock("@/lib/server/session", () => ({ userFromRequest: async () => mocks.user }));
vi.mock("@/lib/server/gemini", () => ({
  createUploadSession: mocks.createUploadSession,
  deleteGeminiFile: mocks.deleteGeminiFile,
}));
vi.mock("@/lib/server/coach", () => ({ coachVideo: mocks.coachVideo }));

const RESULT: Analysis = {
  isExercise: true,
  exercise: "Conventional deadlift",
  exerciseKey: "deadlift",
  grade: "C",
  feedback: { summary: "Okay.", strengths: [], tips: [], safetyWarning: "", cameraTip: "", progressNote: "" },
};

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]).toString("base64");
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 1, 2, 3, 4]).toString("base64");

function create(body: unknown) {
  return createAnalysis(
    new NextRequest("http://localhost/api/analyses", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "content-type": "application/json", origin: "http://localhost" },
    }),
  );
}

function run(id: string) {
  return runAnalysis(new NextRequest(`http://localhost/api/analyses/${id}/run`, { method: "POST" }), {
    params: Promise.resolve({ id }),
  });
}

const video = { name: "set.mov", type: "video/quicktime", size: 5_000_000, duration: 20 };

async function signIn() {
  const id = await createUser(db);
  mocks.user = { id, name: "Test Lifter", email: `${id}@example.com` };
  return id;
}

async function statusOf(id: string) {
  const [row] = await db.select({ status: analysis.status }).from(analysis).where(eq(analysis.id, id));
  return row?.status;
}

beforeEach(() => {
  mocks.user = null;
  mocks.createUploadSession.mockClear();
  mocks.deleteGeminiFile.mockClear();
  mocks.coachVideo.mockReset();
});

describe("POST /api/analyses", () => {
  it("requires a signed-in user", async () => {
    expect((await create(video)).status).toBe(401);
  });

  it.each([
    ["a non-video file", { ...video, name: "notes.txt", type: "text/plain" }, "file type"],
    ["a file over the size limit", { ...video, size: 500 * 1024 * 1024 }, "under 100 MB"],
    ["a video over the length limit", { ...video, duration: 300 }, "90 seconds"],
    ["a malformed body", { name: 42 }, "Invalid request"],
  ])("rejects %s", async (_label, body, message) => {
    await signIn();
    const res = await create(body);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain(message);
    expect(mocks.createUploadSession).not.toHaveBeenCalled();
  });

  it("records a pending analysis and starts an upload under a server-chosen name", async () => {
    await signIn();
    const res = await create({ ...video, notes: "  heavy day  ", thumbnail: JPEG });
    expect(res.status).toBe(201);
    const { id, uploadUrl } = await res.json();
    expect(uploadUrl).toBe("https://upload.example/session");
    expect(mocks.createUploadSession).toHaveBeenCalledWith({
      name: `files/${id}`,
      bytes: video.size,
      mimeType: "video/mov",
      origin: "http://localhost",
    });

    const [row] = await db.select().from(analysis).where(eq(analysis.id, id));
    expect(row).toMatchObject({ status: "pending", notes: "heavy day", videoName: "set.mov", geminiFile: `files/${id}` });
    expect(row!.thumbnail).not.toBeNull();
  });

  it("drops a thumbnail that isn't really a JPEG", async () => {
    await signIn();
    const { id } = await (await create({ ...video, thumbnail: PNG })).json();
    const [row] = await db.select({ thumbnail: analysis.thumbnail }).from(analysis).where(eq(analysis.id, id));
    expect(row!.thumbnail).toBeNull();
  });

  it("returns 429 with Retry-After once the daily limit is used", async () => {
    await signIn();
    expect((await create(video)).status).toBe(201);
    expect((await create(video)).status).toBe(201);
    const res = await create(video);
    expect(res.status).toBe(429);
    expect(Number(res.headers.get("Retry-After"))).toBeGreaterThan(0);
    expect((await res.json()).error).toContain("all 2 analyses");
  });

  it("gives the quota back when the upload can't start", async () => {
    await signIn();
    mocks.createUploadSession.mockRejectedValueOnce(new Error("Gemini is down"));
    const res = await create(video);
    expect(res.status).toBe(502);
    // Two more still fit in the limit of 2: the failed attempt doesn't count.
    expect((await create(video)).status).toBe(201);
    expect((await create(video)).status).toBe(201);
  });
});

describe("POST /api/analyses/:id/run", () => {
  async function uploaded() {
    const res = await create({ ...video, notes: "felt slow" });
    return (await res.json()).id as string;
  }

  it("analyzes, saves and deletes the video", async () => {
    await signIn();
    const id = await uploaded();
    mocks.coachVideo.mockResolvedValueOnce({ analysis: RESULT, model: "gemini-test", videoSeconds: 19.6 });

    const res = await run(id);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.analysis).toMatchObject({ id, grade: "C", exerciseLabel: "Deadlift", model: "gemini-test" });
    expect(body.previous).toBeNull();
    expect(mocks.coachVideo).toHaveBeenCalledWith(`files/${id}`, expect.objectContaining({ notes: "felt slow" }));
    expect(mocks.deleteGeminiFile).toHaveBeenCalledWith(`files/${id}`);
    expect(await statusOf(id)).toBe("complete");

    // Running it again returns the saved result instead of paying for a second analysis.
    const again = await run(id);
    expect(again.status).toBe(200);
    expect(mocks.coachVideo).toHaveBeenCalledTimes(1);
  });

  it("compares with the previous session of the same lift", async () => {
    await signIn();
    const first = await uploaded();
    mocks.coachVideo.mockResolvedValueOnce({ analysis: { ...RESULT, grade: "D" }, model: "m", videoSeconds: 10 });
    await run(first);

    const second = await uploaded();
    mocks.coachVideo.mockResolvedValueOnce({ analysis: { ...RESULT, grade: "B" }, model: "m", videoSeconds: 10 });
    const body = await (await run(second)).json();
    expect(body.previous).toMatchObject({ id: first, grade: "D" });
  });

  it("keeps the upload and allows a retry when the coach is busy", async () => {
    await signIn();
    const id = await uploaded();
    mocks.coachVideo.mockRejectedValueOnce(new UserFacingError("The coach is busy right now.", 503, true));

    const busy = await run(id);
    expect(busy.status).toBe(503);
    expect(await busy.json()).toEqual({ error: "The coach is busy right now.", retryable: true });
    expect(mocks.deleteGeminiFile).not.toHaveBeenCalled();
    expect(await statusOf(id)).toBe("pending");

    mocks.coachVideo.mockResolvedValueOnce({ analysis: RESULT, model: "m", videoSeconds: 10 });
    expect((await run(id)).status).toBe(200);
  });

  it("fails permanently, and cleans up, when the video can't be used", async () => {
    await signIn();
    const id = await uploaded();
    mocks.coachVideo.mockRejectedValueOnce(new UserFacingError("Please trim your video.", 400));

    const res = await run(id);
    expect(res.status).toBe(400);
    expect(await statusOf(id)).toBe("failed");
    expect(mocks.deleteGeminiFile).toHaveBeenCalledWith(`files/${id}`);
    expect((await run(id)).status).toBe(410);
  });

  it("hides unexpected errors from the user", async () => {
    await signIn();
    const id = await uploaded();
    mocks.coachVideo.mockRejectedValueOnce(new Error("socket hang up at 10.0.0.3"));
    vi.spyOn(console, "error").mockImplementationOnce(() => {});

    const res = await run(id);
    expect(res.status).toBe(500);
    expect((await res.json()).error).not.toContain("10.0.0.3");
    expect(await statusOf(id)).toBe("failed");
  });

  it("won't run someone else's analysis", async () => {
    await signIn();
    const id = await uploaded();
    await signIn(); // a different user
    expect((await run(id)).status).toBe(404);
    expect(mocks.coachVideo).not.toHaveBeenCalled();
  });

  it("returns 404 for malformed ids and 401 when signed out", async () => {
    await signIn();
    expect((await run("not-a-uuid")).status).toBe(404);
    mocks.user = null;
    expect((await run(crypto.randomUUID())).status).toBe(401);
  });
});
