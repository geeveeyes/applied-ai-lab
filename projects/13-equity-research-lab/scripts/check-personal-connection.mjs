// Node 22.18+ supports native TypeScript stripping. No data is written to disk.
import { createPersonalReader, readPersonalPortfolio } from '../lib/server/snaptrade-personal.ts';
try {
  const snapshot = await readPersonalPortfolio(createPersonalReader());
  console.log(JSON.stringify({
    retrievedAt: snapshot.retrievedAt,
    accounts: snapshot.accounts.map((a, i) => ({
      account: i + 1, institution: a.institution,
      lastSync: a.lastSync, positionsAsOf: a.positionsAsOf,
      positionCount: a.positions?.length ?? null,
      cashCurrencyCount: a.cash?.length ?? null,
      hasReportedTotal: a.total?.amount != null,
      warnings: a.warnings,
    })),
  }, null, 2));
} catch {
  // SDK errors can contain request credentials: never print the underlying exception.
  console.error('Connection check failed. Verify local credentials and the SnapTrade connection. No account data was saved.');
  process.exitCode = 1;
}
