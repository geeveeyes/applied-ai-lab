import { z } from "zod";
import type { ResearchScores, OptionIdea } from "../types";

const scoreKeys = [
  "businessQuality", "financialPerformance", "growthRunway", "industryMoat",
  "leadershipGovernance", "valuation", "analystExpectations", "sentimentPositioning",
  "technicalLiquidity", "catalysts", "riskResilience", "portfolioFit",
] as const;

const scoreShape = Object.fromEntries(scoreKeys.map((key) => [key, z.number().min(0).max(100)])) as {
  [K in typeof scoreKeys[number]]: z.ZodNumber
};

const schema = z.object({
  analysisConfidence: z.number().min(0).max(100),
  scores: z.object(scoreShape),
  highlights: z.array(z.string()).max(6),
  risks: z.array(z.string()).max(6),
  catalysts: z.array(z.string()).max(6),
  managementCredibility: z.array(z.string()).max(5),
  expectationGap: z.string(),
  valuationSummary: z.string(),
  analystSummary: z.string(),
  scenarios: z.array(z.object({
    label: z.enum(["Bull", "Base", "Bear"]),
    probability: z.number().min(0).max(100),
    epsFactor: z.number().min(0.25).max(2),
    peMultiple: z.number().min(5).max(80),
    thesis: z.array(z.string()).min(1).max(5),
  })).length(3),
  thesisKillers: z.array(z.string()).min(2).max(6),
  optionIdeas: z.array(z.object({
    strategy: z.string(),
    fit: z.enum(["Strong", "Moderate", "Weak"]),
    rationale: z.string(),
    maxLoss: z.string(),
    capitalProfile: z.string(),
    volatilityView: z.string(),
  })).min(1).max(4),
  expectedReturn12m: z.object({ low: z.number(), high: z.number() }),
  benchmark: z.string(),
});

export type AIResearch = {
  analysisConfidence: number;
  scores: ResearchScores;
  highlights: string[];
  risks: string[];
  catalysts: string[];
  managementCredibility: string[];
  expectationGap: string;
  valuationSummary: string;
  analystSummary: string;
  scenarios: Array<{
    label: "Bull" | "Base" | "Bear";
    probability: number;
    epsFactor: number;
    peMultiple: number;
    thesis: string[];
  }>;
  thesisKillers: string[];
  optionIdeas: OptionIdea[];
  expectedReturn12m: { low: number; high: number };
  benchmark: string;
};

function jsonSchema() {
  const scoreProperties = Object.fromEntries(scoreKeys.map((key) => [key, { type: "number", minimum: 0, maximum: 100 }]));
  return {
    type: "object",
    additionalProperties: false,
    required: [
      "analysisConfidence","scores","highlights","risks","catalysts","managementCredibility",
      "expectationGap","valuationSummary","analystSummary","scenarios","thesisKillers",
      "optionIdeas","expectedReturn12m","benchmark"
    ],
    properties: {
      analysisConfidence: { type: "number", minimum: 0, maximum: 100 },
      scores: { type: "object", additionalProperties: false, required: [...scoreKeys], properties: scoreProperties },
      highlights: { type: "array", maxItems: 6, items: { type: "string" } },
      risks: { type: "array", maxItems: 6, items: { type: "string" } },
      catalysts: { type: "array", maxItems: 6, items: { type: "string" } },
      managementCredibility: { type: "array", maxItems: 5, items: { type: "string" } },
      expectationGap: { type: "string" },
      valuationSummary: { type: "string" },
      analystSummary: { type: "string" },
      scenarios: {
        type: "array", minItems: 3, maxItems: 3,
        items: {
          type: "object", additionalProperties: false,
          required: ["label","probability","epsFactor","peMultiple","thesis"],
          properties: {
            label: { type: "string", enum: ["Bull","Base","Bear"] },
            probability: { type: "number", minimum: 0, maximum: 100 },
            epsFactor: { type: "number", minimum: 0.25, maximum: 2 },
            peMultiple: { type: "number", minimum: 5, maximum: 80 },
            thesis: { type: "array", minItems: 1, maxItems: 5, items: { type: "string" } },
          },
        },
      },
      thesisKillers: { type: "array", minItems: 2, maxItems: 6, items: { type: "string" } },
      optionIdeas: {
        type: "array", minItems: 1, maxItems: 4,
        items: {
          type: "object", additionalProperties: false,
          required: ["strategy","fit","rationale","maxLoss","capitalProfile","volatilityView"],
          properties: {
            strategy: { type: "string" },
            fit: { type: "string", enum: ["Strong","Moderate","Weak"] },
            rationale: { type: "string" },
            maxLoss: { type: "string" },
            capitalProfile: { type: "string" },
            volatilityView: { type: "string" },
          },
        },
      },
      expectedReturn12m: {
        type: "object", additionalProperties: false, required: ["low","high"],
        properties: { low: { type: "number" }, high: { type: "number" } },
      },
      benchmark: { type: "string" },
    },
  };
}

function extractText(payload: any) {
  if (typeof payload?.output_text === "string" && payload.output_text) return payload.output_text;
  const chunks: string[] = [];
  for (const item of payload?.output ?? []) {
    for (const block of item?.content ?? []) if (block?.type === "output_text" && block?.text) chunks.push(block.text);
  }
  return chunks.join("\n");
}

export class OpenAIResearchProvider {
  async synthesize(evidence: unknown): Promise<AIResearch> {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error("OPENAI_API_KEY is not configured");

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-5.6-terra",
        store: false,
        reasoning: { effort: "medium" },
        prompt_cache_key: "applied-ai-lab:equity-research:v2",
        input: [
          {
            role: "system",
            content: [{
              type: "input_text",
              text: `You are the Equity Research Lab research engine. Use ONLY the supplied evidence packet.
Never invent a price, financial metric, analyst call, catalyst, valuation input, historical fact, or estimate timestamp.
Analyst-estimate "date" values are FISCAL PERIOD END DATES, not publication dates.
Only compare forecast periods with actual periods after the evidence packet has already filtered them.
Price-target consensus is sentiment evidence only. NEVER use sell-side price targets as bull/base/bear fair values or as the anchor for a valuation.
For profitable companies with a usable nearest-forward EPS estimate, scenario valuation must use explicit EPS-factor x P/E assumptions. epsFactor scales the supplied nearest-forward EPS; peMultiple is the terminal/forward multiple used to produce scenario fair value in deterministic code.
Scores are evidence-based judgments from 0-100. Missing evidence should lower the relevant dimension, not cause invented facts.
analysisConfidence is your confidence in the qualitative interpretation, not overall data coverage. Data coverage is calculated separately in code.
Do not recommend a specific option contract because no live options chain/Greeks are supplied.
The three scenario probabilities must sum to approximately 100.
Business quality is not the same thing as stock attractiveness. Focus on what expectations are embedded in the price.
This is research support, not a guarantee of returns.`
            }],
          },
          { role: "user", content: [{ type: "input_text", text: JSON.stringify(evidence) }] },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "equity_research",
            strict: true,
            schema: jsonSchema(),
          },
        },
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`OpenAI research failed: HTTP ${response.status} ${detail.slice(0, 240)}`);
    }
    const payload = await response.json();
    const text = extractText(payload);
    if (!text) throw new Error("OpenAI returned no structured research output");
    return schema.parse(JSON.parse(text));
  }
}
