import { Hit } from "./index";
import { tokens } from "./tokens";

export const REFUSAL = "I couldn't find this in your documents.";
export const MIN_COVERAGE = 0.4;
export const MIN_CHUNK_COVERAGE = 0.3; // IDF-weighted share of question terms found in the best chunk

export type Answer = { answer: string; citations: string[] };

/** Extractive, cited answer; refuses unless the evidence covers enough of the question. */
export function mockAnswer(question: string, hits: Hit[]): Answer {
  const q = new Set(tokens(question));
  if (!hits.length || Math.max(...hits.map((h) => h.coverage)) < MIN_CHUNK_COVERAGE) return { answer: REFUSAL, citations: [] };
  const scored: [number, string, string][] = [];
  for (const h of hits) {
    for (const sent of h.text.split(/(?<=[.!?])\s+/)) {
      const overlap = tokens(sent).filter((t, i, a) => q.has(t) && a.indexOf(t) === i).length;
      if (overlap) scored.push([overlap, h.id, sent.trim()]);
    }
  }
  scored.sort((a, b) => b[0] - a[0]);
  if (!scored.length || scored[0][0] / Math.max(q.size, 1) < MIN_COVERAGE) return { answer: REFUSAL, citations: [] };
  const best = scored.slice(0, 2);
  return { answer: best.map(([, c, s]) => `${s} [${c}]`).join(" "), citations: [...new Set(best.map(([, c]) => c))].sort((a, b) => +a.slice(1) - +b.slice(1)) };
}

/** Drop citations that don't point at a retrieved chunk; an uncited answer becomes a refusal. */
export function validate(result: Answer, hits: { id: string }[]): Answer {
  const ids = new Set(hits.map((h) => h.id));
  const citations = result.citations.filter((c) => ids.has(c));
  const answer = result.answer.replace(/\[(C\d+)\]/g, (m, id) => (ids.has(id) ? m : "")).trim();
  if (!citations.length || !answer) return { answer: REFUSAL, citations: [] };
  return { answer, citations: [...new Set(citations)].sort((a, b) => +a.slice(1) - +b.slice(1)) };
}
