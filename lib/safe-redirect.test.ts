import { describe, expect, it } from "vitest";
import { isShareToken, isUuid } from "./ids";
import { safeRedirectPath } from "./safe-redirect";

describe("safeRedirectPath", () => {
  it("allows paths on this site, keeping the query and hash", () => {
    expect(safeRedirectPath("/history?exercise=deadlift#top")).toBe("/history?exercise=deadlift#top");
    expect(safeRedirectPath("/analyses/123")).toBe("/analyses/123");
  });

  it.each([
    ["missing", undefined],
    ["empty", ""],
    ["absolute URL", "https://evil.example"],
    ["protocol-relative URL", "//evil.example"],
    ["backslash trick", "/\\evil.example"],
    ["tab trick", "/\t/evil.example"],
    ["newline trick", "/\n/evil.example"],
    ["javascript URL", "javascript:alert(1)"],
    ["relative path", "dashboard"],
  ])("rejects a %s", (_label, target) => {
    expect(safeRedirectPath(target)).toBe("/dashboard");
  });

  it("uses the given fallback", () => {
    expect(safeRedirectPath("//evil.example", "/")).toBe("/");
  });
});

describe("ids", () => {
  it("recognizes uuids", () => {
    expect(isUuid(crypto.randomUUID())).toBe(true);
    expect(isUuid("not-a-uuid")).toBe(false);
    expect(isUuid("'; drop table analysis; --")).toBe(false);
  });

  it("recognizes share tokens", () => {
    expect(isShareToken("abcdefghijklmnopqrstuv_-")).toBe(true);
    expect(isShareToken("short")).toBe(false);
    expect(isShareToken("abcdefghijklmnopqrstuv/+")).toBe(false);
  });
});
