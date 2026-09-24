import { ResearchView } from "@/components/ResearchView";
import { runResearch } from "@/lib/research-engine";

export default async function CompanyPage({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params;
  const run = await runResearch(ticker);
  return <ResearchView run={run} />;
}
