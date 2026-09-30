// Browser-private decision journal: what you actually did, at what price, and why.
// Graded later against the latest known price (from quick checks or reports). No API cost.
export type JournalEntry = { id: string; date: string; symbol: string; action: "Bought" | "Sold" | "Held" | "Skipped"; price: number; amount?: number; reason: string; toolSaid?: string };
const KEY = "equity-decision-journal-v1";

export function loadJournal(): JournalEntry[] {
  if (typeof window === "undefined") return [];
  try { const v = JSON.parse(localStorage.getItem(KEY) ?? "[]"); return Array.isArray(v) ? v : []; } catch { return []; }
}
export function addJournal(e: Omit<JournalEntry, "id">) {
  const next = [{ ...e, id: crypto.randomUUID() }, ...loadJournal()].slice(0, 500);
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* quota */ }
  return next;
}
export function removeJournal(id: string) {
  const next = loadJournal().filter(e => e.id !== id);
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* quota */ }
  return next;
}
/** Price move since the decision and whether it went the decision's way (Held/Skipped are not directional). */
export function gradeEntry(e: JournalEntry, latest?: { price: number; date: string }) {
  if (!latest || !(latest.price > 0) || !(e.price > 0) || latest.date.slice(0, 10) <= e.date) return null;
  const move = (latest.price / e.price - 1) * 100;
  const days = Math.round((Date.parse(latest.date.slice(0, 10)) - Date.parse(e.date)) / 86400000);
  const right = e.action === "Bought" ? move > 0 : e.action === "Sold" ? move < 0 : null;
  return { movePct: Number(move.toFixed(1)), days, right };
}
