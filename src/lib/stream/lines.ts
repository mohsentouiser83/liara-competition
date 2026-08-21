export async function* readUtf8Lines(
  reader: ReadableStreamDefaultReader<Uint8Array>
): AsyncGenerator<string> {
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) yield line.replace(/\r$/, "");
    }

    buffer += decoder.decode();
    if (buffer) yield buffer.replace(/\r$/, "");
  } finally {
    reader.releaseLock();
  }
}
