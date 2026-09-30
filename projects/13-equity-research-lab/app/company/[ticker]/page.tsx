import { ResearchView } from "@/components/ResearchView";
import { RunResearch } from "@/components/RunResearch";
import { sameDayReport } from "@/lib/server/research-budget";

// Viewing this page is free. It shows today's saved report when one exists; new paid
// research starts only from the explicit POST in <RunResearch>.
export const dynamic = "force-dynamic";

export default async function CompanyPage({ params }: { params: Promise<{ ticker: string }> }) {
  const ticker = decodeURIComponent((await params).ticker).trim().toUpperCase();
  if (!/^[A-Z.\-]{1,10}$/.test(ticker)) return <section><h1>Invalid ticker</h1><p>Use a ticker such as NVDA or BRK-B.</p><a href="/">Back to search</a></section>;
  const existing = await sameDayReport(ticker).catch(() => undefined);
  if (existing) return <><p className="warning">Showing today&apos;s saved {ticker} report from {existing.analyzedAt.replace("T", " ").slice(0, 16)} UTC. Reopening does not spend credits.</p><ResearchView run={existing} /><RunResearch ticker={ticker} force /></>;
  return <section>
    <p className="eyebrow">NEW RESEARCH</p>
    <h1>{ticker}</h1>
    <p className="lede">A live report pulls SEC filings, market data and current web evidence, then runs an AI synthesis and a deterministic valuation. It uses paid API credits and takes a few minutes.</p>
    <RunResearch ticker={ticker} />
  </section>;
}
