import type { QueryAnalysis } from "./query";
import type { RetrievalCandidate } from "./types";

function metadataMatch(candidate: RetrievalCandidate, query: QueryAnalysis) {
  let score = 0;
  if (query.service && candidate.metadata.service === query.service) score += 1;
  if (query.framework && candidate.metadata.framework === query.framework) score += 1;
  if (query.topic && candidate.metadata.topic === query.topic) score += 0.65;
  if (query.error && candidate.content.toLocaleLowerCase("fa").includes(query.error)) score += 1;
  return Math.min(1, score / 2);
}

export function rerank(candidates: RetrievalCandidate[], query: QueryAnalysis, limit = 5) {
  const ranked = candidates
    .map((candidate) => {
      const metadataScore = Math.max(candidate.metadataScore, metadataMatch(candidate, query));
      const normalizedTitle = candidate.title.toLocaleLowerCase("fa");
      const titleOverlap = Math.min(0.2, query.terms.filter((term) => normalizedTitle.includes(term)).length * 0.05);
      const topicBoost = query.topic && candidate.metadata.topic === query.topic ? 0.1 : 0;
      const intentMismatch = (
        (!query.normalized.includes("حذف") && normalizedTitle.includes("حذف"))
        || (!query.normalized.includes("انتقال") && normalizedTitle.includes("انتقال"))
      ) ? 0.18 : 0;
      const finalScore = candidate.semanticScore * 0.38 + candidate.keywordScore * 0.32 + metadataScore * 0.3 + titleOverlap + topicBoost - intentMismatch;
      return { ...candidate, metadataScore, finalScore: Math.min(1, finalScore) };
    })
    .filter((candidate) => candidate.finalScore >= 0.08)
    .sort((a, b) => b.finalScore - a.finalScore);

  const selected: RetrievalCandidate[] = [];
  const perDocument = new Map<string, number>();
  for (const candidate of ranked) {
    const count = perDocument.get(candidate.documentId) ?? 0;
    if (count >= 2) continue;
    selected.push(candidate);
    perDocument.set(candidate.documentId, count + 1);
    if (selected.length === limit) break;
  }
  return selected;
}
