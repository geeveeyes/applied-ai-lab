"use client";
import { useState } from "react";

type Hit = { id: string; source: string; heading: string; page: number | null; text: string; score: number };
type Result = { answer: string; citations: string[]; sources: Hit[] };
const EXAMPLES = ["How much is the home office stipend?", "How many vacation days do I get per year?", "How long are application logs kept?", "Who is the CEO of the company?"];

export default function Documents() {
  const [question, setQuestion] = useState("");
  const [mode, setMode] = useState("hybrid");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setBusy(true);
    try {
      const r = await fetch("/api/documents/ask", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question, mode }) });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Request failed.");
      setResult(data);
    } catch (err) { setError(err instanceof Error ? err.message : "Request failed."); } finally { setBusy(false); }
  }

  return <>
    <h1>Ask My Documents</h1>
    <p className="lede">Proof of concept: Mock mode over the 11 sample documents. Uploads, OpenAI and saved indexes come after sign-off.</p>
    <div className="cols">
      <form className="panel" onSubmit={submit}>
        <label htmlFor="q">Question</label>
        <input id="q" value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={500} required placeholder="How much is the home office stipend?" autoComplete="off" />
        <div className="examples">{EXAMPLES.map((q) => <button key={q} type="button" onClick={() => setQuestion(q)}>{q}</button>)}</div>
        <label htmlFor="m">Retrieval</label>
        <select id="m" value={mode} onChange={(e) => setMode(e.target.value)}><option value="hybrid">Hybrid</option><option value="lexical">Keyword</option><option value="dense">Embedding</option></select>
        <button className="primary" disabled={busy}>{busy ? "Asking…" : "Ask"}</button>
        {error && <p className="error" role="alert">{error}</p>}
      </form>
      <section className="panel" aria-live="polite">
        {!result ? <p className="note">Your answer and its sources will appear here.</p> : <>
          <p>{result.citations.length ? result.answer.split(/(\[C\d+\])/).map((part, i) => /^\[C\d+\]$/.test(part) ? <span key={i} className="cite">{part.slice(1, -1)}</span> : part) : <span className="refusal">{result.answer}</span>}</p>
          {result.sources.map((h) => <details key={h.id} className={result.citations.includes(h.id) ? "used" : ""}><summary>{h.id} · {h.source}{h.heading ? ` › ${h.heading}` : ""} · score {h.score}</summary><p>{h.text}</p></details>)}
        </>}
      </section>
    </div>
  </>;
}
