import { describe, expect, it } from "vitest";
import { detectIntent } from "./intents";

describe("detectIntent", () => {
  it("detects debugging questions", () => expect(detectIntent("برنامه‌ام خطای 502 می‌دهد")).toBe("debug"));
  it("detects build goals", () => expect(detectIntent("می‌خوام Redis بسازم")).toBe("build"));
  it("defaults to documentation questions", () => expect(detectIntent("شبکه خصوصی چیست؟")).toBe("ask"));
});
