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
  renderList("#priorities", result.priorities, (item) => `<strong>${escapeHtml(item.title)}${renderScore(item.score)}</strong><p>${escapeHtml(item.why)}</p>`);
  renderList("#actions", result.next_actions, (item) => `<strong>${escapeHtml(item.action)}</strong><p>${escapeHtml(item.timebox)}</p>`);
  renderList("#risks", result.risks, (item) => `<strong>${escapeHtml(item.risk)}</strong><p>${escapeHtml(item.mitigation)}</p>`);
  renderList("#questions", result.questions, (item) => `<p>${escapeHtml(item)}</p>`);
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

function showNotice(message) {
  notice.textContent = message;
  notice.hidden = false;
}

function hideNotice() {
  notice.textContent = "";
  notice.hidden = true;
}
