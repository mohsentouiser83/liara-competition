import { readFile } from "node:fs/promises";
import path from "node:path";
import { prepareAgentTurn } from "../src/lib/agent/agent";
import type { Intent } from "../src/types/chat";
import type { AgentToolName } from "../src/lib/agent/tools";

type Case = {
  question: string;
  expectedIntent: Intent;
  expectedTool: AgentToolName;
  expectClarification?: boolean;
  expectNoEvidence?: boolean;
};

async function main() {
  const cases = JSON.parse(await readFile(path.resolve("tests/evaluation/agent-cases.json"), "utf8")) as Case[];
  const results = [];
  for (const testCase of cases) {
    const turn = await prepareAgentTurn([{ role: "user", content: testCase.question }]);
    const success = turn.intent === testCase.expectedIntent
      && turn.tools[0]?.name === testCase.expectedTool
      && Boolean(turn.clarification) === Boolean(testCase.expectClarification)
      && (!testCase.expectNoEvidence || turn.evidence.length === 0);
    results.push({ question: testCase.question, success, intent: turn.intent, tool: turn.tools[0]?.name, evidence: turn.evidence.length, clarification: Boolean(turn.clarification) });
  }
  const passed = results.filter((result) => result.success).length;
  console.log(JSON.stringify({ passed, total: results.length, passRate: passed / results.length, results }, null, 2));
  if (passed !== results.length) process.exitCode = 1;
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
