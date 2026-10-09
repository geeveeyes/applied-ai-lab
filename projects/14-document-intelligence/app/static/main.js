const $ = (id) => document.getElementById(id);
let sampleId = null;
let gold = null;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

async function init() {
  const config = await (await fetch("/api/config")).json();
  $("extractor").replaceChildren(...config.extractors.map((v) => Object.assign(el("option", "", v), { value: v })));
  $("extractor").value = "rules_v2";
  $("sample").replaceChildren(el("option", "", "(pasted text)"), ...config.samples.map((v) => Object.assign(el("option", "", v), { value: v })));
  $("sample").firstChild.value = "";
}

$("sample").addEventListener("change", async () => {
  sampleId = $("sample").value || null;
  gold = null;
  if (!sampleId) return;
  const data = await (await fetch(`/api/sample?id=${encodeURIComponent(sampleId)}`)).json();
  $("text").value = data.text;
  gold = data.gold;
});

$("text").addEventListener("input", () => { sampleId = null; gold = null; });

$("run").addEventListener("click", async () => {
  $("error").hidden = true;
  $("run").disabled = true;
  try {
    const response = await fetch("/api/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: $("text").value, extractor: $("extractor").value, sample_id: sampleId }),
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
  const body = $("table").querySelector("tbody");
  body.replaceChildren();
  let right = 0;
  let total = 0;
  Object.entries(data.fields).forEach(([name, f]) => {
    const row = el("tr", f.status);
    const shown = f.value === null ? "-" : String(f.value);
    let status = f.status + (f.problem ? `: ${f.problem}` : "");
    if (data.gold && name in data.gold) {
      total += 1;
      const ok = f.value === data.gold[name];
      right += ok ? 1 : 0;
      status += ok ? "  ✓ matches label" : `  ✗ label: ${data.gold[name]}`;
    }
    row.append(el("td", "", name), el("td", "val", shown), el("td", "ev", f.evidence || ""), el("td", "", status));
    body.append(row);
  });
  $("table").hidden = false;
  const grade = total ? ` · ${right}/${total} match labels` : "";
  const cost = data.est_cost_usd ? ` · est $${(data.est_cost_usd * 1000).toFixed(2)} per 1,000 docs` : "";
  $("summary").textContent = `${data.extractor} · ${data.issues.length} validation issue(s)${grade}${cost}`;
  $("json").textContent = JSON.stringify(data.record, null, 2);
  $("json").hidden = false;
}

init().catch((e) => { $("error").textContent = e.message; $("error").hidden = false; });
