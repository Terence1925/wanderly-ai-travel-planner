import { describe, expect, it } from "vitest";
import { safeRedirectPath } from "@/lib/safe-redirect";

const ORIGIN = "https://wanderly.example";

describe("safeRedirectPath", () => {
  it("keeps same-origin paths with query and hash", () => {
    expect(safeRedirectPath("/trip/abc?x=1#day-2", ORIGIN)).toBe("/trip/abc?x=1#day-2");
  });

  it.each([
    ["missing", null],
    ["absolute URL", "https://evil.com"],
    ["protocol-relative", "//evil.com"],
    ["backslash trick", "/\\evil.com"],
    ["encoded tab trick", "/\t/evil.com"],
    ["javascript scheme", "javascript:alert(1)"],
    ["dot-segment trick", "/.//evil.com"],
    ["encoded dot-segment trick", "/%2e//evil.com"],
  ])("falls back for %s", (_label, next) => {
    expect(safeRedirectPath(next, ORIGIN)).toBe("/trips");
  });
});
