import { describe, expect, it } from "vitest";
import { retrieve } from "./retrieve";

describe("retrieve", () => {
  it("ranks Redis documentation for Redis queries", () => expect(retrieve("راه‌اندازی Redis")[0]?.id).toBe("redis-quick-setup"));
  it("returns no evidence for unrelated questions", () => expect(retrieve("آب‌وهوای تهران")).toEqual([]));
  it("does not include Redis for a 502 troubleshooting query", () => expect(retrieve("خطای ۵۰۲ را بررسی کن").some((item) => item.id === "redis-quick-setup")).toBe(false));
});
