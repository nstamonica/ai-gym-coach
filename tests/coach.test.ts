// The coaching pipeline with the Gemini client mocked: fallbacks, retries and limits.
import { ApiError, FileState } from "@google/genai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { coachVideo } from "@/lib/server/coach";
import { UserFacingError } from "@/lib/server/errors";

const mocks = vi.hoisted(() => ({ getFile: vi.fn(), generateContent: vi.fn() }));
vi.mock("@/lib/server/gemini", () => ({
  GEMINI_MODELS: ["model-a", "model-b"],
  gemini: () => ({ files: { get: mocks.getFile }, models: { generateContent: mocks.generateContent } }),
}));

const ACTIVE = {
  name: "files/abc",
  state: FileState.ACTIVE,
  uri: "https://generativelanguage.googleapis.com/v1beta/files/abc",
  mimeType: "video/mp4",
  sizeBytes: "1000000",
  videoMetadata: { videoDuration: "12.5s" },
};

const MODEL_JSON = {
  isExercise: true,
  exercise: "Back squat",
  exerciseKey: "back_squat",
  grade: "A",
  summary: "Great set.",
  strengths: [],
  tips: [],
  safetyWarning: "",
  cameraTip: "",
  progressNote: "",
};

const reply = (body: unknown) => ({ text: JSON.stringify(body), candidates: [] });
const apiError = (status: number) => new ApiError({ message: `HTTP ${status}`, status });

beforeEach(() => {
  mocks.getFile.mockReset().mockResolvedValue(ACTIVE);
  mocks.generateContent.mockReset();
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("coachVideo", () => {
  it("returns a parsed analysis, the model used and the video length", async () => {
    mocks.generateContent.mockResolvedValueOnce(reply(MODEL_JSON));
    const result = await coachVideo("files/abc");
    expect(result).toMatchObject({ model: "model-a", videoSeconds: 12.5, analysis: { grade: "A", exerciseKey: "back_squat" } });
  });

  it("sends the lifter's note and history in the prompt, with structured output", async () => {
    mocks.generateContent.mockResolvedValueOnce(reply(MODEL_JSON));
    await coachVideo("files/abc", {
      notes: "knees hurt a bit",
      history: [{ date: new Date("2026-11-01"), exercise: "Back squat", exerciseKey: "back_squat", grade: "C", corrections: ["Chest up"] }],
    });
    const request = mocks.generateContent.mock.calls[0]![0];
    expect(request.contents[1]).toContain("knees hurt a bit");
    expect(request.contents[1]).toContain("corrections given: Chest up");
    expect(request.config.responseMimeType).toBe("application/json");
    expect(request.contents[0].videoMetadata).toEqual({ fps: 2 });
  });

  it("falls back to the next model when one is overloaded", async () => {
    mocks.generateContent.mockRejectedValueOnce(apiError(503)).mockResolvedValueOnce(reply(MODEL_JSON));
    expect((await coachVideo("files/abc")).model).toBe("model-b");
  });

  it("falls back when a model returns something that isn't JSON", async () => {
    mocks.generateContent.mockResolvedValueOnce({ text: "Sure! Here's my review...", candidates: [] }).mockResolvedValueOnce(reply(MODEL_JSON));
    expect((await coachVideo("files/abc")).model).toBe("model-b");
  });

  it("asks the user to retry when every model is busy", async () => {
    mocks.generateContent.mockRejectedValue(apiError(429));
    const error = await coachVideo("files/abc").catch((e) => e);
    expect(error).toBeInstanceOf(UserFacingError);
    expect(error).toMatchObject({ status: 503, retryable: true });
  });

  it("fails with an internal error when every model rejects the request", async () => {
    mocks.generateContent.mockRejectedValue(apiError(400));
    const error = await coachVideo("files/abc").catch((e) => e);
    expect(error).not.toBeInstanceOf(UserFacingError);
  });

  it("reports an upload that doesn't exist (Gemini answers 403)", async () => {
    mocks.getFile.mockRejectedValueOnce(apiError(403));
    await expect(coachVideo("files/missing")).rejects.toMatchObject({ status: 404, retryable: false });
  });

  it("re-checks the length of the video Gemini received", async () => {
    mocks.getFile.mockResolvedValueOnce({ ...ACTIVE, videoMetadata: { videoDuration: "240s" } });
    await expect(coachVideo("files/abc")).rejects.toMatchObject({ status: 400 });
    expect(mocks.generateContent).not.toHaveBeenCalled();
  });

  it("rejects a video Gemini couldn't process", async () => {
    mocks.getFile.mockResolvedValueOnce({ ...ACTIVE, state: FileState.FAILED });
    await expect(coachVideo("files/abc")).rejects.toMatchObject({ status: 422 });
  });

  it("waits while Gemini is still processing the upload", async () => {
    vi.useFakeTimers();
    mocks.getFile.mockResolvedValueOnce({ ...ACTIVE, state: FileState.PROCESSING }).mockResolvedValueOnce(ACTIVE);
    mocks.generateContent.mockResolvedValueOnce(reply(MODEL_JSON));

    const result = coachVideo("files/abc");
    await vi.advanceTimersByTimeAsync(2_000);
    expect((await result).analysis.grade).toBe("A");
    expect(mocks.getFile).toHaveBeenCalledTimes(2);
  });
});
