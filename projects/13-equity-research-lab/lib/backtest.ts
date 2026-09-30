import { intrinsicValuation } from "./intrinsic-valuation";
import { zoneFor, type Zone } from "./quick-check";
import type { History } from "./portfolio/history";

// Point-in-time backtest of the valuation zones. For each past date it uses ONLY SEC facts
// that had been filed by that date and the month-end adjusted price, runs the same DCF,
// assigns a zone, then measures the next 12 months' total return (adjusted closes include
// dividends) against SPY. Known deviation from the live model: historical consensus
// forecasts aren't available point-in-time, so growth = trailing 3-year revenue CAGR as filed.

type Fact = { val?: number; form?: string; filed?: string; start?: string; end?: string };
type Facts = { facts?: { "us-gaap"?: Record<string, any>; dei?: Record<string, any> } };

const ANNUAL_FORMS = ["10-K", "10-K/A", "20-F", "20-F/A", "40-F", "40-F/A"];
const days = (a: string, b: string) => (Date.parse(b) - Date.parse(a)) / 86400000;

function annual(tag: any, asOf: string, unit = "USD"): Fact[] {
  const u = tag?.units?.[unit];
  if (!Array.isArray(u)) return [];
  return (u as Fact[]).filter(x => typeof x.val === "number" && x.start && x.end && x.filed && x.filed <= asOf && ANNUAL_FORMS.includes(x.form ?? "") && days(x.start, x.end) >= 300 && days(x.start, x.end) <= 430);
}
function instant(tag: any, asOf: string, unit = "USD"): Fact[] {
  const u = tag?.units?.[unit];
  if (!Array.isArray(u)) return [];
  return (u as Fact[]).filter(x => typeof x.val === "number" && !x.start && x.end && x.filed && x.filed <= asOf);
}
/** Newest period; for the same period, the latest filing known by asOf (restatements included). */
const newest = (xs: Fact[]) => [...xs].sort((a, b) => String(b.end).localeCompare(String(a.end)) || String(b.filed).localeCompare(String(a.filed)))[0];
const pick = (tags: any[], asOf: string) => newest(tags.flatMap(t => annual(t, asOf)));
const onEnd = (tags: any[], asOf: string, end?: string) => end ? newest(tags.flatMap(t => annual(t, asOf)).filter(x => x.end === end))?.val : undefined;

export type PitFundamentals = {
  periodEnd?: string; revenue?: number; revenue3yAgo?: number; netIncome?: number; operatingCashFlow?: number; capex?: number;
  cash?: number; debt?: number; shares?: number; financialInstitution: boolean;
};

export function pointInTime(data: Facts, asOf: string): PitFundamentals {
  const g = data.facts?.["us-gaap"] ?? {}, dei = data.facts?.dei ?? {};
  const revTags = [g.RevenueFromContractWithCustomerExcludingAssessedTax, g.Revenues, g.SalesRevenueNet];
  const rev = pick(revTags, asOf);
  const end = rev?.end;
  const threeBack = end ? newest(revTags.flatMap(t => annual(t, asOf)).filter(x => Math.abs(days(x.end!, end) - 3 * 365.25) <= 45)) : undefined;
  const ocf = onEnd([g.NetCashProvidedByUsedInOperatingActivities, g.NetCashProvidedByUsedInOperatingActivitiesContinuingOperations], asOf, end);
  const capex = onEnd([g.PaymentsToAcquirePropertyPlantAndEquipment, g.PaymentsToAcquireProductiveAssets], asOf, end);
  const ni = onEnd([g.NetIncomeLoss, g.ProfitLoss], asOf, end);
  const cashF = newest([...instant(g.CashAndCashEquivalentsAtCarryingValue, asOf)]);
  const bs = cashF?.end;
  const at = (tag: any) => bs ? newest(instant(tag, asOf).filter(x => x.end === bs))?.val : undefined;
  const sti = at(g.ShortTermInvestments) ?? at(g.MarketableSecuritiesCurrent) ?? at(g.AvailableForSaleSecuritiesDebtSecuritiesCurrent);
  const ltd = at(g.LongTermDebt);
  const debtParts = ltd != null ? [ltd, at(g.ShortTermBorrowings), at(g.CommercialPaper)] : [at(g.LongTermDebtNoncurrent), at(g.LongTermDebtCurrent), at(g.ShortTermBorrowings), at(g.CommercialPaper)];
  const debt = debtParts.some(x => x != null) ? debtParts.reduce<number>((a, x) => a + (x ?? 0), 0) : undefined;
  const sharesFact = newest(instant(dei.EntityCommonStockSharesOutstanding, asOf, "shares")) ?? newest(annual(g.WeightedAverageNumberOfDilutedSharesOutstanding, asOf, "shares"));
  return {
    periodEnd: end, revenue: rev?.val, revenue3yAgo: threeBack?.val, netIncome: ni, operatingCashFlow: ocf, capex: capex != null ? Math.abs(capex) : undefined,
    cash: cashF ? (cashF.val ?? 0) + (sti ?? 0) : undefined, debt, shares: sharesFact?.val,
    financialInstitution: Boolean(g.Deposits || g.InterestBearingDepositLiabilities || g.LiabilityForFuturePolicyBenefits),
  };
}

/** Month-end close on or before the date (within 40 days): adjusted by default, or the actual (raw) close. */
export function priceAt(h: History, date: string, kind: "adjusted" | "raw" = "adjusted"): number | undefined {
  const row = [...h.prices].filter(p => p.date <= date).sort((a, b) => b.date.localeCompare(a.date))[0];
  if (!row || days(row.date, date) > 40) return undefined;
  return kind === "raw" ? row.raw : row.close;
}
const addMonths = (d: string, m: number) => { const x = new Date(`${d}T00:00:00Z`); x.setUTCMonth(x.getUTCMonth() + m); return x.toISOString().slice(0, 10); };

export type BacktestRow = { ticker: string; date: string; price: number; zone: Zone; upsidePct?: number; growthPct?: number; returnPct: number; spyReturnPct: number; excessPct: number };

export function backtestTicker(ticker: string, facts: Facts, h: History, spy: History, dates: string[]): { rows: BacktestRow[]; skipped: string[] } {
  const rows: BacktestRow[] = [], skipped: string[] = [];
  for (const date of dates) {
    const end = addMonths(date, 12);
    // Returns use adjusted closes (splits + dividends). Valuation compares against the ACTUAL price on the
    // date, because filed share counts and per-share values are in that date's (pre-split) units.
    const p0 = priceAt(h, date), p1 = priceAt(h, end), s0 = priceAt(spy, date), s1 = priceAt(spy, end), actual = priceAt(h, date, "raw");
    if (!p0 || !p1 || !s0 || !s1) { skipped.push(`${ticker} ${date}: price history incomplete`); continue; }
    if (!actual) { skipped.push(`${ticker} ${date}: actual (unadjusted) price unavailable in cached history; retry after the cache refreshes`); continue; }
    const f = pointInTime(facts, date);
    if (!f.revenue || !f.shares || !f.periodEnd) { skipped.push(`${ticker} ${date}: no filed annual revenue/shares yet`); continue; }
    const growth = f.revenue3yAgo && f.revenue3yAgo > 0 ? Math.pow(f.revenue / f.revenue3yAgo, 1 / 3) - 1 : undefined;
    const v = intrinsicValuation({
      asOf: date, price: actual, marketCap: actual * f.shares, revenue: f.revenue, operatingCashFlow: f.operatingCashFlow, capitalExpenditures: f.capex,
      freeCashFlow: f.operatingCashFlow != null && f.capex != null ? f.operatingCashFlow - f.capex : undefined, netIncome: f.netIncome,
      cash: f.cash, debt: f.debt, annualPeriodEnd: f.periodEnd, financialInstitution: f.financialInstitution,
      estimates: growth != null ? [{ date: addMonths(f.periodEnd, 36), revenueAvg: f.revenue * Math.pow(1 + growth, 3) }] : [],
    });
    const ret = (p1 / p0 - 1) * 100, spyRet = (s1 / s0 - 1) * 100;
    rows.push({ ticker, date, price: actual, zone: zoneFor(v, actual), upsidePct: v.available ? v.upsidePct : undefined, growthPct: growth != null ? Number((growth * 100).toFixed(1)) : undefined,
      returnPct: Number(ret.toFixed(1)), spyReturnPct: Number(spyRet.toFixed(1)), excessPct: Number((ret - spyRet).toFixed(1)) });
  }
  return { rows, skipped };
}

export function yearlyDates(fromYear: number, now = new Date()): string[] {
  const out: string[] = [], last = addMonths(now.toISOString().slice(0, 10), -13);
  for (let y = fromYear; ; y++) { const d = `${y}-01-31`; if (d > last) break; out.push(d); }
  return out;
}

export function summarize(rows: BacktestRow[]) {
  const zones: Zone[] = ["Buy zone", "Fair value range", "Expensive", "Not valued"];
  const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : undefined; };
  return zones.map(zone => {
    const r = rows.filter(x => x.zone === zone), ex = r.map(x => x.excessPct);
    return { zone, n: r.length, meanExcess: r.length ? Number((ex.reduce((a, b) => a + b, 0) / r.length).toFixed(1)) : undefined,
      medianExcess: median(ex), beatSpy: r.length ? r.filter(x => x.excessPct > 0).length / r.length : undefined };
  });
}
