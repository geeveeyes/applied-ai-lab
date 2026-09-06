const signals = {
  urgent: 3,
  "this week": 3,
  decision: 2,
  career: 2,
  interview: 2,
  family: 2,
  health: 2,
  money: 2,
  startup: 1,
  learning: 1,
  portfolio: 1,
};

export default {
  async fetch(request) {
    if (request.method === "OPTIONS") {
      return json({}, 204);
    }

    if (request.method !== "POST") {
      return json({ error: "Use POST." }, 405);
    }

    try {
      const payload = await request.json();
      const prompt = String(payload.prompt || "").trim();
      let provider = String(payload.provider || "mock").trim();

      if (!prompt) {
        return json({ error: "Please enter a goal or decision." }, 400);
      }

      const tools = { priority_scorer: scorePrompt(prompt) };
      const context = { tools };
      let result;

      try {
        if (provider === "openai") {
          result = await callOpenAI(prompt, context);
        } else if (provider === "anthropic") {
          result = await callAnthropic(prompt, context);
        } else {
          provider = "mock";
          result = mockAnalysis(context);
        }
      } catch (error) {
        result = mockAnalysis(context);
        result.summary = `Using mock mode because ${provider} was unavailable. ${result.summary}`;
        return json({
          provider: "mock",
          requested_provider: provider,
          warning: String(error.message || error),
          result: normalize(result, tools),
        });
      }

      return json({ provider, result: normalize(result, tools) });
    } catch (error) {
      return json({ error: String(error.message || error) }, 500);
    }
  },
};

async function callOpenAI(prompt, context) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set.");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      input: [
        { role: "system", content: "You are a practical Personal Chief of Staff. Be decisive, specific, and concise." },
        { role: "user", content: buildPrompt(prompt, context) },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "chief_of_staff_response",
          schema: jsonSchema(),
          strict: true,
        },
      },
    }),
  });

  const payload = await response.json();
  if (!response.ok) throw new Error(JSON.stringify(payload));
  return extractJson(payload.output_text || extractOpenAIText(payload));
}

async function callAnthropic(prompt, context) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set.");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5",
      max_tokens: 1200,
      system: "You are a practical Personal Chief of Staff. Be decisive, specific, and concise.",
      messages: [{ role: "user", content: buildPrompt(prompt, context) }],
    }),
  });

  const payload = await response.json();
  if (!response.ok) throw new Error(JSON.stringify(payload));
  const text = (payload.content || []).filter((block) => block.type === "text").map((block) => block.text).join("\n");
  return extractJson(text);
}

function buildPrompt(prompt, context) {
  return `
User request:
${prompt}

Tool context:
${JSON.stringify(context, null, 2)}

Return exactly one JSON object with this shape:
{
  "summary": "short executive summary",
  "priorities": [
    {"title": "priority title", "why": "why this matters", "score": 1}
  ],
  "risks": [
    {"risk": "risk description", "mitigation": "mitigation"}
  ],
  "next_actions": [
    {"action": "specific next action", "timebox": "time estimate"}
  ],
  "questions": ["important question to answer"],
  "confidence": 0.0,
  "tool_results": {}
}
Do not include markdown fences or commentary outside the JSON.
`;
}

function mockAnalysis(context) {
  const score = context.tools.priority_scorer.score;
  return {
    summary: "Focus on the highest-leverage decision, reduce ambiguity quickly, and convert the situation into concrete next actions.",
    priorities: [
      { title: "Clarify the decision", why: "A sharper decision frame prevents scattered research.", score },
      { title: "Choose one visible next step", why: "A small output creates momentum and gives you something to evaluate or share.", score: Math.max(1, score - 12) },
      { title: "Timebox the research", why: "A short research window improves confidence without creating an open-ended loop.", score: Math.max(1, score - 20) },
    ],
    risks: [
      { risk: "Waiting for perfect information.", mitigation: "Pick one reversible action today." },
      { risk: "Solving too broad a problem.", mitigation: "Limit the first version to a two-minute demo." },
    ],
    next_actions: [
      { action: "Write the decision in one sentence.", timebox: "10 minutes" },
      { action: "List three success criteria and three constraints.", timebox: "20 minutes" },
      { action: "Pick one action that creates visible progress today.", timebox: "30 minutes" },
    ],
    questions: [
      "What would make this obviously successful 30 days from now?",
      "Which constraint is real, and which one is uncertainty?",
      "What is the smallest useful demo?",
    ],
    confidence: 0.68,
    tool_results: context.tools,
  };
}

function scorePrompt(prompt) {
  const text = prompt.toLowerCase();
  const matched = {};
  let rawScore = 0;
  for (const [signal, weight] of Object.entries(signals)) {
    if (text.includes(signal)) {
      matched[signal] = weight;
      rawScore += weight;
    }
  }
  const score = Math.min(100, 35 + rawScore * 8);
  const band = score >= 75 ? "high" : score >= 55 ? "medium" : "low";
  return {
    tool: "priority_scorer",
    score,
    band,
    matched_signals: matched,
    note: "Deterministic estimate based on urgency, life impact, and portfolio relevance keywords.",
  };
}

function normalize(data, tools) {
  const baseScore = tools.priority_scorer.score;
  return {
    summary: String(data.summary || "No summary returned."),
    priorities: normalizePriorities(data.priorities, baseScore),
    risks: normalizeObjects(data.risks, ["risk", "mitigation"]),
    next_actions: normalizeObjects(data.next_actions, ["action", "timebox"]),
    questions: normalizeStrings(data.questions),
    confidence: clamp(Number(data.confidence || 0.5), 0, 1),
    tool_results: tools,
  };
}

function normalizePriorities(items, baseScore) {
  return asArray(items).map((item, index) => {
    const row = typeof item === "object" && item !== null ? item : { title: String(item) };
    const score = Number(row.score);
    return {
      title: String(row.title || "Priority"),
      why: String(row.why || ""),
      score: Number.isFinite(score) ? score : Math.max(1, baseScore - index * 10),
    };
  });
}

function normalizeObjects(items, keys) {
  return asArray(items).map((item) => {
    const row = typeof item === "object" && item !== null ? item : { [keys[0]]: String(item) };
    return Object.fromEntries(keys.map((key) => [key, String(row[key] || "")]));
  });
}

function normalizeStrings(items) {
  return asArray(items).map((item) => String(item));
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === "") return [];
  return [value];
}

function extractJson(text) {
  let cleaned = String(text || "").trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?/, "").replace(/```$/, "").trim();
  }
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Model response did not contain JSON.");
    return JSON.parse(match[0]);
  }
}

function extractOpenAIText(payload) {
  const chunks = [];
  for (const item of payload.output || []) {
    for (const content of item.content || []) {
      if (content.type === "output_text" || content.type === "text") {
        chunks.push(content.text || "");
      }
    }
  }
  if (!chunks.length) throw new Error("OpenAI response did not include output text.");
  return chunks.join("\n");
}

function jsonSchema() {
  const stringItem = { type: "string" };
  return {
    type: "object",
    additionalProperties: false,
    required: ["summary", "priorities", "risks", "next_actions", "questions", "confidence", "tool_results"],
    properties: {
      summary: { type: "string" },
      priorities: { type: "array", items: { type: "object", additionalProperties: false, required: ["title", "why", "score"], properties: { title: stringItem, why: stringItem, score: { type: "number" } } } },
      risks: { type: "array", items: { type: "object", additionalProperties: false, required: ["risk", "mitigation"], properties: { risk: stringItem, mitigation: stringItem } } },
      next_actions: { type: "array", items: { type: "object", additionalProperties: false, required: ["action", "timebox"], properties: { action: stringItem, timebox: stringItem } } },
      questions: { type: "array", items: stringItem },
      confidence: { type: "number" },
      tool_results: { type: "object", additionalProperties: false, properties: {}, required: [] },
    },
  };
}

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

function clamp(value, min, max) {
  if (Number.isNaN(value)) return 0.5;
  return Math.max(min, Math.min(max, value));
}
