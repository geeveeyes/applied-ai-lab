# Evals

The first deterministic eval is `tests/scoring.test.ts`.

Before calling the research agent production-ready, add at least three point-in-time fixtures:

1. a high-quality / high-valuation compounder,
2. a cyclical company with improving expectations,
3. a company where headline sentiment conflicts with deteriorating fundamentals.

Each fixture should assert score stability, source timestamps, no look-ahead data, scenario completeness, and retrospective return math.
