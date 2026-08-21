import { describe, expect, it } from "vitest";
import { checkRateLimit } from "./rate-limit";

describe("rate limiting", () => {
  it("allows twenty requests and rejects the next one in a window", async () => {
    const key = `test-${crypto.randomUUID()}`;
    for (let index = 0; index < 20; index += 1) expect((await checkRateLimit(key)).allowed).toBe(true);
    expect((await checkRateLimit(key)).allowed).toBe(false);
  });
});
