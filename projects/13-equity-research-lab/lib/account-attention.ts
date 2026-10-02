import { sectorFor } from "./diversification";

export type AttentionPosition = {
  symbol: string | null;
  description?: string | null;
  kind: string | null;
  units: number | null;
  price: number | null;
  currency: string | null;
  cashEquivalent: boolean;
};

export type AttentionAccount = {
  institution: string;
  name: string | null;
  reportedTotal: { amount?: number | string | null; currency?: string | null } | null;
  positionsAvailable: boolean;
  positions: AttentionPosition[] | null;
};

export type AttentionFinding = {
  priority: "Review first" | "Review" | "Coverage gap";
  title: string;
  detail: string;
};

export type AccountAttention = {
  accountLabel: string;
  accountValueUsd: number | null;
  stockPositions: { symbol: string; valueUsd: number; weight: number | null; sector: string }[];
  amzn: { valueUsd: number; weight: number | null } | null;
  fundsValueUsd: number;
  findings: AttentionFinding[];
  incomplete: boolean;
};

const STOCK_KINDS = new Set(["stock", "adr"]);
const FUND_KINDS = new Set(["etf", "mutualfund", "cef"]);

/**
 * A conservative, account-scoped attention review. This deliberately does not
 * produce a household total: linked/duplicate accounts and unsupported assets
 * are not yet reconciled. Values use USD units × price only for known simple
 * stock/fund kinds, and never include cash-equivalent positions.
 */
export function accountAttention(account: AttentionAccount): AccountAttention {
  const accountLabel = [account.institution, account.name].filter(Boolean).join(" · ") || "Account";
  const reportedAmount = finiteAmount(account.reportedTotal?.amount);
  const totalCurrency = account.reportedTotal?.currency?.toUpperCase() ?? null;
  const accountValueUsd = totalCurrency === "USD" && reportedAmount !== null && reportedAmount > 0
    ? reportedAmount : null;
  const findings: AttentionFinding[] = [];
  const stockValues = new Map<string, number>();
  let fundsValueUsd = 0;
  let incomplete = !account.positionsAvailable || !account.positions;

  if (!account.positionsAvailable || !account.positions) {
    findings.push({ priority: "Coverage gap", title: "Holdings unavailable", detail: "This account cannot be assessed from the returned positions. An empty list would not mean zero holdings." });
  } else {
    for (const position of account.positions) {
      if (position.cashEquivalent) continue;
      const kind = position.kind?.toLowerCase() ?? "";
      if (!STOCK_KINDS.has(kind) && !FUND_KINDS.has(kind)) {
        incomplete = true;
        continue;
      }
      if (position.currency?.toUpperCase() !== "USD" || !position.symbol || position.units === null || position.price === null ||
          !Number.isFinite(position.units) || !Number.isFinite(position.price) || position.units < 0 || position.price <= 0) {
        incomplete = true;
        continue;
      }
      const value = position.units * position.price;
      if (!Number.isFinite(value) || value <= 0) continue;
      if (STOCK_KINDS.has(kind)) stockValues.set(position.symbol.toUpperCase(), (stockValues.get(position.symbol.toUpperCase()) ?? 0) + value);
      else fundsValueUsd += value;
    }
  }

  if (!accountValueUsd) {
    incomplete = true;
    findings.push({ priority: "Coverage gap", title: "Account-level percentages unavailable", detail: "A positive USD brokerage total is needed before position weights can be calculated." });
  }

  const stockPositions = [...stockValues.entries()].map(([symbol, valueUsd]) => ({
    symbol, valueUsd, weight: accountValueUsd ? valueUsd / accountValueUsd : null, sector: sectorFor(symbol),
  })).sort((a, b) => b.valueUsd - a.valueUsd);

  for (const position of stockPositions) {
    if (position.weight !== null && position.weight > 0.10) {
      findings.push({
        priority: position.weight > 0.20 ? "Review first" : "Review",
        title: `${position.symbol} is a large position in this account`,
        detail: `${(position.weight * 100).toFixed(1)}% of this account's reported USD total (about ${usd(position.valueUsd)} from units × price). The 10% marker is a review threshold, not a target or trade instruction.`,
      });
    }
  }

  const sectorWeights = new Map<string, number>();
  for (const position of stockPositions) {
    if (position.weight !== null && position.sector !== "Unknown") {
      sectorWeights.set(position.sector, (sectorWeights.get(position.sector) ?? 0) + position.weight);
    }
  }
  for (const [sector, weight] of sectorWeights) {
    if (weight > 0.30) findings.push({
      priority: weight > 0.50 ? "Review first" : "Review",
      title: `${sector} is a large share of this account`,
      detail: `${(weight * 100).toFixed(1)}% of the account's reported USD total is in identified direct stocks from this sector. Other accounts and fund holdings are not included.`,
    });
  }

  const amznValue = stockValues.get("AMZN");
  const amzn = amznValue ? { valueUsd: amznValue, weight: accountValueUsd ? amznValue / accountValueUsd : null } : null;
  if (amzn) findings.push({
    priority: amzn.weight !== null && amzn.weight > 0.10 ? "Review first" : "Review",
    title: "Amazon appears in this account",
    detail: `${usd(amzn.valueUsd)} estimated from reported units × price${amzn.weight === null ? "; account percentage unavailable" : `, ${(amzn.weight * 100).toFixed(1)}% of this account`}. This is an account-level view; AMZN in other accounts is not combined here.`,
  });

  if (fundsValueUsd > 0) findings.push({
    priority: "Review",
    title: "Fund overlap is not checked",
    detail: `${usd(fundsValueUsd)} of identified funds are in this account. Their underlying stocks and overlap with Amazon or direct holdings are unknown.`,
  });
  if (incomplete && account.positionsAvailable && account.positions) findings.push({
    priority: "Coverage gap",
    title: "Some exposure is not counted",
    detail: "Non-USD, unsupported, unidentified or incomplete positions are excluded from the estimates. Cash-equivalent holdings are also excluded because they may already be included in cash.",
  });
  if (findings.length === 0) findings.push({
    priority: "Review",
    title: "No flagged direct-stock concentration in this account",
    detail: incomplete ? "This is limited to identified USD stock positions. Review account warnings and excluded holdings before relying on it." : "Identified direct-stock positions are below the 10% account-level marker. This does not assess other accounts or underlying fund exposure.",
  });

  const priorityRank = { "Review first": 0, "Review": 1, "Coverage gap": 2 };
  findings.sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority]);
  return { accountLabel, accountValueUsd, stockPositions, amzn, fundsValueUsd, findings, incomplete };
}

function finiteAmount(value: number | string | null | undefined): number | null {
  const amount = typeof value === "string" && value.trim() ? Number(value) : value;
  return typeof amount === "number" && Number.isFinite(amount) ? amount : null;
}

function usd(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}
