import type { AnalystCall, Citation } from "../types";

export type FundamentalsSnapshot = {
  companyName?: string;
  revenue?: number;
  netIncome?: number;
  operatingCashFlow?: number;
  capitalExpenditures?: number;
  freeCashFlow?: number;
  latestAnnualPeriodEnd?: string;
  latestAnnualForm?: string;
  latestAnnualFiledAt?: string;
  latestQuarterPeriodEnd?: string;
  latestQuarterFiledAt?: string;
  latestQuarterRevenue?: number;
  latestQuarterNetIncome?: number;
  latestQuarterGrossProfit?: number;
  latestQuarterGrossMargin?: number;
  latestQuarterFormUrl?: string;
  citations: Citation[];
};

export type MarketSnapshot = {
  priceTiming?: "end-of-day";
  source?: string;
  notes?: string[];
  companyName?: string;
  price?: number;
  marketCap?: number;
  yearHigh?: number;
  yearLow?: number;
  priceAvg50?: number;
  priceAvg200?: number;
  changePercentage?: number;
  timestamp?: string;
  citations: Citation[];
};

export type EstimateRow = {
  date?: string;
  revenueAvg?: number;
  revenueLow?: number;
  revenueHigh?: number;
  epsAvg?: number;
  epsLow?: number;
  epsHigh?: number;
  numAnalystsRevenue?: number;
  numAnalystsEps?: number;
};

export type AnalystSnapshot = {
  calls: AnalystCall[];
  consensusTarget?: number;
  targetHigh?: number;
  targetLow?: number;
  targetMedian?: number;
  estimates: EstimateRow[];
  ratings?: Record<string, number>;
  citations: Citation[];
  unavailable: string[];
};

export interface FundamentalsProvider {
  getFundamentals(ticker: string): Promise<FundamentalsSnapshot>;
}
export interface MarketProvider {
  getMarket(ticker: string): Promise<MarketSnapshot>;
}
export interface AnalystProvider {
  getAnalysts(ticker: string): Promise<AnalystSnapshot>;
}
