import { createHash } from "node:crypto";
import type { DocumentMetadata, IndexedChunk, ParsedDocument } from "../types";

type Unit = { headingPath: string[]; section: string; anchor?: string; content: string };

const TARGET_CHARS = 1200;
const MAX_CHARS = 2200;

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function documentId(metadata: DocumentMetadata) {
  return hash(`${metadata.source}:${metadata.sourcePath}`).slice(0, 32);
}

function splitLongText(content: string) {
  if (content.length <= MAX_CHARS) return [content];
  const sentences = content.split(/(?<=[.!؟؛])\s+/u);
  const parts: string[] = [];
  let current = "";
  for (const sentence of sentences) {
    if (current && current.length + sentence.length + 1 > MAX_CHARS) {
      parts.push(current.trim());
      current = "";
    }
    if (sentence.length > MAX_CHARS) {
      for (let index = 0; index < sentence.length; index += MAX_CHARS) parts.push(sentence.slice(index, index + MAX_CHARS));
    } else {
      current += `${current ? " " : ""}${sentence}`;
    }
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

function semanticUnits(markdown: string, title: string): Unit[] {
  const lines = markdown.split("\n");
  const headings: string[] = [title];
  const anchors: Array<string | undefined> = [];
  const units: Unit[] = [];
  let buffer: string[] = [];
  let inCode = false;

  const flush = () => {
    const content = buffer.join("\n").trim();
    if (content) {
      for (const part of splitLongText(content)) units.push({ headingPath: [...headings], section: headings.at(-1) ?? title, anchor: anchors.at(headings.length - 1), content: part });
    }
    buffer = [];
  };

  for (const line of lines) {
    if (/^```/.test(line.trim())) {
      inCode = !inCode;
      buffer.push(line);
      continue;
    }
    const heading = !inCode ? line.match(/^(#{1,6})\s+(.+)$/) : null;
    if (heading) {
      flush();
      const level = heading[1]!.length;
      const parsedTitle = heading[2]!.trim();
      const anchor = parsedTitle.match(/\s+\{#([^}]+)\}$/)?.[1];
      const cleanTitle = parsedTitle.replace(/\s+\{#[^}]+\}$/, "");
      headings.splice(level - 1);
      anchors.splice(level - 1);
      // MDX documents sometimes skip heading levels (for example h1 -> h3).
      // Append at the nearest valid depth so JSON serialization cannot create
      // sparse arrays that turn into null entries in the production index.
      const insertionIndex = Math.min(level - 1, headings.length);
      headings[insertionIndex] = cleanTitle;
      anchors[insertionIndex] = anchor;
      headings.length = insertionIndex + 1;
      anchors.length = insertionIndex + 1;
      continue;
    }
    if (!inCode && !line.trim()) {
      if (buffer.some((item) => item.trim())) flush();
      continue;
    }
    buffer.push(line);
  }
  flush();
  return units;
}

export function chunkDocument(metadata: DocumentMetadata, markdown: string): ParsedDocument {
  const id = documentId(metadata);
  const units = semanticUnits(markdown, metadata.title);
  const grouped: Unit[] = [];
  let current: Unit | undefined;

  for (const unit of units) {
    const sameSection = current?.section === unit.section;
    if (current && sameSection && current.content.length + unit.content.length + 2 <= TARGET_CHARS) {
      current.content += `\n\n${unit.content}`;
    } else {
      if (current) grouped.push(current);
      current = { ...unit };
    }
  }
  if (current) grouped.push(current);

  const usefulGroups = grouped.filter((unit) => !/^(?:همچنین بخوانید|همچنین مطالعه کنید|مطالب مرتبط|see also)[:：]?$/i.test(unit.section.trim()));
  const chunks: IndexedChunk[] = usefulGroups.map((unit, chunkIndex) => {
    const contentHash = hash(unit.content);
    return {
      id: hash(`${id}:${chunkIndex}:${unit.section}`).slice(0, 40),
      documentId: id,
      chunkIndex,
      title: metadata.title,
      url: unit.anchor ? `${metadata.url}#${unit.anchor}` : metadata.url,
      section: unit.section,
      headingPath: unit.headingPath.filter((heading): heading is string => typeof heading === "string" && heading.length > 0),
      anchor: unit.anchor,
      content: unit.content,
      tokenCount: Math.ceil(unit.content.length / 4),
      contentHash,
      metadata: { ...metadata, section: unit.section }
    };
  });

  return { id, metadata, chunks };
}
