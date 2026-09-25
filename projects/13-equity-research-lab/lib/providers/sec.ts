import type { FundamentalsProvider, FundamentalsSnapshot } from "./types";

const SEC_HEADERS = {
  "User-Agent": process.env.SEC_USER_AGENT || "Equity Research Lab research@example.com",
  Accept: "application/json",
};

type TickerMap = Record<string, { cik_str: number; ticker: string; title: string }>;
type FactUnit = { val?: number; form?: string; filed?: string; start?: string; end?: string; fp?: string; fy?: number };

function annualCandidates(fact: any): FactUnit[] {
  const units = fact?.units?.USD;
  if (!Array.isArray(units)) return [];
  return (units as FactUnit[])
    .filter((x) => x.form === "10-K" && x.end && x.filed && typeof x.val === "number")
    .filter((x) => {
      if (!x.start || !x.end) return true;
      const days = (new Date(x.end).getTime() - new Date(x.start).getTime()) / 86400000;
      return days >= 300 && days <= 430;
    });
}

function latestAnnualAcross(...facts: any[]): FactUnit | undefined {
  return facts
    .flatMap(annualCandidates)
    .sort((a, b) => {
      const endCompare = String(b.end).localeCompare(String(a.end));
      if (endCompare !== 0) return endCompare;
      return String(b.filed).localeCompare(String(a.filed));
    })[0];
}

export class SecProvider implements FundamentalsProvider {
  async getFundamentals(ticker: string): Promise<FundamentalsSnapshot> {
    const retrievedAt = new Date().toISOString();
    const tickersRes = await fetch("https://www.sec.gov/files/company_tickers.json", { headers: SEC_HEADERS, next: { revalidate: 86400 } });
    if (!tickersRes.ok) throw new Error(`SEC ticker lookup failed: ${tickersRes.status}`);
    const tickerMap = (await tickersRes.json()) as TickerMap;
    const match = Object.values(tickerMap).find((x) => x.ticker.toUpperCase() === ticker.toUpperCase());
    if (!match) throw new Error(`Ticker ${ticker} not found in SEC company map`);

    const cik = String(match.cik_str).padStart(10, "0");
    const factsUrl = `https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`;
    const factsRes = await fetch(factsUrl, { headers: SEC_HEADERS, next: { revalidate: 21600 } });
    if (!factsRes.ok) throw new Error(`SEC companyfacts failed: ${factsRes.status}`);

    const data = await factsRes.json();
    const gaap = data?.facts?.["us-gaap"] ?? {};

    // Companies can migrate between XBRL taxonomy tags over time.
    // Choose the newest annual fact ACROSS compatible tags rather than taking
    // the first tag that happens to exist.
    const revenueFact = latestAnnualAcross(
      gaap.RevenueFromContractWithCustomerExcludingAssessedTax,
      gaap.Revenues,
      gaap.SalesRevenueNet,
    );
    const incomeFact = latestAnnualAcross(
      gaap.NetIncomeLoss,
      gaap.ProfitLoss,
    );
    const cashFact = latestAnnualAcross(
      gaap.NetCashProvidedByUsedInOperatingActivities,
      gaap.NetCashProvidedByUsedInOperatingActivitiesContinuingOperations,
    );

    const periodCandidates = [revenueFact, incomeFact, cashFact].filter(Boolean) as FactUnit[];
    const anchor = periodCandidates.sort((a, b) => String(b.end).localeCompare(String(a.end)))[0];

    return {
      companyName: data?.entityName ?? match.title,
      revenue: revenueFact?.val,
      netIncome: incomeFact?.val,
      operatingCashFlow: cashFact?.val,
      latestAnnualPeriodEnd: anchor?.end,
      latestAnnualFiledAt: anchor?.filed,
      citations: [{ title: `${match.title} SEC company facts`, url: factsUrl, source: "SEC", retrievedAt, tier: 1 }],
    };
  }
}
