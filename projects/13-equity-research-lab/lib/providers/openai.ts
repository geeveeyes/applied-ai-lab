import { z } from "zod";
import type { ResearchScores } from "../types";

const scoreKeys = [
  "businessQuality", "financialPerformance", "growthRunway", "industryMoat",
  "leadershipGovernance", "valuation", "analystExpectations", "sentimentPositioning",
  "technicalLiquidity", "catalysts", "riskResilience", "portfolioFit",
] as const;

const ratingValues = ["Very weak", "Weak", "Neutral", "Strong", "Very strong", "Insufficient evidence"] as const;
const ratingScore = { "Very weak": 10, "Weak": 30, "Neutral": 50, "Strong": 70, "Very strong": 90, "Insufficient evidence": 50 };
const ratingSchema = z.enum(ratingValues);
const scoreShape = Object.fromEntries(scoreKeys.map(key => [key, ratingSchema])) as Record<typeof scoreKeys[number], typeof ratingSchema>;
const reasonShape = Object.fromEntries(scoreKeys.map(key => [key, z.string()])) as Record<typeof scoreKeys[number], z.ZodString>;

const schema = z.object({
  scores: z.object(scoreShape),
  scoreReasons: z.object(reasonShape),
  highlights: z.array(z.string()).max(6),
  risks: z.array(z.string()).max(6),
  catalysts: z.array(z.string()).max(6),
  managementCredibility: z.array(z.string()).max(5),
  expectationGap: z.string(),
  valuationSummary: z.string(),
  analystSummary: z.string(),
  thesisKillers: z.array(z.string()).min(2).max(6),

});

export type AIResearch = {
  scores: ResearchScores;
  scoreReasons: Record<keyof ResearchScores, string>;
  highlights: string[];
  risks: string[];
  catalysts: string[];
  managementCredibility: string[];
  expectationGap: string;
  valuationSummary: string;
  analystSummary: string;
  thesisKillers: string[];

};

function jsonSchema() {
  const scoreProperties = Object.fromEntries(scoreKeys.map((key) => [key, { type: "string", enum: [...ratingValues] }]));
  return {
    type: "object",
    additionalProperties: false,
    required: [
      "scores","scoreReasons","highlights","risks","catalysts","managementCredibility",
      "expectationGap","valuationSummary","analystSummary","thesisKillers",
    ],
    properties: {
      scores: { type: "object", additionalProperties: false, required: [...scoreKeys], properties: scoreProperties },
      scoreReasons: { type: "object", additionalProperties: false, required: [...scoreKeys], properties: Object.fromEntries(scoreKeys.map(key => [key, { type: "string" }])) },
      highlights: { type: "array", maxItems: 6, items: { type: "string" } },
      risks: { type: "array", maxItems: 6, items: { type: "string" } },
      catalysts: { type: "array", maxItems: 6, items: { type: "string" } },
      managementCredibility: { type: "array", maxItems: 5, items: { type: "string" } },
      expectationGap: { type: "string" },
      valuationSummary: { type: "string" },
      analystSummary: { type: "string" },
      thesisKillers: { type: "array", minItems: 2, maxItems: 6, items: { type: "string" } },

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
        prompt_cache_key: "applied-ai-lab:equity-research:v5.1",
        input: [
          {
            role: "system",
            content: [{
              type: "input_text",
              text: `You are the Equity Research Lab research engine. Use ONLY the supplied evidence packet.
Never invent a price, financial metric, analyst call, catalyst, valuation input, historical fact, management claim, competitive claim, or estimate timestamp.
Analyst-estimate dates are FISCAL PERIOD END DATES, not publication dates.
Price-target consensus is sentiment evidence only, never a valuation anchor.
For each score choose exactly one rating: Very weak, Weak, Neutral, Strong, Very strong, or Insufficient evidence. Never return numeric scores. Use Insufficient evidence for dimensions without direct evidence, especially moat, leadership and portfolio fit. Supply a short scoreReasons explanation for every rating, naming the supplied metric/period or the specific missing evidence. Missing evidence is not evidence of poor business quality. Code converts ratings to 10/30/50/70/90; insufficient evidence is neutral 50 and evidence coverage shrinks supported ratings toward neutral. The packet includes per-dimension evidence coverage. Rate ONLY what the evidence supports. Do not use general pretrained knowledge to fill missing moat, leadership, governance, customer, regulatory, product-roadmap, or competitive evidence.
Scenario arithmetic is already supplied in calibratedScenarios. Discuss these exact sensitivities only; never invent prices, multiples, probabilities, or different EPS periods. The base is price-neutral by construction, not evidence that the stock is fairly valued. No independent valuation multiple is established, so do not infer cheapness from a low horizon P/E alone.
The reverse DCF is a deterministic expectations test supplied by code. Discuss its implication and limitations; do not recompute it or present it as intrinsic value.
Evidence confidence is fully deterministic and is not a probability of investment success.
Do not recommend options because no live options chain/Greeks are supplied. Catalysts must be operating events supported by the packet; a stock reaching an analyst target or moving above an average is not a fundamental catalyst. Do not treat a mechanical reverse-DCF growth rate as a required annual company forecast: annual CFO minus cash capex may be temporarily depressed by investment, and no normalized cash-flow base has been established.
Scenario weights are illustrative, not empirical probabilities.
Business quality is not the same thing as stock attractiveness.
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
    const parsed = schema.parse(JSON.parse(text));
    return { ...parsed, scores: Object.fromEntries(scoreKeys.map(key => [key, ratingScore[parsed.scores[key]]])) as ResearchScores };
  }
}
