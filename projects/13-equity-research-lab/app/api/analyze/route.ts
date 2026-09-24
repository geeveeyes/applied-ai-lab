import { NextRequest, NextResponse } from "next/server";
import { runResearch } from "@/lib/research-engine";

export async function GET(request: NextRequest) {
  const ticker = request.nextUrl.searchParams.get("ticker");
  if (!ticker) return NextResponse.json({ error: "ticker is required" }, { status: 400 });
  try { return NextResponse.json(await runResearch(ticker)); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "analysis failed" }, { status: 400 }); }
}
