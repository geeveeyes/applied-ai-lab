import type { FundamentalsProvider, FundamentalsSnapshot } from "./types";

const SEC_HEADERS = {
  "User-Agent": process.env.SEC_USER_AGENT || "Equity Research Lab research@example.com",
  Accept: "application/json",
};

type TickerMap = Record<string, { cik_str: number; ticker: string; title: string }>;

function latestUsd(fact: any): number | undefined {
  const units = fact?.units?.USD;
  if (!Array.isArray(units)) return undefined;
  const annual = units.filter((x: any) => x.form === "10-K" || x.form === "10-Q");
  const item = annual.sort((a: any, b: any) => String(b.filed).localeCompare(String(a.filed)))[0];
  return item?.val;
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
    return {
      companyName: data?.entityName ?? match.title,
      revenue: latestUsd(gaap.Revenues ?? gaap.RevenueFromContractWithCustomerExcludingAssessedTax),
      netIncome: latestUsd(gaap.NetIncomeLoss),
      operatingCashFlow: latestUsd(gaap.NetCashProvidedByUsedInOperatingActivities),
      citations: [{ title: `${match.title} SEC company facts`, url: factsUrl, source: "SEC", retrievedAt, tier: 1 }],
    };
  }
}
