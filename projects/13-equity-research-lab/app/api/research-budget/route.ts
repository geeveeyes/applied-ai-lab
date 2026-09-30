import { NextResponse } from "next/server";
import { researchBudget } from "@/lib/server/research-budget";
// Read-only and free: counts today's saved live reports. Never triggers research.
export async function GET() {
  return NextResponse.json(await researchBudget(), { headers: { "Cache-Control": "private, no-store" } });
}
