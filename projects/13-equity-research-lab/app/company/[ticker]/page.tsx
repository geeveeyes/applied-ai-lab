import { ResearchView } from "@/components/ResearchView";
import { runResearch } from "@/lib/research-engine";

export default async function CompanyPage({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params;
  if (!/^[A-Z.\-]{1,10}$/.test(ticker.trim().toUpperCase())) return <section><h1>Invalid ticker</h1><p>Use a ticker such as NVDA or BRK-B.</p><a href="/">Back to search</a></section>;
  const run = await runResearch(ticker);
  return <ResearchView run={run} />;
}
