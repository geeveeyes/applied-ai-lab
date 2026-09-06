const form = document.querySelector("#ask-form");
const statusEl = document.querySelector("#status");
const button = document.querySelector("#run-button");
const notice = document.querySelector("#notice");

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  button.disabled = true;
  statusEl.textContent = "Thinking";
  hideNotice();

  const body = {
    provider: document.querySelector("#provider").value,
    prompt: document.querySelector("#prompt").value,
  };

  try {
    if (window.location.protocol === "file:") {
      throw new Error("Local server is not running.");
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 12000);
    const response = await fetch("/api/run", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    window.clearTimeout(timeoutId);
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || "Something went wrong.");
    }

    if (!payload.result) {
      throw new Error("The server responded, but did not include an analysis result.");
    }

    render(payload.result);
    statusEl.textContent = payload.warning ? "Mock fallback" : payload.provider;
    if (payload.warning) {
      showNotice(`Using mock mode. ${payload.warning}`);
    }
  } catch (error) {
    const fallback = buildLocalAnalysis(body.prompt);
    render(fallback);
    statusEl.textContent = "Local mock";
    const message = error.message || "The analysis did not complete.";
    showNotice(`${message} Showing a local mock result. For model-backed analysis, start the app with: python3 -m app.server`);
  } finally {
    button.disabled = false;
  }
});

function render(result) {
  document.querySelector("#summary").textContent = result.summary;
  renderList("#priorities", result.priorities, (item) => `
    <strong>${escapeHtml(readText(item, ["title", "priority", "name", "action"], "Priority"))}${renderScore(item.score)}</strong>
    <p>${escapeHtml(readText(item, ["why", "reason", "rationale", "description"]))}</p>
  `);
  renderList("#actions", result.next_actions, (item) => `
    <strong>${escapeHtml(readText(item, ["action", "title", "task", "next_step"], "Action"))}</strong>
    <p>${escapeHtml(readText(item, ["timebox", "time", "duration", "estimate"]))}</p>
  `);
  renderList("#risks", result.risks, (item) => `
    <strong>${escapeHtml(readText(item, ["risk", "title", "issue", "description"], "Risk"))}</strong>
    <p>${escapeHtml(readText(item, ["mitigation", "recommendation", "action", "details"]))}</p>
  `);
  renderList("#questions", result.questions, (item) => `
    <p>${escapeHtml(readText(item, ["question", "text", "title", "prompt", "value"], item))}</p>
  `);
  document.querySelector("#tools").textContent = JSON.stringify(result.tool_results, null, 2);
}

function renderScore(score) {
  if (score === undefined || score === null || score === "") return "";
  return ` <span class="score">${escapeHtml(String(score))}</span>`;
}

function renderList(selector, items, template) {
  const container = document.querySelector(selector);
  container.innerHTML = "";
  for (const item of items || []) {
    const el = document.createElement("article");
    el.className = "item";
    el.innerHTML = template(item);
    container.appendChild(el);
  }
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return entities[character];
  });
}

function readText(value, keys, fallback = "") {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value !== "object") return String(value);
  for (const key of keys) {
    const nested = value[key];
    if (nested === undefined || nested === null || nested === "") continue;
    if (typeof nested === "object") return readText(nested, ["text", "title", "value", "description"], fallback);
    return String(nested);
  }
  return fallback;
}

function showNotice(message) {
  notice.textContent = message;
  notice.hidden = false;
}

function hideNotice() {
  notice.textContent = "";
  notice.hidden = true;
}

function buildLocalAnalysis(prompt) {
  const score = scorePrompt(prompt);
  return {
    summary: "Focus on the highest-leverage decision, reduce ambiguity quickly, and convert the situation into concrete next actions.",
    priorities: [
      {
        title: "Clarify the decision",
        why: "A sharper decision frame makes the rest of the work easier and prevents scattered research.",
        score,
      },
      {
        title: "Choose one visible next step",
        why: "A small output creates momentum and gives you something to evaluate or share.",
        score: Math.max(1, score - 12),
      },
      {
        title: "Timebox the research",
        why: "A short research window improves confidence without turning the task into an open-ended loop.",
        score: Math.max(1, score - 20),
      },
    ],
    risks: [
      {
        risk: "Waiting for perfect information.",
        mitigation: "Write the top three decision criteria and pick one reversible action today.",
      },
      {
        risk: "Solving too broad a problem.",
        mitigation: "Limit the first version to a two-minute demo.",
      },
    ],
    next_actions: [
      {action: "Write the decision in one sentence.", timebox: "10 minutes"},
      {action: "List three success criteria and three constraints.", timebox: "20 minutes"},
      {action: "Pick one action that creates visible progress today.", timebox: "30 minutes"},
    ],
    questions: [
      "What would make this obviously successful 30 days from now?",
      "Which constraint is real, and which one is uncertainty?",
      "What is the smallest useful demo?",
    ],
    confidence: 0.68,
    tool_results: {
      priority_scorer: {
        tool: "browser_local_priority_scorer",
        score,
        note: "Generated in the browser because the backend was not reachable.",
      },
    },
  };
}

function scorePrompt(prompt) {
  const text = String(prompt || "").toLowerCase();
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
  let rawScore = 0;
  for (const signal in signals) {
    if (text.indexOf(signal) >= 0) {
      rawScore += signals[signal];
    }
  }
  return Math.min(100, 35 + rawScore * 8);
}
