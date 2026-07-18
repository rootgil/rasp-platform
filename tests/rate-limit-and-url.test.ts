import { describe, it, expect } from "vitest";
import { sanitizeCallbackUrl } from "@/lib/safe-url";
import { checkRateLimit, clearRateLimitStore } from "@/lib/rate-limit";

describe("sanitizeCallbackUrl", () => {
  it("allows relative paths", () => {
    expect(sanitizeCallbackUrl("/dashboard/events")).toBe("/dashboard/events");
  });

  it("rejects open redirects", () => {
    expect(sanitizeCallbackUrl("https://evil.example")).toBe("/dashboard");
    expect(sanitizeCallbackUrl("//evil.example")).toBe("/dashboard");
    expect(sanitizeCallbackUrl("javascript:alert(1)")).toBe("/dashboard");
  });
});

describe("checkRateLimit", () => {
  it("blocks after limit", () => {
    clearRateLimitStore();
    const key = `test-${Date.now()}`;
    expect(checkRateLimit(key, 2, 60_000).ok).toBe(true);
    expect(checkRateLimit(key, 2, 60_000).ok).toBe(true);
    const third = checkRateLimit(key, 2, 60_000);
    expect(third.ok).toBe(false);
  });
});
