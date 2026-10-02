import { Snaptrade, SnaptradeAuth } from "snaptrade-typescript-sdk";
import type { Account, AllAccountPositionsResponse, Balance } from "snaptrade-typescript-sdk";

// No web route imports this module until authenticated owner access is implemented.
export interface PortfolioReader {
  accounts(): Promise<Account[]>;
  positions(accountId: string): Promise<AllAccountPositionsResponse>;
  balances(accountId: string): Promise<Balance[]>;
}

export function createPersonalReader(env: Record<string, string | undefined> = process.env): PortfolioReader {
  if (typeof window !== "undefined") throw new Error("Portfolio access requires a private server.");
  const clientId = env.SNAPTRADE_CLIENT_ID;
  const consumerKey = env.SNAPTRADE_CONSUMER_KEY;
  if (!clientId || !consumerKey) throw new Error("SnapTrade Personal setup is incomplete.");
  const sdk = new Snaptrade({
    auth: SnaptradeAuth.personalApiKey({ clientId, consumerKey }),
    baseOptions: { timeout: 15_000, maxRedirects: 0 },
  });
  // Do not export the SDK: callers only receive these three read operations.
  return {
    accounts: async () => (await sdk.accountInformation.listUserAccounts()).data,
    positions: async (accountId) => (await sdk.accountInformation.getAllAccountPositions({ accountId })).data,
    balances: async (accountId) => (await sdk.accountInformation.getUserAccountBalance({ accountId })).data,
  };
}

export async function readPersonalPortfolio(reader: PortfolioReader, now = new Date()) {
  let accounts: Account[];
  try { accounts = await reader.accounts(); }
  catch { throw new Error("Unable to read SnapTrade accounts. Check the connection in SnapTrade."); }
  if (accounts.length > 20) throw new Error("More than 20 accounts: select a smaller scope before syncing.");
  const seen = new Set<string>();
  const snapshots = [];
  for (const account of accounts) {
    const identity = account.institution_account_id
      ? `${account.institution_name}:${account.institution_account_id}` : `snaptrade:${account.id}`;
    if (seen.has(identity)) continue;
    seen.add(identity);
    const warnings: string[] = [];
    const status = account.sync_status?.holdings;
    if (!account.institution_account_id) warnings.push("Account overlap across connections has not been verified.");
    if (!status?.initial_sync_completed) warnings.push("Initial holdings sync is not confirmed complete.");
    const lastSync = status?.last_successful_sync ?? null;
    const age = lastSync ? now.getTime() - Date.parse(lastSync) : NaN;
    if (!Number.isFinite(age) || age < 0 || age > 36 * 60 * 60 * 1000) warnings.push("Holdings update time is missing or outside the freshness window.");
    let positions: AllAccountPositionsResponse | null = null;
    let balances: Balance[] | null = null;
    if (status?.holdings_unavailable) {
      warnings.push("Brokerage does not expose holdings for this account; empty data would not mean zero holdings.");
    } else {
      const results = await Promise.allSettled([reader.positions(account.id), reader.balances(account.id)]);
      if (results[0].status === "fulfilled") positions = results[0].value;
      else warnings.push("Positions could not be retrieved.");
      if (results[1].status === "fulfilled") balances = results[1].value;
      else warnings.push("Cash balances could not be retrieved.");
    }
    snapshots.push({
      accountId: account.id, institution: account.institution_name,
      name: account.name, status: account.status ?? null,
      // Preserve the brokerage total; do not synthesize totals across currencies or derivatives.
      total: account.balance?.total ?? null,
      lastSync, positionsAsOf: positions?.data_freshness?.as_of ?? null,
      positions: positions?.results ?? null,
      cash: balances?.map((b) => ({ currency: b.currency?.code ?? null, amount: b.cash ?? null })) ?? null,
      warnings,
    });
  }
  return { source: "snaptrade" as const, retrievedAt: now.toISOString(), accounts: snapshots };
}
