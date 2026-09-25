import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { database } from "./supabase";
import type { ResearchRun } from "../types";

export function ownerHash(token?: string) {
  return token && /^[a-f0-9]{64}$/.test(token) ? createHash("sha256").update(token).digest("hex") : null;
}
async function context() {
  const owner = ownerHash((await cookies()).get("research_workspace")?.value);
  const db = database();
  return owner && db ? { owner, db } : null;
}
export async function saveSnapshot(run: ResearchRun): Promise<ResearchRun> {
  if (run.dataMode === "demo") return { ...run, storage: "browser" };
  try {
    const ctx = await context();
    if (!ctx) return { ...run, storage: "browser" };
    const saved = { ...run, storage: "cloud" as const };
    const { error } = await ctx.db.from("equity_snapshots").insert({
      id: run.id, owner_hash: ctx.owner, ticker: run.ticker, analyzed_at: run.analyzedAt, payload: saved,
    });
    if (error) return { ...run, storage: "unavailable" };
    return saved;
  } catch { return { ...run, storage: "unavailable" }; }
}
export async function readSnapshots(id?: string): Promise<ResearchRun[]> {
  const ctx = await context();
  if (!ctx) throw new Error("Cloud archive is not configured for this browser.");
  let query = ctx.db.from("equity_snapshots").select("payload").eq("owner_hash", ctx.owner);
  if (id) query = query.eq("id", id);
  const { data, error } = await query.order("analyzed_at", { ascending: false }).limit(id ? 1 : 100);
  if (error) throw new Error("Cloud archive is temporarily unavailable. Browser copies are still available.");
  return (data ?? []).map(row => row.payload as ResearchRun);
}
