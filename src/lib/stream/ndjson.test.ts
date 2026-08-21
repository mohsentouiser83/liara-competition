import { describe, expect, it } from "vitest";
import { readChatEvents } from "./ndjson";

function stream(...chunks: string[]) {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    }
  });
}

describe("chat NDJSON parsing", () => {
  it("parses events split across chunks and keeps the final unterminated line", async () => {
    const body = stream(
      '{"type":"delta","text":"سل',
      'ام"}\n{"type":"done","sources":[]}'
    );
    const events = [];
    for await (const event of readChatEvents(body)) events.push(event);
    expect(events).toEqual([
      { type: "delta", text: "سلام" },
      { type: "done", sources: [] }
    ]);
  });

  it("rejects malformed JSON", async () => {
    const consume = async () => {
      for await (const event of readChatEvents(stream("not-json\n"))) void event;
    };
    await expect(consume()).rejects.toThrow("malformed JSON");
  });
});
