import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sameOrigin } from "@/lib/server/request-security";
import { getPortfolioHistory } from "@/lib/server/portfolio-history";
import { SecProvider } from "@/lib/providers/sec";
import { backtestTicker, summarize, yearlyDates, type BacktestRow } from "@/lib/backtest";
export const maxDuration = 180;

const headers = { "Cache-Control": "private, no-store" };
const schema = z.object({ tickers: z.array(z.string().trim().toUpperCase().regex(/^[A-Z][A-Z.\-]{0,9}$/)).min(1).max(6), fromYear: z.number().int().min(2010).max(2024).optional() });

// No LLM. Uses SEC (free) and Alpha Vantage monthly history (cached 24h, shared 24/day cap: 1 call per new ticker + SPY).
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Request origin not allowed" }, { status: 403, headers });
  let input: z.infer<typeof schema>;
  try { input = schema.parse(await request.json()); } catch { return NextResponse.json({ error: "Use 1–6 valid tickers." }, { status: 400, headers }); }
  let spy;
  try { spy = await getPortfolioHistory("SPY"); } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "SPY history unavailable." }, { status: 503, headers }); }
  const dates = yearlyDates(input.fromYear ?? 2015);
  const sec = new SecProvider();
  const rows: BacktestRow[] = [], skipped: string[] = [], errors: string[] = [];
  for (const ticker of [...new Set(input.tickers)]) {
    try {
      const [facts, history] = await Promise.all([sec.getCompanyFacts(ticker), getPortfolioHistory(ticker)]);
      const r = backtestTicker(ticker, facts as Parameters<typeof backtestTicker>[1], history, spy, dates);
      rows.push(...r.rows); skipped.push(...r.skipped);
    } catch (e) { errors.push(`${ticker}: ${e instanceof Error ? e.message : "failed"}`); }
  }
  return NextResponse.json({ rows, skipped, errors, summary: summarize(rows), dates, ranAt: new Date().toISOString() }, { headers });
}
