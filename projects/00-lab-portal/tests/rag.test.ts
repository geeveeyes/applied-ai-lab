import { describe, expect, it } from "vitest";
import cases from "../data/cases.json";
import { ask } from "../lib/ask";
import { REFUSAL, validate } from "../lib/rag/answer";
import { chunkDoc } from "../lib/rag/chunk";
import { Mode } from "../lib/rag/index";
import { sampleIndex } from "../lib/rag/sample";
import { tokens } from "../lib/rag/tokens";

type Case = { q: string; source: string | null; contains: string | null };
const CASES = cases as Case[];

function retrieval(mode: Mode) {
  const ranks = CASES.filter((c) => c.source).map((c) => {
    const i = sampleIndex().search(c.q, 4, mode).findIndex((h) => h.source === c.source && h.text.toLowerCase().includes(c.contains!.toLowerCase()));
    return i < 0 ? null : i + 1;
  });
  return { hit: ranks.filter(Boolean).length / ranks.length, mrr: ranks.reduce((a: number, r) => a + (r ? 1 / r : 0), 0) / ranks.length };
}

describe("RAG core (TypeScript port)", () => {
  it("normalizes 401(k) and stems plurals", () => {
    expect(tokens("What is the 401(k) match?")).toContain("401k");
    expect(tokens("meetings")).toEqual(tokens("meeting"));
  });
  it("keeps headings on chunks", () => {
    expect(chunkDoc({ source: "a.md", text: "# T\n\n## Part\n\nBody text here." })[0].heading).toBe("Part");
  });
  it("matches Python retrieval quality on the shared 27-question set", () => {
    expect(CASES.length).toBeGreaterThanOrEqual(25);
    const m = retrieval("hybrid");
    console.log("hybrid", m);
    expect(m.hit).toBeGreaterThanOrEqual(0.9);
    expect(m.mrr).toBeGreaterThanOrEqual(0.8);
  });
  it("answers correctly and refuses unanswerable questions", () => {
    let correct = 0, answerable = 0;
    for (const c of CASES) {
      const r = ask(c.q, "hybrid");
      if (!c.source) { expect(r.answer).toBe(REFUSAL); continue; }
      answerable++;
      correct += r.sources.some((h) => r.citations.includes(h.id) && h.source === c.source && h.text.toLowerCase().includes(c.contains!.toLowerCase())) ? 1 : 0;
    }
    console.log("answer_correct", correct / answerable);
    expect(correct / answerable).toBeGreaterThanOrEqual(0.75);
  });
  it("drops invalid citations", () => {
    expect(validate({ answer: "Yes [C1] [C9]", citations: ["C1", "C9"] }, [{ id: "C1" }])).toEqual({ answer: "Yes [C1]", citations: ["C1"] });
    expect(validate({ answer: "Made up", citations: ["C9"] }, [{ id: "C1" }]).answer).toBe(REFUSAL);
  });
  it("validates input", () => {
    expect(() => ask("hi", "hybrid")).toThrow();
    expect(() => ask("x".repeat(600), "hybrid")).toThrow();
    expect(() => ask("a valid question", "bogus")).toThrow();
  });
});
