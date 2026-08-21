import type { EvidenceDocument } from "@/lib/ai/provider";

export function mapEvidenceSources(evidence: EvidenceDocument[]) {
  const seen = new Set<string>();
  return evidence.flatMap((document) => {
    const key = `${document.title}|${document.url}`;
    if (seen.has(key)) return [];
    seen.add(key);
    return [{ id: document.id, title: document.title, url: document.url, section: document.section }];
  });
}
