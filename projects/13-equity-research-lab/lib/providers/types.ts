import type { AnalystCall, Citation } from "../types";

export type FundamentalsSnapshot = {
  companyName?: string;
  price?: number;
  revenue?: number;
  netIncome?: number;
  operatingCashFlow?: number;
  sharesOutstanding?: number;
  citations: Citation[];
};

export type AnalystSnapshot = {
  calls: AnalystCall[];
  consensusTarget?: number;
  citations: Citation[];
};

export interface FundamentalsProvider {
  getFundamentals(ticker: string): Promise<FundamentalsSnapshot>;
}

export interface AnalystProvider {
  getAnalysts(ticker: string): Promise<AnalystSnapshot>;
}
