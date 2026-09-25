import type { AnalystProvider, AnalystSnapshot, MarketProvider, MarketSnapshot } from "./types";
import type { Citation } from "../types";

const BASE = "https://financialmodelingprep.com/stable";

async function fmp(path: string) {
  const key = process.env.FMP_API_KEY;
  if (!key) throw new Error("FMP_API_KEY is not configured");
  const joiner = path.includes("?") ? "&" : "?";
  const res = await fetch(`${BASE}/${path}${joiner}apikey=${encodeURIComponent(key)}`, { next: { revalidate: 900 } });
  if (!res.ok) {
    const detail = res.status === 402 ? "endpoint not included in current FMP plan" : `HTTP ${res.status}`;
    throw new Error(`FMP ${path.split("?")[0]} failed: ${detail}`);
  }
  return res.json();
}

function citation(title: string, endpoint: string, ticker: string): Citation {
  const symbol = encodeURIComponent(ticker.toUpperCase());
  return {
    title,
    url: `https://financialmodelingprep.com/stable/${endpoint}?symbol=${symbol}`,
    source: "FMP",
    retrievedAt: new Date().toISOString(),
    tier: 3,
  };
}

export class FmpMarketProvider implements MarketProvider {
  async getMarket(ticker: string): Promise<MarketSnapshot> {
    const symbol = encodeURIComponent(ticker.toUpperCase());
    const payload = await fmp(`quote?symbol=${symbol}`);
    const row = Array.isArray(payload) ? payload[0] : payload?.[0] ?? payload;
    if (!row || !Number(row.price)) throw new Error("FMP quote returned no usable price");
    return {
      companyName: row.name,
      price: Number(row.price),
      marketCap: Number(row.marketCap) || undefined,
      yearHigh: Number(row.yearHigh) || undefined,
      yearLow: Number(row.yearLow) || undefined,
      priceAvg50: Number(row.priceAvg50) || undefined,
      priceAvg200: Number(row.priceAvg200) || undefined,
      changePercentage: Number(row.changePercentage) || undefined,
      timestamp: row.timestamp ? new Date(Number(row.timestamp) * 1000).toISOString() : undefined,
      citations: [citation(`${ticker} stock quote`, "quote", ticker)],
    };
  }
}

export class FmpAnalystProvider implements AnalystProvider {
  async getAnalysts(ticker: string): Promise<AnalystSnapshot> {
    const symbol = encodeURIComponent(ticker.toUpperCase());
    const calls: AnalystSnapshot["calls"] = [];
    const citations: Citation[] = [];
    const unavailable: string[] = [];
    const result: AnalystSnapshot = { calls, estimates: [], citations, unavailable };

    const requests = [
      ["estimates", `analyst-estimates?symbol=${symbol}&period=annual&page=0&limit=6`] as const,
      ["targets", `price-target-consensus?symbol=${symbol}`] as const,
      ["ratings", `ratings-historical?symbol=${symbol}&limit=12`] as const,
    ];

    const settled = await Promise.allSettled(requests.map(([, path]) => fmp(path)));

    for (let i = 0; i < settled.length; i++) {
      const name = requests[i][0];
      const response = settled[i];
      if (response.status === "rejected") {
        unavailable.push(response.reason instanceof Error ? response.reason.message : `${name} unavailable`);
        continue;
      }

      const payload = response.value;
      if (name === "estimates") {
        const rows = Array.isArray(payload) ? payload : payload?.data ?? [];
        result.estimates = rows.slice(0, 6).map((r: any) => ({
          date: r.date,
          revenueAvg: Number(r.revenueAvg ?? r.estimatedRevenueAvg) || undefined,
          revenueLow: Number(r.revenueLow ?? r.estimatedRevenueLow) || undefined,
          revenueHigh: Number(r.revenueHigh ?? r.estimatedRevenueHigh) || undefined,
          epsAvg: Number(r.epsAvg ?? r.estimatedEpsAvg) || undefined,
          epsLow: Number(r.epsLow ?? r.estimatedEpsLow) || undefined,
          epsHigh: Number(r.epsHigh ?? r.estimatedEpsHigh) || undefined,
        }));
        if (result.estimates.length) citations.push(citation(`${ticker} analyst estimates`, "analyst-estimates", ticker));
      }

      if (name === "targets") {
        const row = Array.isArray(payload) ? payload[0] : payload?.[0] ?? payload;
        result.consensusTarget = Number(row?.targetConsensus) || undefined;
        result.targetHigh = Number(row?.targetHigh) || undefined;
        result.targetLow = Number(row?.targetLow) || undefined;
        result.targetMedian = Number(row?.targetMedian) || undefined;
        if (row) citations.push(citation(`${ticker} price target consensus`, "price-target-consensus", ticker));
      }

      if (name === "ratings") {
        const rows = Array.isArray(payload) ? payload : payload?.data ?? [];
        const latest = rows[0];
        if (latest) {
          result.ratings = {
            strongBuy: Number(latest.ratingStrongBuy ?? latest.strongBuy) || 0,
            buy: Number(latest.ratingBuy ?? latest.buy) || 0,
            hold: Number(latest.ratingHold ?? latest.hold) || 0,
            sell: Number(latest.ratingSell ?? latest.sell) || 0,
            strongSell: Number(latest.ratingStrongSell ?? latest.strongSell) || 0,
          };
          citations.push(citation(`${ticker} ratings history`, "ratings-historical", ticker));
        }
      }
    }

    // Individual analyst identity / track-record data is intentionally optional.
    // TipRanks-backed FMP endpoints return 402 unless that add-on is purchased.
    unavailable.push("Individual analyst names and track records require the optional TipRanks data add-on.");
    return result;
  }
}
