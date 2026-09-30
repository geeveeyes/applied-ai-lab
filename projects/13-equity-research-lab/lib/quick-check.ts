import { intrinsicValuation, type IntrinsicValuation } from "./intrinsic-valuation";
import { peerGroup } from "./peer-valuation";
import { sectorFor } from "./diversification";
import type { AnalystSnapshot, FundamentalsSnapshot, MarketSnapshot } from "./providers/types";
import type { Citation } from "./types";

// Quick check: a deterministic, AI-free snapshot (SEC filings + market quote + consensus
// + the code DCF). It uses no OpenAI credits, so it can cover a whole watchlist.
// It is NOT a full research report: no web evidence, no qualitative factors.

export const QUICK_CHECK_VERSION = "quick-check-v1";
export const MARGIN_OF_SAFETY = 0.15;

export type Zone = "Buy zone" | "Fair value range" | "Expensive" | "Not valued";

export type QuickCheck = {
  version: string;
  ticker: string;
  companyName: string;
  checkedAt: string;
  price: number;
  priceDate?: string;
  marketCap?: number;
  sector: string;
  valuation: IntrinsicValuation;
  /** Highest price that still leaves MARGIN_OF_SAFETY below the base intrinsic value. */
  buyBelow?: number;
  zone: Zone;
  metrics: {
    revenue?: number;
    consensusRevenueGrowth?: number;
    fcfMargin?: number;
    netCashToMarketCap?: number;
    trailingPe?: number;
    offYearHighPct?: number;
    vs200DayPct?: number;
    analystTargetUpsidePct?: number;
  };
  flags: string[];
  sources: Citation[];
};

export function zoneFor(v: IntrinsicValuation, price: number): Zone {
  if (!v.available || !(price > 0)) return "Not valued";
  const upside = v.perShare.base / price - 1;
  return upside >= MARGIN_OF_SAFETY ? "Buy zone" : upside > -0.10 ? "Fair value range" : "Expensive";
}

const ratio = (a?: number, b?: number) => (a != null && b != null && Number.isFinite(a) && Number.isFinite(b) && b !== 0 ? a / b : undefined);
const round = (x?: number, d = 1) => (x == null || !Number.isFinite(x) ? undefined : Number(x.toFixed(d)));

export function buildQuickCheck(ticker: string, f: FundamentalsSnapshot | null, m: MarketSnapshot, a: AnalystSnapshot | null, now = new Date()): QuickCheck {
  if (!m.price || !(m.price > 0)) throw new Error(`No verified price for ${ticker}`);
  const valuation = intrinsicValuation({
    price: m.price, marketCap: m.marketCap, revenue: f?.revenue, operatingCashFlow: f?.operatingCashFlow,
    capitalExpenditures: f?.capitalExpenditures, freeCashFlow: f?.freeCashFlow, netIncome: f?.netIncome,
    cash: f?.cash, debt: f?.debt, annualPeriodEnd: f?.latestAnnualPeriodEnd, estimates: a?.estimates ?? [],
    financialInstitution: f?.financialInstitution || peerGroup(ticker)?.metric === "book",
    cyclical: ["Exploration and production", "Integrated energy"].includes(peerGroup(ticker)?.sector ?? ""),
  });
  const netCash = f?.cash != null || f?.debt != null ? (f?.cash ?? 0) - (f?.debt ?? 0) : undefined;
  const fcfMargin = ratio(f?.freeCashFlow, f?.revenue);
  const flags: string[] = [];
  if (fcfMargin != null && fcfMargin < 0) flags.push("Negative free cash flow in the latest fiscal year.");
  if (netCash != null && m.marketCap && netCash < -0.3 * m.marketCap) flags.push("Net debt exceeds 30% of market value.");
  if (f?.latestAnnualPeriodEnd && (now.getTime() - Date.parse(f.latestAnnualPeriodEnd)) / 86400000 > 460) flags.push("Latest annual filing is more than 15 months old.");
  if (!a?.estimates?.length) flags.push("No consensus estimates available.");
  if (valuation.available) flags.push(...valuation.warnings);
  const buyBelow = valuation.available ? Number((valuation.perShare.base / (1 + MARGIN_OF_SAFETY)).toFixed(2)) : undefined;
  return {
    version: QUICK_CHECK_VERSION, ticker, companyName: f?.companyName ?? m.companyName ?? ticker, checkedAt: now.toISOString(),
    price: m.price, priceDate: m.timestamp, marketCap: m.marketCap, sector: sectorFor(ticker), valuation, buyBelow,
    zone: zoneFor(valuation, m.price),
    metrics: {
      revenue: f?.revenue,
      consensusRevenueGrowth: valuation.available ? round(valuation.growth * 100) : undefined,
      fcfMargin: round(fcfMargin != null ? fcfMargin * 100 : undefined),
      netCashToMarketCap: round(netCash != null && m.marketCap ? (netCash / m.marketCap) * 100 : undefined),
      trailingPe: round(f?.annualDilutedEps && f.annualDilutedEps > 0 ? m.price / f.annualDilutedEps : undefined),
      offYearHighPct: round(m.yearHigh ? (m.price / m.yearHigh - 1) * 100 : undefined),
      vs200DayPct: round(m.priceAvg200 ? (m.price / m.priceAvg200 - 1) * 100 : undefined),
      analystTargetUpsidePct: round(a?.consensusTarget ? (a.consensusTarget / m.price - 1) * 100 : undefined),
    },
    flags,
    sources: [...(f?.citations ?? []), ...m.citations, ...(a?.citations ?? [])],
  };
}

export type RankedCheck = QuickCheck & { upsidePct?: number };
/** Buy zone first, then by upside to intrinsic value; unvalued last. */
export function rankChecks(checks: QuickCheck[]): RankedCheck[] {
  const order: Record<Zone, number> = { "Buy zone": 0, "Fair value range": 1, Expensive: 2, "Not valued": 3 };
  return checks.map(c => ({ ...c, upsidePct: c.valuation.available ? c.valuation.upsidePct : undefined }))
    .sort((x, y) => order[x.zone] - order[y.zone] || (y.upsidePct ?? -1e9) - (x.upsidePct ?? -1e9));
}
