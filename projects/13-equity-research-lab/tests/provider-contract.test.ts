import { afterEach, expect, it, vi } from "vitest";
import { factorKeys } from "../lib/investment";
import { OpenAIResearchProvider } from "../lib/providers/openai";
function response(rating: unknown) {
  return { investmentCase: { valuationBasis: "Unavailable", valuationBenchmark: "Missing", factors: Object.fromEntries(factorKeys.map(k => [k, { rating, reason: "Missing", sources: [], evidenceDate: "" }])), growthOutlook: "Unknown", strongestCounterargument: "Missing evidence", timing: "Wait", changeMind: "Get evidence" }, executiveSummary: { overview: "Summary", strength: "Strength", concern: "Concern", watchFor: "Next results" },
    highlights: [], risks: [], catalysts: [], managementCredibility: [], expectationGap: "Gap", valuationSummary: "DCF critique",
    analystSummary: "Missing", thesisKillers: ["EPS shortfall", "Cash flow shortfall"] };
}
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
it("rejects numeric or unknown factor scales instead of silently displaying a false verdict", async () => {
  vi.stubEnv("OPENAI_API_KEY", "test");
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ output_text: JSON.stringify(response(8)) }) })));
  await expect(new OpenAIResearchProvider().synthesize({})).rejects.toThrow();
});
it("parses the six-factor contract; the legacy 12-dimension scorecard is no longer requested", async () => {
  vi.stubEnv("OPENAI_API_KEY", "test");
  const fetch = vi.fn(async () => ({ ok: true, json: async () => ({ output_text: JSON.stringify(response("Unknown")) }) }));
  vi.stubGlobal("fetch", fetch);
  const result = await new OpenAIResearchProvider().synthesize({});
  expect(Object.values(result.investmentCase.factors).every(f => f.rating === "Unknown")).toBe(true);
  const body = JSON.parse((fetch.mock.calls[0] as unknown as [string, { body: string }])[1].body);
  expect(body.text.format.schema.required).not.toContain("scores");
  expect(JSON.stringify(body.input)).not.toMatch(/For each score choose/);
});
