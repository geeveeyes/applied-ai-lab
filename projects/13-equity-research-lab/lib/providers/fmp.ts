import type { AnalystProvider, AnalystSnapshot, MarketProvider, MarketSnapshot } from "./types";
import type { Citation } from "../types";

const BASE = "https://financialmodelingprep.com/stable";

export function providerErrorDetail(status: number, body: string, apiKey: string): string {
  let message = "";
  try {
    const data = JSON.parse(body);
    const value = data?.["Error Message"] ?? data?.message ?? data?.error;
    if (typeof value === "string") message = value;
  } catch { /* Unstructured HTML/proxy responses are not suitable for display. */ }
  // Providers may echo their request URL. Never expose a configured credential
  // or other query-string values in a public report.
  for (const secret of [apiKey, encodeURIComponent(apiKey)]) {
    if (secret) message = message.split(secret).join("[redacted]");
  }
  message = message.replace(/https?:\/\/[^\s<>"']+/gi, "[provider URL]")
    .replace(/(?:api[_-]?key|token|authorization)\s*[:=]\s*[^\s,;]+/gi, "credential=[redacted]")
    .replace(/[\r\n\t]+/g, " ").trim().slice(0, 240);
  const meaning = status === 402 ? "access or subscription restriction; endpoint or symbol entitlement must be checked" :
    status === 401 || status === 403 ? "authentication or access denied" :
    status === 429 ? "provider request limit reached" : "provider request failed";
  return `HTTP ${status}: ${meaning}${message ? `. Provider message: ${message}` : "; provider supplied no usable error detail"}`;
}

async function fmp(path: string) {
  const key = process.env.FMP_API_KEY;
  if (!key) throw new Error("FMP_API_KEY is not configured");
  const joiner = path.includes("?") ? "&" : "?";
  const res = await fetch(`${BASE}/${path}${joiner}apikey=${encodeURIComponent(key)}`, { next: { revalidate: 900 } });
  if (!res.ok) {
    const detail = providerErrorDetail(res.status, await res.text(), key);
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

    // ratings-historical is intentionally not called on the current plan; it returned 402.
    const requests = [
      ["estimates", `analyst-estimates?symbol=${symbol}&period=annual&page=0&limit=8`] as const,
      ["targets", `price-target-consensus?symbol=${symbol}`] as const,
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
        result.estimates = rows.map((r: any) => ({
          date: r.date,
          revenueAvg: Number(r.revenueAvg ?? r.estimatedRevenueAvg) || undefined,
          revenueLow: Number(r.revenueLow ?? r.estimatedRevenueLow) || undefined,
          revenueHigh: Number(r.revenueHigh ?? r.estimatedRevenueHigh) || undefined,
          epsAvg: Number(r.epsAvg ?? r.estimatedEpsAvg) || undefined,
          epsLow: Number(r.epsLow ?? r.estimatedEpsLow) || undefined,
          epsHigh: Number(r.epsHigh ?? r.estimatedEpsHigh) || undefined,
          numAnalystsRevenue: Number(r.numAnalystsRevenue ?? r.numberAnalystsEstimatedRevenue) || undefined,
          numAnalystsEps: Number(r.numAnalystsEps ?? r.numberAnalystsEstimatedEps) || undefined,
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
    }

    unavailable.push("Individual analyst identities and track records require the optional TipRanks data add-on.");
    return result;
  }
}
