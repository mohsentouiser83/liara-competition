import { describe, expect, it } from "vitest";
import { mapEvidenceSources } from "./citations";

describe("citation mapping", () => {
  it("uses only retrieved URLs and removes duplicate document links", () => {
    const sources = mapEvidenceSources([
      { id: "1", title: "دامنه", url: "https://docs.liara.ir/domain/", section: "افزودن", content: "x" },
      { id: "2", title: "دامنه", url: "https://docs.liara.ir/domain/", section: "DNS", content: "y" }
    ]);
    expect(sources).toEqual([{ id: "1", title: "دامنه", url: "https://docs.liara.ir/domain/", section: "افزودن" }]);
  });
});
