import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sameOrigin } from "@/lib/server/request-security";
import { QuickCapError, runQuickCheck } from "@/lib/server/quick-check";
export const maxDuration = 60;

const headers = { "Cache-Control": "private, no-store" };
const schema = z.object({ ticker: z.string().trim().toUpperCase().regex(/^[A-Z.\-]{1,10}$/) });

// No LLM; metered by QUICK_CHECK_DAILY_CAP and cached per ticker per day. POST only.
export function GET() {
  return NextResponse.json({ error: "Use POST." }, { status: 405, headers: { ...headers, Allow: "POST" } });
}
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Request origin not allowed" }, { status: 403, headers });
  let ticker: string;
  try { ticker = schema.parse(await request.json()).ticker; }
  catch { return NextResponse.json({ error: "Enter a valid ticker, such as NVDA or BRK-B." }, { status: 400, headers }); }
  try { return NextResponse.json(await runQuickCheck(ticker), { headers }); }
  catch (error) {
    const message = error instanceof Error ? error.message : "Quick check failed.";
    return NextResponse.json({ error: message }, { status: error instanceof QuickCapError ? 429 : 400, headers });
  }
}
