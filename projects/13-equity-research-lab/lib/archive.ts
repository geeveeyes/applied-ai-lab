"use client";
import type { ResearchRun } from "./types";
const KEY = "equity-research-lab:runs", TRASH = "equity-research-lab:trash";
function read(key: string): ResearchRun[] {
  if (typeof window === "undefined") return [];
  try { const parsed=JSON.parse(localStorage.getItem(key)||"[]"); return Array.isArray(parsed) ? parsed.filter(r=>r && typeof r.id==="string" && typeof r.ticker==="string" && Array.isArray(r.scenarios)) : []; } catch {return [];}
}
export function loadRuns(): ResearchRun[] { const removed = new Set(read(TRASH).map(r=>r.id));return read(KEY).filter(r=>!removed.has(r.id)); }
export function saveRun(run: ResearchRun) {
  if (typeof window === "undefined" || read(TRASH).some(r=>r.id===run.id)) return;
  const existing=loadRuns();if(existing.some(r=>r.id===run.id))return;
  try {localStorage.setItem(KEY,JSON.stringify([run,...existing].slice(0,100)));}catch{/* Report still renders. */}
}
export function changeLocalVisibility(runs: ResearchRun[], restore: boolean) {
  const ids=new Set(runs.map(r=>r.id));const active=read(KEY).filter(r=>!ids.has(r.id)),trash=read(TRASH).filter(r=>!ids.has(r.id));
  // Write the destination first so quota errors never erase the sole copy.
  if(restore){ localStorage.setItem(KEY,JSON.stringify([...runs,...active]));localStorage.setItem(TRASH,JSON.stringify(trash)); }
  else {localStorage.setItem(TRASH,JSON.stringify([...runs,...trash]));localStorage.setItem(KEY,JSON.stringify(active));}
}
export async function loadArchive(trash = false): Promise<{ runs: ResearchRun[]; message: string }> {
  const local=trash ? read(TRASH) : loadRuns();
  try {
    const response=await fetch(`/api/research${trash?"?trash=1":""}`,{cache:"no-store",signal:AbortSignal.timeout(10000)});
    if(!response.ok)throw new Error("Cloud unavailable");
    const {runs:cloud,removedIds=[]}=await response.json() as {runs:ResearchRun[];removedIds:string[]};
    const removed=new Set(removedIds);
    // Cloud is authoritative for cloud copies, including restores from another tab.
    const merged=new Map(local.filter(r=>r.storage!=="cloud" && (trash || !removed.has(r.id))).map(r=>[r.id,r]));
    cloud.forEach(run=>merged.set(run.id,run));
    return {runs:[...merged.values()].sort((a,b)=>b.analyzedAt.localeCompare(a.analyzedAt)),message:"Cloud archive connected. Browser-only reports are also shown."};
  }catch{return {runs:local,message:"Cloud archive unavailable. Showing browser copies."};}
}
