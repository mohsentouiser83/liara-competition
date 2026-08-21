import { describe, expect, it, vi } from "vitest";

vi.mock("./tools", () => ({
  executeAgentTool: vi.fn(async () => ({ evidence: [], execution: { name: "searchLiaraDocs", input: { query: "x", limit: 5 }, durationMs: 1, resultCount: 0 } }))
}));

import { prepareAgentTurn } from "./agent";

describe("agent turn preparation", () => {
  it("asks one high-value troubleshooting question when framework is missing", async () => {
    const result = await prepareAgentTurn([{ role: "user", content: "برنامه‌ام خطای 502 می‌دهد" }]);
    expect(result.intent).toBe("debug");
    expect(result.clarification).toContain("فریم‌ورک");
    expect(result.tools).toHaveLength(1);
  });

  it("uses recent context to complete a follow-up", async () => {
    const result = await prepareAgentTurn([
      { role: "user", content: "برنامه Next.js من خطای 502 دارد" },
      { role: "assistant", content: "لاگ را بفرستید" },
      { role: "user", content: "فرمان start اجرا نمی‌شود" }
    ]);
    expect(result.intent).toBe("debug");
    expect(result.guidance).toContain("فرضیه");
  });
});
