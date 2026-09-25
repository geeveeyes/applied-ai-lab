import { NextRequest, NextResponse } from "next/server";
import { runResearch } from "@/lib/research-engine";

import { saveSnapshot } from "@/lib/server/archive";

export async function GET(request: NextRequest) {
  const ticker = request.nextUrl.searchParams.get("ticker");
  if (!ticker) return NextResponse.json({ error: "ticker is required" }, { status: 400 });
  try { return NextResponse.json(await saveSnapshot(await runResearch(ticker)), { headers: { "Cache-Control": "private, no-store" } }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "analysis failed" }, { status: 400 }); }
}
