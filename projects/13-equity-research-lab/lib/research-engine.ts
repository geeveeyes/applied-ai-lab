import { demoResearch } from "./mock-data";
import { providers } from "./providers";
import type { ResearchRun } from "./types";

export async function runResearch(tickerRaw: string): Promise<ResearchRun> {
  const ticker = tickerRaw.trim().toUpperCase();
  if (!/^[A-Z.\-]{1,10}$/.test(ticker)) throw new Error("Invalid ticker symbol");

  const base = demoResearch(ticker);
  if (process.env.NEXT_PUBLIC_APP_MODE !== "live") return base;

  const errors: string[] = [];
  let liveSources = 0;

  try {
    const fundamentals = await providers.sec.getFundamentals(ticker);
    base.companyName = fundamentals.companyName ?? base.companyName;
    base.citations.push(...fundamentals.citations);
    liveSources += 1;
    if (fundamentals.revenue) base.highlights.unshift(`Latest SEC-tagged revenue fact: $${(fundamentals.revenue / 1e9).toFixed(1)}B`);
    if (fundamentals.operatingCashFlow) base.highlights.unshift(`Latest SEC-tagged operating cash flow fact: $${(fundamentals.operatingCashFlow / 1e9).toFixed(1)}B`);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "SEC provider error");
  }

  try {
    const analysts = await providers.analysts.getAnalysts(ticker);
    if (analysts.calls.length) {
      base.analysts = analysts.calls;
      base.analystSummary = `${analysts.calls.length} recent analyst calls loaded. ${analysts.consensusTarget ? `Consensus target: $${analysts.consensusTarget.toFixed(2)}.` : ""}`;
      base.citations.push(...analysts.citations);
      liveSources += 1;
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "Analyst provider error");
  }

  base.dataMode = liveSources >= 2 ? "live" : liveSources === 1 ? "hybrid" : "demo";
  base.notes = [
    ...(base.dataMode === "demo" ? base.notes : []),
    ...errors.map((x) => `Provider note: ${x}`),
  ];
  return base;
}
