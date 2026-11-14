import { expect, test, type Route } from "@playwright/test";
import { alertWith, newLifter, signUp } from "./helpers";

// The browser-side flow with our API and Gemini's upload endpoint mocked:
// file checks, thumbnail capture, the direct upload, a busy coach, and the result.
const ID = "0f8fad5b-d9cb-469f-a165-70867728950e";
// Must be on Gemini's origin: the CSP only allows uploads there.
const UPLOAD_URL = "https://generativelanguage.googleapis.com/upload/v1beta/files?upload_id=e2e";

const ANALYSIS = {
  id: ID,
  createdAt: new Date().toISOString(),
  isExercise: true,
  exercise: "Bodyweight squat",
  exerciseKey: "bodyweight_squat",
  exerciseLabel: "Bodyweight squat",
  grade: "B",
  feedback: {
    summary: "Consistent reps with good depth.",
    strengths: ["Heels stay down"],
    tips: [{ title: "Keep your chest up", detail: "Brace before each rep." }],
    safetyWarning: "",
    cameraTip: "",
    progressNote: "",
  },
  notes: "Warm-up set",
  videoName: "squat.webm",
  videoSeconds: 3,
  model: "gemini-test",
  hasThumbnail: true,
  shareToken: null,
};

const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "x-goog-upload-command, x-goog-upload-offset, content-type",
};

test("analyzes a video, retrying when the coach is busy", async ({ page }) => {
  await signUp(page, newLifter());

  let created: Record<string, unknown> | null = null;
  await page.route("**/api/analyses", async (route) => {
    created = route.request().postDataJSON();
    await route.fulfill({ status: 201, json: { id: ID, uploadUrl: UPLOAD_URL } });
  });
  let uploadedBytes = 0;
  await page.route(UPLOAD_URL, async (route: Route) => {
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    uploadedBytes = route.request().postDataBuffer()?.length ?? 0;
    await route.fulfill({ status: 200, headers: cors, json: { file: { name: `files/${ID}` } } });
  });
  let runs = 0;
  await page.route(`**/api/analyses/${ID}/run`, async (route) => {
    runs++;
    if (runs === 1) {
      return route.fulfill({ status: 503, json: { error: "The coach is busy right now. Please try again in a minute.", retryable: true } });
    }
    await route.fulfill({ status: 200, json: { analysis: ANALYSIS, previous: null } });
  });

  await page.goto("/analyze");
  await expect(page.getByText("10 of 10 analyses left")).toBeVisible();
  await page.locator('input[type="file"]').setInputFiles("e2e/fixtures/squat.webm");
  await expect(page.locator("video")).toBeVisible();
  await page.getByLabel(/Anything the coach should know/).fill("Warm-up set");

  await page.getByRole("button", { name: "Analyze my form" }).click();
  await expect(alertWith(page, "coach is busy")).toBeVisible();
  await page.getByRole("button", { name: "Try again" }).click();

  await expect(page.getByRole("heading", { name: "Bodyweight squat" })).toBeVisible();
  await expect(page.getByText("Keep your chest up")).toBeVisible();
  await expect(page.getByRole("link", { name: "Open saved analysis" })).toHaveAttribute("href", `/analyses/${ID}`);

  // One upload, two runs: the retry reused the uploaded video.
  expect(runs).toBe(2);
  expect(uploadedBytes).toBeGreaterThan(10_000);
  expect(created).toMatchObject({ name: "squat.webm", type: "video/webm", notes: "Warm-up set" });
  expect(created!.duration as number).toBeGreaterThan(2);
  expect(created!.thumbnail as string).toMatch(/^\/9j\//); // a JPEG frame, base64-encoded
});

test("rejects files that aren't videos before uploading anything", async ({ page }) => {
  await signUp(page, newLifter());
  await page.goto("/analyze");
  await page.locator('input[type="file"]').setInputFiles({ name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("hi") });
  await expect(alertWith(page, "file type isn't supported")).toBeVisible();
});
