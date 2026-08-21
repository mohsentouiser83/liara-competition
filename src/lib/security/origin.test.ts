import { describe, expect, it } from "vitest";
import { hasTrustedOrigin } from "./origin";

describe("request origin protection", () => {
  it("accepts same-origin browser requests", () => {
    expect(hasTrustedOrigin(new Request("https://copilot.example/api/chat", { headers: { origin: "https://copilot.example" } }))).toBe(true);
  });
  it("rejects cross-origin browser requests", () => {
    expect(hasTrustedOrigin(new Request("https://copilot.example/api/chat", { headers: { origin: "https://evil.example" } }))).toBe(false);
  });
  it("allows server-to-server requests without Origin", () => {
    expect(hasTrustedOrigin(new Request("https://copilot.example/api/chat"))).toBe(true);
  });
});
