const $ = (id) => document.getElementById(id);
const EXAMPLES = ["How much is the home office stipend?", "How many vacation days do I get?", "How long are application logs kept?", "Who is the CEO of the company?"];

function el(tag, text, cls) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (cls) node.className = cls;
  return node;
}

function fail(message) { $("error").hidden = !message; $("error").textContent = message || ""; }

async function call(path, body) {
  const response = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed.");
  return data;
}

function busy(on) { for (const id of ["run", "ingest"]) $(id).disabled = on; }

function render(data) {
  const answer = $("answer");
  answer.replaceChildren();
  answer.className = "";
  if (!data.citations.length) {
    answer.append(el("span", data.answer, "refusal"));
  } else {
    for (const part of data.answer.split(/(\[C\d+\])/)) {
      answer.append(/^\[C\d+\]$/.test(part) ? el("span", part.slice(1, -1), "cite") : document.createTextNode(part));
    }
  }
  const box = $("sources");
  box.replaceChildren();
  for (const hit of data.sources) {
    const where = hit.source + (hit.page ? ` p.${hit.page}` : "") + (hit.heading ? ` › ${hit.heading}` : "");
    const node = el("details", undefined, data.citations.includes(hit.id) ? "used" : "");
    node.append(el("summary", `${hit.id} · ${where} · score ${hit.score}`), el("p", hit.text));
    box.append(node);
  }
  const u = data.usage;
  $("usage").textContent = u ? `Tokens: ${u.input_tokens} in (${u.cached_input_tokens} cached), ${u.output_tokens} out` : "";
}

$("form").addEventListener("submit", async (event) => {
  event.preventDefault();
  fail(""); busy(true);
  try {
    render(await call("/api/ask", { question: $("question").value, provider: $("provider").value, mode: $("mode").value }));
  } catch (error) { fail(error.message); } finally { busy(false); }
});

$("ingest").addEventListener("click", async () => {
  fail(""); busy(true);
  try {
    const r = await call("/api/ingest", { provider: $("provider").value });
    const s = r.stats;
    $("info").textContent = `Indexed ${r.files.length} files, ${s.chunks} chunks (${s.chunks_embedded} embedded, ${s.files_reused} files reused from cache).` + (r.errors.length ? ` Skipped: ${r.errors.map((e) => e.source + " (" + e.error + ")").join("; ")}` : "");
  } catch (error) { fail(error.message); } finally { busy(false); }
});

for (const q of EXAMPLES) {
  const b = el("button", q); b.type = "button";
  b.addEventListener("click", () => { $("question").value = q; });
  $("examples").append(b);
}
fetch("/api/status").then((r) => r.json()).then((s) => { $("folder").textContent = "FOLDER: " + s.folder.toUpperCase(); if (!s.openai_configured) $("info").textContent = "OpenAI key not set: use Mock."; });
