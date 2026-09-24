import type { AnalystProvider, AnalystSnapshot } from "./types";
import type { AnalystCall } from "../types";

const BASE = "https://financialmodelingprep.com/stable";

async function fmp(path: string) {
  const key = process.env.FMP_API_KEY;
  if (!key) throw new Error("FMP_API_KEY is not configured");
  const joiner = path.includes("?") ? "&" : "?";
  const res = await fetch(`${BASE}/${path}${joiner}apikey=${encodeURIComponent(key)}`, { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`FMP request failed: ${res.status}`);
  return res.json();
}

export class FmpAnalystProvider implements AnalystProvider {
  async getAnalysts(ticker: string): Promise<AnalystSnapshot> {
    const symbol = encodeURIComponent(ticker.toUpperCase());
    const retrievedAt = new Date().toISOString();
    const [callsRaw, consensusRaw] = await Promise.all([
      fmp(`tipranks-search?symbol=${symbol}&limit=25&page=0`),
      fmp(`price-target-consensus?symbol=${symbol}`),
    ]);
    const rows = Array.isArray(callsRaw) ? callsRaw : callsRaw?.data ?? [];
    const calls: AnalystCall[] = rows.slice(0, 25).map((r: any) => ({
      analyst: r.analystName ?? r.name ?? "Unknown analyst",
      firm: r.firmName ?? r.firm ?? "Unknown firm",
      rating: /buy|outperform|overweight/i.test(r.recommendation ?? "") ? "Buy" : /sell|underperform|underweight/i.test(r.recommendation ?? "") ? "Sell" : /hold|neutral|equal/i.test(r.recommendation ?? "") ? "Hold" : "Other",
      priceTarget: Number(r.priceTarget) || undefined,
      analystRank: Number(r.analystRank) || undefined,
      successRate: Number(r.stockSuccessRate ?? r.successRate) || undefined,
      averageReturn: Number(r.stockAvgReturn ?? r.averageReturn) || undefined,
      date: r.date ?? r.recommendationDate,
      sourceUrl: r.articleUrl ?? r.url,
    }));
    const consensus = Array.isArray(consensusRaw) ? consensusRaw[0] : consensusRaw?.[0] ?? consensusRaw;
    return {
      calls,
      consensusTarget: Number(consensus?.targetConsensus ?? consensus?.targetMedian) || undefined,
      citations: [
        { title: `${ticker} TipRanks analyst activity via FMP`, url: `https://financialmodelingprep.com/stable/tipranks-search?symbol=${symbol}`, source: "FMP / TipRanks", retrievedAt, tier: 3 },
        { title: `${ticker} price target consensus via FMP`, url: `https://financialmodelingprep.com/stable/price-target-consensus?symbol=${symbol}`, source: "FMP", retrievedAt, tier: 3 },
      ],
    };
  }
}
