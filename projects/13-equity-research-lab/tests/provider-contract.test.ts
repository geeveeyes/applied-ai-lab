import { afterEach, expect, it, vi } from "vitest";
import { OpenAIResearchProvider } from "../lib/providers/openai";
import { SCORE_WEIGHTS, evidenceAdjustScores } from "../lib/scoring";
import type { ResearchScores } from "../lib/types";
const keys = Object.keys(SCORE_WEIGHTS);
function response(rating: unknown) {
  return { executiveSummary: { overview: "Summary", strength: "Strength", concern: "Concern", watchFor: "Next results" }, scores: Object.fromEntries(keys.map(k => [k, rating])),
    scoreReasons: Object.fromEntries(keys.map(k => [k, "Evidence missing."])),
    highlights: [], risks: [], catalysts: [], managementCredibility: [], expectationGap: "Gap", valuationSummary: "Sensitivity only",
    analystSummary: "Missing", thesisKillers: ["EPS shortfall", "Cash flow shortfall"] };
}
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
it("rejects ambiguous numerical model scales instead of silently displaying a false verdict", async () => {
  vi.stubEnv("OPENAI_API_KEY", "test");
  vi.stubGlobal("fetch", vi.fn(async () => ({ok:true, json:async()=>({output_text:JSON.stringify(response(8))})})));
  await expect(new OpenAIResearchProvider().synthesize({})).rejects.toThrow();
});
it("maps categorical ratings deterministically and preserves neutral missing evidence", async () => {
  vi.stubEnv("OPENAI_API_KEY", "test");
  vi.stubGlobal("fetch", vi.fn(async () => ({ok:true, json:async()=>({output_text:JSON.stringify(response("Insufficient evidence"))})})));
  const result = await new OpenAIResearchProvider().synthesize({});
  const absent = Object.fromEntries(keys.map(k=>[k,0])) as ResearchScores;
  expect(Object.values(evidenceAdjustScores(result.scores, absent))).toEqual(keys.map(()=>50));
  expect(result.scoreReasons.financialPerformance).toBe("Evidence missing.");
});
