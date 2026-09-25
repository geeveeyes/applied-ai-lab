import { NextResponse } from "next/server";
import { readSnapshots } from "@/lib/server/archive";
export async function GET() {
  try { return NextResponse.json({ runs: await readSnapshots() }, { headers: { "Cache-Control": "private, no-store" } }); }
  catch { return NextResponse.json({ error: "Cloud archive unavailable. Showing browser copies." }, { status: 503 }); }
}
