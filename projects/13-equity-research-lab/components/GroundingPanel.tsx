"use client";
import { Fragment, useEffect, useState } from "react";
import type { ResearchRun } from "@/lib/types";
import { safeSourceUrl, type WebGrounding } from "@/lib/grounding";
function CitedText({ grounding }: { grounding: WebGrounding }) {
  let position = 0; const parts = [];
  for (const [index, source] of grounding.citations.entries()) {
    if (source.start < position || !safeSourceUrl(source.url)) continue;
    parts.push(<Fragment key={index}>{grounding.text.slice(position,source.start)}<a href={source.url} target="_blank" rel="noreferrer" title={source.title}>[{index+1}: {new URL(source.url).hostname}]</a></Fragment>);
    position = source.end;
  }
  parts.push(<Fragment key="last">{grounding.text.slice(position)}</Fragment>);
  return <div className="grounding-text">{parts}</div>;
}
export function GroundingPanel({ run }: { run: ResearchRun }) {
  const [grounding,setGrounding] = useState<WebGrounding | null>(null), [busy,setBusy] = useState(false), [message,setMessage] = useState("");
  const endpoint = `/api/research/${encodeURIComponent(run.id)}/grounding`;
  useEffect(() => { let active = true;
    if (run.storage === "cloud") fetch(endpoint, {cache:"no-store",signal:AbortSignal.timeout(10000)}).then(r=>r.ok?r.json():null).then(data=>{if(active && data?.grounding)setGrounding(data.grounding);}).catch(()=>{});
    return ()=>{active=false;};
  },[endpoint,run.storage]);
  async function search() {
    setBusy(true);setMessage("Searching current sources and checking the gaps. This can take up to two minutes…");
    try {
      const response = await fetch(endpoint,{method:"POST",signal:AbortSignal.timeout(130000)}); const data=await response.json();
      if (!response.ok) throw new Error(data.error || "Web research is unavailable.");
      setGrounding(data.grounding);setMessage(data.cached ? "Opened the saved web review without another model request." : "Web review saved separately from the original report.");
    } catch(error) { setMessage(error instanceof Error && error.name!=="TimeoutError" ? error.message : "Research took too long. Reopen this report shortly to check whether the result was saved."); }
    finally {setBusy(false);}
  }
  return <section className="panel" style={{marginTop:20}}><h2>Fill the gaps with web research</h2>
    <p>Look for recent company results, guidance, financing and business developments when provider data is missing. Source links and dates are included. The web review is saved separately and does not change the original scores or substitute search results for live prices or options quotes.</p>
    {!grounding && <><button className="action" disabled={busy || run.storage!=="cloud" || run.dataMode==="demo"} onClick={search}>{busy ? "Researching…" : "Research missing evidence"}</button><p className="muted">On request only: uses your configured AI API. Up to 3 searches and 3,500 output tokens per review; 3 reviews per workspace and 20 across the portal per UTC day. Saved reviews reopen without another AI request.</p>{run.storage!=="cloud" && <p>Run and save a live report to enable web research.</p>}</>}
    {message && <p role="status">{message}</p>}
    {grounding && <><p className="eyebrow">WEB REVIEW · {grounding.generatedAt.replace("T"," ").replace("Z"," UTC")}</p><CitedText grounding={grounding}/><details><summary>Sources and research usage</summary><ol>{grounding.citations.map((source,index)=><li key={index}><a href={safeSourceUrl(source.url) ?? "#"} target="_blank" rel="noreferrer">{source.title}</a></li>)}</ol><p>{grounding.searchCalls} search tool call(s) · {grounding.inputTokens.toLocaleString()} input tokens · {grounding.outputTokens.toLocaleString()} output tokens. Retrieved {grounding.generatedAt.slice(0,10)}; source publication dates may differ.</p></details></>}
  </section>;
}
