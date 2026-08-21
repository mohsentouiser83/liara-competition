import { describe, expect, it } from "vitest";
import { rerank } from "./rerank";
import { analyzeQuery } from "./query";
import type { RetrievalCandidate } from "./types";

function candidate(id: string, title: string): RetrievalCandidate {
  return {
    id, documentId: id, chunkIndex: 0, title, url: `https://docs.liara.ir/${id}`, section: title,
    headingPath: [title], content: "دامنه برنامه اتصال", tokenCount: 3, contentHash: id,
    metadata: { source: "liara-docs", title, url: `https://docs.liara.ir/${id}`, section: title, service: "paas", topic: "domains", language: "fa", version: "test", contentHash: id, sourcePath: `${id}.mdx` },
    semanticScore: 0.7, keywordScore: 0.7, metadataScore: 1, finalScore: 0
  };
}

describe("reranking intent conflicts", () => {
  it("does not rank deletion above adding for a connect-domain query", () => {
    const ranked = rerank([candidate("delete", "حذف دامنه از برنامه"), candidate("add", "اضافه کردن دامنه به برنامه")], analyzeQuery("دامنه را به برنامه وصل کن"), 2);
    expect(ranked[0]?.id).toBe("add");
  });
});
