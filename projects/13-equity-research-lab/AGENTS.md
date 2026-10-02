# Agent operating guide — Equity Research Lab

Two AI coding agents work on this project: **Codex/ChatGPT** and **Claude**. Venkat is the owner and the tiebreaker.
Both agents follow this file. `CLAUDE.md` imports it.

## Sources of truth

| What | Where |
|------|-------|
| Code, technical state, next engineering tasks | This repo. **`HANDOFF.md` is the baton.** |
| Human decisions, status, action items | Notion → 🧠 Venkat AI Hub → *Project — Equity Research Lab*, **Decision Log**, **AI Action Inbox** |
| Review findings / backlog rationale | `docs/REVIEW_*.md` |

If Notion and `HANDOFF.md` conflict, the newer dated entry wins. A decision Venkat made in Notion overrides the repo.

## Session start

1. `git pull` on `main`.
2. Read `HANDOFF.md`, then `PROJECT_STATUS.md` and the latest `docs/REVIEW_*.md`.
3. Check the Notion project page's Handoff log and Decisions for entries newer than `HANDOFF.md`.
4. Baseline: `npm ci && npx tsc --noEmit && npm test`. If the baseline fails, stop and report it before changing anything.

## While working

- Branch: `claude/<topic>` or `codex/<topic>`. Never commit directly to `main` except the `HANDOFF.md` baton update after a merge.
- Keep one logical change per commit. Formatting-only changes go in their own commit.
- Don't rewrite another agent's work in the same session it landed unless the tests prove it's broken. Leave a note in `HANDOFF.md` instead.
- Merge to `main` only when tsc, tests and `npm run build` all pass.

## Session end (required, even if the work is unfinished)

1. Update `HANDOFF.md`:
   - move `Current holder` to `none` (or the next agent);
   - update `State`, the last commit SHA, test results, `Next up` and `Open questions`;
   - prepend a dated entry to `Log`.
2. Push the branch and/or merge.
3. Add one row to the Notion project page's **Handoff log** (date, agent, SHA, one-line summary, next step).
   Record any durable product decision in **Decision Log**. Put any action Venkat must take in **AI Action Inbox**.
4. In your final reply, give a separate status for each of these:
   - **GitHub:** code/docs branch, PR or commit, and whether the repository is current.
   - **Notion:** whether project AI context, the Handoff log and action items are current.
   - **Live portal/product:** whether deployment checks passed and what was actually verified in the running product. Distinguish a successful deployment from a working end-to-end flow; name anything unverified.
   - **Still needed:** any missing update, blocker, owner and next action. Never say everything is current when one of these is stale or unverified.
   Keep the report brief and never include private financial records or secrets.

## Invariants (don't break these)

- No fabricated market data, prices, estimates or citations. Missing data stays visibly missing.
- Deterministic math (scores, valuation, returns, grading) lives in code, not in the LLM.
- Every paid provider or LLM call must have a cap and must not run on an unauthenticated `GET`.
- Secrets are server-only. Never use `NEXT_PUBLIC_` for keys. Never put secrets in the repo or in Notion.
- Frozen snapshots are immutable. Retrospectives use only point-in-time information.
- This is a research tool. It does not place trades and must not present output as advice.

## Commands

```bash
npm ci
npx tsc --noEmit
npm test          # vitest
npm run build
npm run dev       # demo mode works without keys (NEXT_PUBLIC_APP_MODE=demo)
```
