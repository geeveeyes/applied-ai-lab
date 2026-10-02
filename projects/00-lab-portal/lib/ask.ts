import { REFUSAL, mockAnswer, validate } from "./rag/answer";
import { MODES, Mode } from "./rag/index";
import { sampleIndex } from "./rag/sample";

export const MAX_QUESTION = 500;

export function ask(rawQuestion: unknown, rawMode: unknown) {
  const question = String(rawQuestion ?? "").replace(/\s+/g, " ").trim();
  if (question.length < 3) throw new Error("Ask a question of at least 3 characters.");
  if (question.length > MAX_QUESTION) throw new Error(`Questions are limited to ${MAX_QUESTION} characters.`);
  const mode = String(rawMode ?? "hybrid") as Mode;
  if (!MODES.includes(mode)) throw new Error("Unknown retrieval mode.");
  const hits = sampleIndex().search(question, 4, mode);
  const result = hits.length ? validate(mockAnswer(question, hits), hits) : { answer: REFUSAL, citations: [] };
  return { provider: "mock", mode, ...result, sources: hits, usage: null };
}
