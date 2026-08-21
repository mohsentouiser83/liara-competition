import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { chunkDocument } from "./chunker";
import { parseMdxDocument } from "./mdx-parser";
import type { ParsedDocument } from "../types";

async function walk(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(fullPath);
    return /\.(?:md|mdx)$/i.test(entry.name) ? [fullPath] : [];
  }));
  return nested.flat();
}

export async function loadDocuments(sourceRoot: string, version: string) {
  const files = await walk(sourceRoot);
  const documents: ParsedDocument[] = [];
  for (const file of files) {
    const source = await readFile(file, "utf8");
    const relativePath = path.relative(sourceRoot, file);
    const parsed = parseMdxDocument(source, relativePath, version);
    if (parsed) documents.push(chunkDocument(parsed.metadata, parsed.markdown));
  }
  return documents;
}
