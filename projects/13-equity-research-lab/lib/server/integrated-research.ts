import { unstable_cache } from "next/cache";
import type { ResearchRun } from "../types";
import { researchGaps } from "./web-research";
// Cache only public company evidence. No workspace, position or portfolio data enters this cache.
const cachedBrief = unstable_cache(async (ticker: string, companyName: string, day: string) => researchGaps({
  ticker, companyName, analyzedAt: day, risks: [], notes: [],
} as unknown as ResearchRun, true), ["integrated-investment-evidence-v8"], { revalidate: 3600 });
export function integratedResearch(run: ResearchRun) {
  return cachedBrief(run.ticker, run.companyName, run.analyzedAt.slice(0,10));
}
