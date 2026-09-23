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
      if (prompt.length > 2000) {
        return json({ error: "Keep the request under 2,000 characters." }, 400);
      }

      const tools = { priority_scorer: scorePrompt(prompt) };
      const context = { tools };
      let result;
      let usage = null;

      try {
        if (provider === "openai") {
          ({ result, usage } = await callOpenAI(prompt, context));
        } else if (provider === "anthropic") {
          ({ result, usage } = await callAnthropic(prompt, context));
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

      const normalized = normalize(result, tools);
      if (usage) normalized.tool_results.provider_usage = usage;
      return json({ provider, result: normalized });
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
      store: false,
      max_output_tokens: readTokenLimit(),
      prompt_cache_key: "applied-ai-lab:chief-of-staff:v1",
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
  return {
    result: extractJson(payload.output_text || extractOpenAIText(payload)),
    usage: openAIUsage(payload),
  };
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
      max_tokens: readTokenLimit(),
      cache_control: { type: "ephemeral" },
      system: "You are a practical Personal Chief of Staff. Be decisive, specific, and concise.",
      messages: [{ role: "user", content: buildPrompt(prompt, context) }],
    }),
  });

  const payload = await response.json();
  if (!response.ok) throw new Error(JSON.stringify(payload));
  const text = (payload.content || []).filter((block) => block.type === "text").map((block) => block.text).join("\n");
  return { result: extractJson(text), usage: anthropicUsage(payload) };
}

function readTokenLimit() {
  const value = Number(process.env.MAX_OUTPUT_TOKENS || 1200);
  return Number.isInteger(value) ? Math.max(256, Math.min(value, 2000)) : 1200;
}

function openAIUsage(payload) {
  const usage = payload.usage || {};
  const details = usage.input_tokens_details || {};
  return {
    input_tokens: Number(usage.input_tokens || 0),
    cached_input_tokens: Number(details.cached_tokens || 0),
    cache_write_tokens: Number(details.cache_write_tokens || 0),
    output_tokens: Number(usage.output_tokens || 0),
  };
}

function anthropicUsage(payload) {
  const usage = payload.usage || {};
  return {
    input_tokens: Number(usage.input_tokens || 0),
    cached_input_tokens: Number(usage.cache_read_input_tokens || 0),
    cache_write_tokens: Number(usage.cache_creation_input_tokens || 0),
    output_tokens: Number(usage.output_tokens || 0),
  };
}

function buildPrompt(prompt, context) {
  return `
Return exactly one JSON object with this exact shape and exact field names:
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
Each priority must use "title", "why", and "score". Each question must be a plain string, not an object.
Do not include markdown fences or commentary outside the JSON.

User request:
${prompt}

Tool context:
${JSON.stringify(context, null, 2)}
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
    const title = firstText(row, ["title", "priority", "name", "action", "task", "focus", "area"]);
    const why = firstText(row, ["why", "reason", "rationale", "description", "details", "explanation"]);
    return {
      title: title || "Priority",
      why,
      score: Number.isFinite(score) ? score : Math.max(1, baseScore - index * 10),
    };
  });
}

function normalizeObjects(items, keys) {
  return asArray(items).map((item) => {
    const row = typeof item === "object" && item !== null ? item : { [keys[0]]: String(item) };
    return Object.fromEntries(keys.map((key) => [key, normalizeField(row, key)]));
  });
}

function normalizeStrings(items) {
  return asArray(items)
    .map((item) => {
      if (typeof item !== "object" || item === null) return String(item);
      return firstText(item, ["question", "text", "title", "prompt", "ask", "value"]);
    })
    .filter(Boolean);
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === "") return [];
  return [value];
}

function normalizeField(row, key) {
  if (key === "risk") return firstText(row, ["risk", "title", "name", "issue", "description"]);
  if (key === "mitigation") return firstText(row, ["mitigation", "recommendation", "next_step", "action", "details"]);
  if (key === "action") return firstText(row, ["action", "title", "task", "next_step", "description"]);
  if (key === "timebox") return firstText(row, ["timebox", "time", "duration", "estimate", "when"]);
  return firstText(row, [key]);
}

function firstText(row, keys) {
  for (const key of keys) {
    const value = row[key];
    if (value === undefined || value === null || value === "") continue;
    if (typeof value === "object") {
      const nested = firstText(value, ["text", "title", "value", "description"]);
      if (nested) return nested;
      continue;
    }
    return String(value);
  }
  return "";
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
