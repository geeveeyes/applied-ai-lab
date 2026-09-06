const form = document.querySelector("#ask-form");
const statusEl = document.querySelector("#status");
const button = document.querySelector("#run-button");
const notice = document.querySelector("#notice");

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  button.disabled = true;
  statusEl.textContent = "Thinking";
  hideNotice();

  try {
    const response = await fetch("/api/run", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        provider: document.querySelector("#provider").value,
        prompt: document.querySelector("#prompt").value,
      }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Analysis failed.");
    render(payload.result);
    statusEl.textContent = payload.warning ? "Mock fallback" : payload.provider;
    if (payload.warning) showNotice(payload.warning);
  } catch (error) {
    statusEl.textContent = "Error";
    showNotice(error.message || "Analysis failed.");
  } finally {
    button.disabled = false;
  }
});

function render(result) {
  document.querySelector("#summary").textContent = result.summary;
  renderList("#priorities", result.priorities, (item) => `<strong>${escapeHtml(readText(item, ["title", "priority", "name", "action"], "Priority"))}${renderScore(item.score)}</strong><p>${escapeHtml(readText(item, ["why", "reason", "rationale", "description"]))}</p>`);
  renderList("#actions", result.next_actions, (item) => `<strong>${escapeHtml(readText(item, ["action", "title", "task", "next_step"], "Action"))}</strong><p>${escapeHtml(readText(item, ["timebox", "time", "duration", "estimate"]))}</p>`);
  renderList("#risks", result.risks, (item) => `<strong>${escapeHtml(readText(item, ["risk", "title", "issue", "description"], "Risk"))}</strong><p>${escapeHtml(readText(item, ["mitigation", "recommendation", "action", "details"]))}</p>`);
  renderList("#questions", result.questions, (item) => `<p>${escapeHtml(readText(item, ["question", "text", "title", "prompt", "value"], item))}</p>`);
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
    const entities = {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"};
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
