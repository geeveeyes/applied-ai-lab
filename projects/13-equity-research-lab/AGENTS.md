# Agent operating guide — Equity Research Lab

Two AI coding agents work on this project: **Codex/ChatGPT** and **Claude**. Venkat is the owner and the tiebreaker.
Both agents follow this file. `CLAUDE.md` imports it.

## Sources of truth

| What | Where |
|------|-------|
| Code, technical state, next engineering tasks | This repo. **`HANDOFF.md` is the baton.** |
| Human decisions, status, action items, owners | Notion → 🧠 Venkat AI Hub → *Project — Equity Research Lab*, **Decision Log**, **AI Action Inbox**, **Agent Handoff Contract** |
| Review findings / backlog rationale | `docs/REVIEW_*.md` |

If Notion and `HANDOFF.md` conflict, the newer dated entry wins. A decision Venkat made in Notion overrides the repo.

## Session start

1. `git pull` on `main`.
2. Read `HANDOFF.md`, then `PROJECT_STATUS.md` and the latest `docs/REVIEW_*.md`.
3. Check the Notion project page's Handoff log and Decisions for entries newer than `HANDOFF.md`.
4. Baseline: `npm ci && npx tsc --noEmit && npm test`. If the baseline fails, stop and report it before changing anything.
5. Read the Notion **Agent Handoff Contract** and the AI Action Inbox cards where Project = Equity Research Lab and Owner is you or *Any agent*. Claim the card you take (Status WIP, Owner = you). Cards marked *NEEDS VENKAT APPROVAL* stay unstarted until Venkat says go.

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
   Record any durable product decision in **Decision Log**.
4. Update every AI Action Inbox card you touched: finished = Done plus a Link; handing to another agent or to Venkat = change `Owner`, set `Done when`, and add a dated handoff note (format in the Contract). Every open card has exactly one Owner. `HANDOFF.md` "Next up" items must exist as Inbox cards.

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
