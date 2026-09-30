import { TickerSearch } from "@/components/TickerSearch";

export default function Home() {
  return <>
    <section className="hero">
      <div><p className="eyebrow">DISCOVER · RESEARCH · LEARN</p><h1>Equity Research Lab</h1><p className="lede">One investment score. Understand the growth potential, decide whether to buy, hold or wait, and compare strategies for shares you already own.</p><TickerSearch /></div>
      <div className="hero-card"><strong>One decision, backed by evidence.</strong><p>Company and market data plus current web research inform a 12-month investment view. Every conclusion shows its reasons, counterarguments and missing evidence.</p><p>New research can take a few minutes. Saved reports reopen without repeating the analysis.</p></div>
    </section>
    <section><h2>What would you like to decide?</h2><div className="scenario-grid"><article className="panel"><span className="step">01</span><h3>What should I do with what I own?</h3><p>Save your holdings once. Get a hold / add / trim line for every position, concentration checks and the tax effect of trimming.</p><a href="/holdings">Review my holdings →</a></article><article className="panel"><span className="step">02</span><h3>What is worth buying, and at what price?</h3><p>Quick-check a watchlist for free: intrinsic value, buy-below price and valuation zone. Ideas for sectors you don&apos;t own yet.</p><a href="/watchlist">Open my watchlist →</a></article><article className="panel"><span className="step">03</span><h3>Should I buy this one stock?</h3><p>Search above for a full research report: evidence, counterarguments, a code-computed valuation and one explained decision.</p><a href="/opportunities">Screen across sectors →</a></article><article className="panel"><span className="step">04</span><h3>How do I diversify a big position?</h3><p>Compare keeping, trimming now or selling in stages, including taxes and simulated outcomes.</p><a href="/amzn">Compare AMZN choices →</a></article></div></section>
    <section className="panel"><h2>How the tool spends credits</h2><p>Quick checks, holdings decisions and the track record use no AI credits. Full research reports use paid AI and data calls, run only when you click Run, are reused for the rest of the day and are capped per day.</p></section>
  </>;
}
