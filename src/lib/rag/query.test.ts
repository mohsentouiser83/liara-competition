import { describe, expect, it } from "vitest";
import { analyzeQuery } from "./query";

describe("query analysis", () => {
  it("extracts service, framework, topic, and error", () => {
    expect(analyzeQuery("برنامه Next.js روی لیارا خطای 502 می‌دهد")).toMatchObject({
      service: "paas",
      framework: "nextjs",
      topic: "troubleshooting",
      error: "502",
      inDomain: true
    });
  });

  it("rejects clearly out-of-domain queries", () => {
    expect(analyzeQuery("آب و هوای امروز تهران چیست؟").inDomain).toBe(false);
  });
});
