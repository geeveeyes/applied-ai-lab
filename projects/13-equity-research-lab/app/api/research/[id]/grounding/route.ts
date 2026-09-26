import { NextResponse } from "next/server";
import { archiveContext, readSnapshots } from "@/lib/server/archive";
import { sameOrigin } from "@/lib/server/request-security";
import { researchGaps } from "@/lib/server/web-research";
export const maxDuration = 150;
const headers = { "Cache-Control": "private, no-store" };
async function find(id: string) {
  if (!/^[A-Za-z0-9.\-]{1,100}$/.test(id)) return null;
  const [run] = await readSnapshots(id); const ctx = await archiveContext();
  return run && ctx ? { run, ...ctx } : null;
}
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await find((await params).id);
    if (!ctx) return NextResponse.json({ error: "Report unavailable" }, { status: 404, headers });
    const { data, error } = await ctx.db.from("equity_web_research").select("payload,status").eq("research_id", ctx.run.id).eq("owner_hash", ctx.owner).maybeSingle();
    if (error) throw error;
    return NextResponse.json({ grounding: data?.payload ?? null, status: data?.status ?? "none" }, { headers });
  } catch { return NextResponse.json({ error: "Web research history is temporarily unavailable." }, { status: 503, headers }); }
}
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Request origin not allowed" }, { status: 403 });
  let ctx: Awaited<ReturnType<typeof find>> = null;
  let claimed = false;
  try {
    ctx = await find((await params).id);
    if (!ctx) return NextResponse.json({ error: "Save a live report before requesting web research." }, { status: 404, headers });
    const { data: existing, error: readError } = await ctx.db.from("equity_web_research").select("payload,status").eq("research_id",ctx.run.id).eq("owner_hash",ctx.owner).maybeSingle();
    if (readError) throw readError;
    if (existing?.status === "complete") return NextResponse.json({ grounding: existing.payload, cached: true }, { headers });
    const { data: allowed, error } = await ctx.db.rpc("equity_claim_web_research", { report_id: ctx.run.id, workspace_hash: ctx.owner });
    if (error) throw error;
    if (allowed !== "claimed") return NextResponse.json({ error: allowed === "pending" ? "Research is already running. Check back shortly." : "Web research allowance reached (3 requests per workspace and 20 across the portal per UTC day). Try again after the daily reset." }, { status: 429, headers });
    claimed = true;
    const grounding = await researchGaps(ctx.run);
    const { error: saveError } = await ctx.db.from("equity_web_research").update({ status: "complete", payload: grounding, updated_at: new Date().toISOString() }).eq("research_id",ctx.run.id).eq("owner_hash",ctx.owner);
    if (saveError) throw new Error("Web research completed but could not be saved. Please try again later.");
    return NextResponse.json({ grounding, cached: false }, { headers });
  } catch (error) {
    if (ctx && claimed) await ctx.db.from("equity_web_research").update({ status: "failed", updated_at: new Date().toISOString() }).eq("research_id",ctx.run.id).eq("owner_hash",ctx.owner);
    return NextResponse.json({ error: error instanceof Error && !error.message.includes("fetch") ? error.message : "Web research could not complete. Your saved report is unchanged." }, { status: 503, headers });
  }
}
