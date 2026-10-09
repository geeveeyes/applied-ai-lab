const $ = (id) => document.getElementById(id);
const EXAMPLES = ["How many vacation days can I carry over into next year?", "Why did search slow down after the index migration?", "When is the Atlas launch now and why was it moved?", "What was Q3 ARR?", "What is the company policy on pet insurance?"];

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function fill(select, values) {
  select.replaceChildren(...values.map((v) => Object.assign(el("option", "", v), { value: v })));
}

async function init() {
  const config = await (await fetch("/api/config")).json();
  fill($("viewer"), config.viewers);
  fill($("mode"), config.modes);
  fill($("chunking"), config.chunking);
  $("mode").value = "hybrid";
  $("chunking").value = "structure";
  $("corpus").textContent = `${config.documents} DOCS · ${config.embedder.toUpperCase()}`;
  EXAMPLES.forEach((text) => {
    const button = el("button", "chip", text);
    button.type = "button";
    button.onclick = () => { $("question").value = text; $("form").requestSubmit(); };
    $("examples").append(button);
  });
}

$("form").addEventListener("submit", async (event) => {
  event.preventDefault();
  $("error").hidden = true;
  $("run").disabled = true;
  try {
    const response = await fetch("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: $("question").value, viewer: $("viewer").value, mode: $("mode").value, chunking: $("chunking").value, provider: $("provider").value, rerank: $("rerank").checked }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Request failed");
    render(data);
  } catch (error) {
    $("error").textContent = error.message;
    $("error").hidden = false;
  } finally {
    $("run").disabled = false;
  }
});

function render(data) {
  const box = $("answer");
  box.hidden = false;
  box.className = data.result.refused ? "answer refused" : "answer";
  box.replaceChildren(el("h2", "", data.result.refused ? "No supported answer" : "Answer"));
  if (data.result.refused) {
    box.append(el("p", "", data.result.answer));
  } else {
    data.result.claims.forEach((claim) => {
      const p = el("p", "claim", claim.text + " ");
      claim.citations.forEach((id) => p.append(el("a", "cite", `[${id}]`)));
      box.append(p);
    });
  }
  data.result.dropped.forEach((d) => box.append(el("p", "muted", `Dropped claim (${d.reason}): ${d.text}`)));
  const usage = data.usage ? ` · tokens in ${data.usage.input_tokens} (cached ${data.usage.cached_input_tokens}) out ${data.usage.output_tokens}` : "";
  $("meta").textContent = `${data.hits.length} chunks · retrieval ${data.latency_ms} ms${usage}`;
  $("hits").replaceChildren(...data.hits.map((h) => {
    const card = el("article", "hit");
    const head = el("div", "hit-head");
    head.append(el("span", `badge ${h.source}`, h.source), el("strong", "", h.title), el("code", "", h.chunk_id), el("span", "score", h.score.toFixed(3)));
    card.append(head, el("pre", "", h.text), el("p", "muted", Object.entries(h.signals).map(([k, v]) => `${k} ${v}`).join(" · ")));
    return card;
  }));
}

init().catch((e) => { $("corpus").textContent = "OFFLINE"; $("error").textContent = e.message; $("error").hidden = false; });
