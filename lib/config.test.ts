import { describe, expect, it } from "vitest";
import { geminiVideoType } from "./config";

describe("geminiVideoType", () => {
  it("maps iPhone QuickTime videos to the type Gemini expects", () => {
    expect(geminiVideoType("video/quicktime", "IMG_0001.MOV")).toBe("video/mov");
  });

  it("passes supported types through", () => {
    expect(geminiVideoType("video/mp4", "set.mp4")).toBe("video/mp4");
    expect(geminiVideoType("VIDEO/WEBM", "set.webm")).toBe("video/webm");
  });

  it("falls back to the file extension when the browser reports no type", () => {
    expect(geminiVideoType("", "clip.MOV")).toBe("video/mov");
    expect(geminiVideoType("application/octet-stream", "clip.m4v")).toBe("video/mp4");
  });

  it("rejects files that aren't videos", () => {
    expect(geminiVideoType("image/png", "photo.png")).toBeNull();
    expect(geminiVideoType("", "notes")).toBeNull();
  });
});
