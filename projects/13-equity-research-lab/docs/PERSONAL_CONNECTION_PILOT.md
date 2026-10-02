# Personal portfolio connection pilot

Approved October 1, 2026. Durable plan and checkpoints:
https://app.notion.com/p/3eddf6e02bd78120a3fcf8f8cc768af1

## What is ready

A private SnapTrade Personal reader retrieves accounts, positions and cash. It has no trading, refresh-purchase, registration or connection mutation methods. It limits each run to 20 accounts and makes no AI calls. It uses provider-cached data; this is not a scheduled daily sync yet.

The check prints only institution, counts, dates and warnings. It does not print account numbers, identifiers, holding symbols, values or credentials, and writes no files. SDK errors are redacted. The reader's in-memory result contains private financial data and must never be logged or committed.

## Portal step now implemented

The `/accounts` page has a manual refresh for Fidelity and Robinhood only. It requests each selected account's positions and cash, reports brokerage totals and provider timestamps, and displays missing-data warnings. It does not include the other connected institutions, add accounts together, convert currencies, estimate position values from units × price, call an AI provider, or place trades. The result stays in page memory and clears on reload; no brokerage record is written to Supabase or the repo.

The endpoint is POST-only, checks same-origin requests, and stays disabled unless `SNAPTRADE_PORTAL_ENABLED=true`. **Keep Vercel Deployment Protection set to All Deployments before enabling it.** The `research_workspace` cookie is still anonymous and must not be treated as account authentication. The existing private reader exposes only account, position and balance reads; it does not expose SnapTrade trading methods.

SnapTrade OAuth would provide a narrower `read` token, but current setup docs require a Commercial SnapTrade account to register an OAuth app. No commercial subscription or production OAuth app is included in this milestone. For this single-owner, login-protected portal, the Personal API key is the available route. SnapTrade notes that Personal API keys may have trading capabilities where enabled, so the dashboard must continue requesting read-only brokerage connections and this code must stay read-only.

## Owner setup

1. Create a Personal account at https://dashboard.snaptrade.com and verify email.
2. Connect Fidelity and Robinhood with read access. Do not enable trading or a paid add-on for this pilot.
3. Enable two-factor authentication, then create a Personal API key. Put `SNAPTRADE_CLIENT_ID` and `SNAPTRADE_CONSUMER_KEY` in the ignored local `.env.local` file. Never paste these into chat, Notion or GitHub.
4. Set `SNAPTRADE_PORTAL_ENABLED=true` only after confirming Vercel's All Deployments login protection is still enabled. For the live site, add all three values as server-only Vercel environment variables. Do not use a `NEXT_PUBLIC_` name. Never put the consumer key in browser code.
5. Using Node 22.18 or later, run from this app directory:

```sh
node --env-file=.env.local scripts/check-personal-connection.mjs
```

If setup is incomplete, the check exits with a generic error. No raw SDK errors should be printed for debugging. Personal authentication does not use a commercial user ID or user secret. In the portal, open **Connected accounts → Refresh Fidelity and Robinhood**; no data is fetched just by opening the page.

## Required before milestone 1 is complete

- Confirm the Vercel All Deployments login gate before setting `SNAPTRADE_PORTAL_ENABLED=true`; the callback-free Personal API flow relies on that gate for portal access. If the portal ever becomes public, remove this route until real owner authentication is added.
- Verify actual brokerage account types, shares, cash, total and provider dates against Fidelity and Robinhood. User setup is pending.
- Preserve missing positions as unknown, including unsupported retirement accounts. Check cash-equivalent positions before any summed valuation; they may already be included in cash. Buying power is not cash. Derivatives need correct multipliers; do not use units times price indiscriminately.
- Preserve currencies and source dates. Account totals are brokerage-reported, not reconstructed by this pilot. Do not combine currencies without dated FX data.
- Deduplicate stable institution account IDs. Accounts without them require overlap review; especially linked retirement/BrokerageLink accounts. No combined total is computed yet.
- Verify a second retrieval against provider update dates, then decide whether persistent immutable snapshots are needed. No scheduled task exists; refresh remains manual by design.
- If SnapTrade makes a Personal OAuth app available without a Commercial workspace, replace the broad Personal API key with a `read`-only OAuth grant before considering a public app.

Monarch's official MCP exists but was under maintenance at verification. No Monarch connection or unofficial MCP was installed. Recheck https://status.monarch.com/en-us before implementing that path.

## Dependencies and validation

Official SDK 12.2.16 supports Personal authentication. It pins Axios 1.18.0; an override selects patched Axios 1.20.0. Existing Next/PostCSS and Vitest advisories remain separate maintenance. Seven synthetic tests cover missing credentials, duplicate accounts, cash versus buying power, missing cash, provider errors, unavailable holdings, account limits and freshness warnings. Live connectivity is unverified.

Provider documentation: https://docs.snaptrade.com/docs/getting-started and https://docs.snaptrade.com/docs/authentication-methods
