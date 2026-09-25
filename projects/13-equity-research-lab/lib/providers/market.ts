import { AlphaVantageMarketProvider } from "./alpha-vantage";
import { FmpMarketProvider } from "./fmp";
import type { MarketProvider, MarketSnapshot } from "./types";
export class FallbackMarketProvider implements MarketProvider {
  constructor(private primary: MarketProvider = new FmpMarketProvider(), private fallback: MarketProvider = new AlphaVantageMarketProvider()) {}
  async getMarket(ticker: string): Promise<MarketSnapshot> {
    let reason = "FMP quote unavailable";
    try {
      const quote = await this.primary.getMarket(ticker);
      if (!quote.price || !Number.isFinite(quote.price) || quote.price <= 0) throw new Error("FMP returned no valid positive price.");
      return { ...quote, source: "FMP" };
    } catch (error) { reason = error instanceof Error ? error.message : reason; }
    try {
      const quote = await this.fallback.getMarket(ticker);
      return { ...quote, notes: [reason, "Using Alpha Vantage's end-of-day price fallback; analyst estimates remain a separate data source.", ...(quote.notes ?? [])] };
    } catch (error) { throw new Error(`${reason}; ${error instanceof Error ? error.message : "Alpha Vantage fallback unavailable"}`); }
  }
}
