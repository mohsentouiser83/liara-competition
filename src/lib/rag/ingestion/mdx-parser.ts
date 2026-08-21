import { createHash } from "node:crypto";
import path from "node:path";
import type { DocumentMetadata } from "../types";

export type ParsedMdx = {
  metadata: DocumentMetadata;
  markdown: string;
};

const frameworkNames = new Set(["nextjs", "nodejs", "react", "vue", "django", "laravel", "docker", "flask", "php", "python", "dotnet", "angular", "go", "nuxt", "svelte"]);

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function stripJsx(source: string) {
  const codeBlocks: string[] = [];
  let content = source
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/```[\s\S]*?```/g, (block: string) => {
      const token = `@@CODE_BLOCK_${codeBlocks.length}@@`;
      codeBlocks.push(`\n\n${block.trim()}\n\n`);
      return token;
    })
    .replace(/<Highlight[^>]*>\s*\{`([\s\S]*?)`\}\s*<\/Highlight>/gi, (_match, code: string) => {
      const token = `@@CODE_BLOCK_${codeBlocks.length}@@`;
      codeBlocks.push(`\n\n\`\`\`\n${code.trim()}\n\`\`\`\n\n`);
      return token;
    })
    .replace(/^\s*import\b[\s\S]*?;\s*$/gm, "")
    .replace(/^\s*export\b[\s\S]*?;\s*$/gm, "")
    .replace(/<Head>[\s\S]*?<\/Head>/gi, "")
    .replace(/<Section\b([^>]*)\/>/gi, (_match, attributes: string) => {
      const title = attributes.match(/\btitle=["']([^"']+)["']/i)?.[1];
      const id = attributes.match(/\bid=["']([^"']+)["']/i)?.[1];
      return title ? `\n\n## ${title}${id ? ` {#${id}}` : ""}\n\n` : "\n\n";
    })
    .replace(/<\/?>\s*,\s*<>/g, "\n\n## روش دیگر\n\n")
    .replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, (_match, level: string, title: string) => `\n\n${"#".repeat(Number(level))} ${title}\n\n`)
    .replace(/<(?:br|hr)[^>]*\/?\s*>/gi, "\n\n")
    .replace(/<(?:video|img)\b[^>]*\/?\s*>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\{`([^`]+)`\}/g, "$1")
    .replace(/\{["']([^"']+)["']\}/g, "$1")
    .replace(/^\s*(?:tabs|content|steps|step|title|link|variant|className)\s*[:=].*$/gm, "")
    .replace(/^\s*(?:\{|\}|\[|\]|\(|\)|<>|<\/>|\),?|\],?|\};?|\);?|\.map\(.*)$/gm, "")
    .replace(/^\s*(?:\]?\.?map\([^\n]*|return\s*\(|\{[A-Za-z_$][^}\n]*\})\s*$/gm, "")
    .replace(/^[\s,;:[\]{}()/>]+$/gm, "")
    .replace(/^#{1,6}\s*$/gm, "")
    .replace(/\b(?:className|href|target|rel|src|width|controls|variant)\s*=\s*["'][^"']*["']/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  codeBlocks.forEach((block, index) => {
    content = content.replace(`@@CODE_BLOCK_${index}@@`, block);
  });
  return content.replace(/\n{3,}/g, "\n\n").trim();
}

function documentUrl(relativePath: string) {
  const withoutExtension = relativePath.replace(/\.(?:md|mdx)$/i, "").replaceAll(path.sep, "/");
  const segments = withoutExtension.split("/");
  if (segments.at(-1) === "index") segments.pop();
  return `https://docs.liara.ir/${segments.join("/")}/`;
}

function inferTopic(segments: string[], title: string) {
  const joined = `${segments.join(" ")} ${title}`.toLocaleLowerCase("fa");
  if (/error|خطا|troubleshoot|رفع/.test(joined)) return "troubleshooting";
  if (/deploy|استقرار|build/.test(joined)) return "deployment";
  if (/connect|اتصال/.test(joined)) return "connection";
  if (/quick-setup|getting-started|راه‌اندازی|شروع/.test(joined)) return "getting-started";
  if (/network|شبکه/.test(joined)) return "networking";
  return segments.at(-2) ?? segments.at(-1);
}

export function parseMdxDocument(source: string, relativePath: string, version: string): ParsedMdx | null {
  const markdown = stripJsx(source);
  const title = markdown.match(/^#\s+(.+)$/m)?.[1]?.trim()
    ?? source.match(/<title>(.*?)\s*-\s*لیارا<\/title>/i)?.[1]?.trim()
    ?? path.basename(relativePath).replace(/\.(?:md|mdx)$/i, "");
  if (!title || markdown.length < 80) return null;

  const segments = relativePath.replaceAll(path.sep, "/").split("/");
  const service = segments[0];
  const framework = segments.find((segment) => frameworkNames.has(segment.toLowerCase()));
  const url = documentUrl(relativePath);
  const contentHash = hash(markdown);
  const language = /[\u0600-\u06ff]/.test(markdown) ? "fa" : "en";

  return {
    markdown,
    metadata: {
      source: "liara-docs",
      title,
      url,
      section: title,
      service,
      framework,
      topic: inferTopic(segments, title),
      language,
      version,
      contentHash,
      sourcePath: relativePath.replaceAll(path.sep, "/")
    }
  };
}
