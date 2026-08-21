import { readFile } from "node:fs/promises";
import path from "node:path";
import { retrieveLocal } from "../src/lib/rag/local-index";

type Case = { question: string; expectedPath?: string; expectedPathPrefix?: string; expectNoEvidence?: boolean };

async function main() {
  const cases = JSON.parse(await readFile(path.resolve(process.cwd(), "tests/evaluation/rag-cases.json"), "utf8")) as Case[];
  let passed = 0;
  const results = [];
  for (const testCase of cases) {
    const evidence = await retrieveLocal(testCase.question, 5);
    if (!evidence) throw new Error("Local index is missing. Run pnpm docs:sync && pnpm rag:ingest first.");
    const success = testCase.expectNoEvidence
      ? evidence.length === 0
      : evidence.some((item) => testCase.expectedPath
        ? item.metadata.sourcePath === testCase.expectedPath
        : item.metadata.sourcePath.startsWith(testCase.expectedPathPrefix ?? "__missing__"));
    if (success) passed += 1;
    results.push({
      success,
      question: testCase.question,
      expected: testCase.expectNoEvidence ? "no evidence" : testCase.expectedPath ?? testCase.expectedPathPrefix,
      top: evidence.slice(0, 3).map((item) => item.metadata.sourcePath)
    });
  }
  const recallAtFive = passed / cases.length;
  console.log(JSON.stringify({ passed, total: cases.length, recallAtFive, results }, null, 2));
  if (recallAtFive < 0.85) process.exitCode = 1;
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
