# Personal portfolio connection pilot

Approved October 1, 2026. Durable plan and checkpoints:
https://app.notion.com/p/3eddf6e02bd78120a3fcf8f8cc768af1

## What is ready

A private SnapTrade Personal reader retrieves accounts, positions and cash. It has no trading, refresh-purchase, registration or connection mutation methods. It limits each run to 20 accounts and makes no AI calls. It uses provider-cached data; this is not a scheduled daily sync yet.

The check prints only institution, counts, dates and warnings. It does not print account numbers, identifiers, holding symbols, values or credentials, and writes no files. SDK errors are redacted. The reader's in-memory result contains private financial data and must never be logged or committed.

## Owner setup

1. Create a Personal account at https://dashboard.snaptrade.com and verify email.
2. Connect Fidelity and Robinhood with read access. Do not enable trading or a paid add-on for this pilot.
3. For the local API pilot, enable two-factor authentication, then create a Personal API key. Put `SNAPTRADE_CLIENT_ID` and `SNAPTRADE_CONSUMER_KEY` in the ignored local `.env.local` file. Never paste these into chat, Notion or GitHub. Do not add them to the deployed application yet.
4. Using Node 22.18 or later, run from this app directory:

```sh
node --env-file=.env.local scripts/check-personal-connection.mjs
```

If setup is incomplete, the check exits with a generic error. No raw SDK errors should be printed for debugging. Personal authentication does not use a commercial user ID or user secret.

## Required before milestone 1 is complete

- Implement owner authentication and bind private snapshots to that owner before adding web routes. The existing workspace cookie is anonymous and insufficient.
- Verify actual brokerage account types, shares, cash, total and provider dates against Fidelity and Robinhood. User setup is pending.
- Preserve missing positions as unknown, including unsupported retirement accounts. Check cash-equivalent positions before any summed valuation; they may already be included in cash. Buying power is not cash. Derivatives need correct multipliers; do not use units times price indiscriminately.
- Preserve currencies and source dates. Account totals are brokerage-reported, not reconstructed by this pilot. Do not combine currencies without dated FX data.
- Deduplicate stable institution account IDs. Accounts without them require overlap review; especially linked retirement/BrokerageLink accounts. No combined total is computed yet.
- Verify a second retrieval against provider update dates, then add persistent immutable snapshots and daily scheduling with failure visibility. No scheduled task exists yet.
- Confirm secure credential storage for deployment. Prefer scoped personal OAuth for the web app when feasible; this API-key pilot is local only.

Monarch's official MCP exists but was under maintenance at verification. No Monarch connection or unofficial MCP was installed. Recheck https://status.monarch.com/en-us before implementing that path.

## Dependencies and validation

Official SDK 12.2.16 supports Personal authentication. It pins Axios 1.18.0; an override selects patched Axios 1.20.0. Existing Next/PostCSS and Vitest advisories remain separate maintenance. Seven synthetic tests cover missing credentials, duplicate accounts, cash versus buying power, missing cash, provider errors, unavailable holdings, account limits and freshness warnings. Live connectivity is unverified.

Provider documentation: https://docs.snaptrade.com/docs/getting-started and https://docs.snaptrade.com/docs/authentication-methods
