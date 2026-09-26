import { TickerSearch } from "@/components/TickerSearch";

export default function Home() {
  return <>
    <section className="hero">
      <div><p className="eyebrow">DISCOVER · RESEARCH · LEARN</p><h1>Equity Research Lab</h1><p className="lede">One investment score. Understand the growth potential, decide whether to buy, hold or wait, and compare strategies for shares you already own.</p><TickerSearch /></div>
      <div className="hero-card"><strong>One decision, backed by evidence.</strong><p>Company and market data plus current web research inform a 12-month investment view. Every conclusion shows its reasons, counterarguments and missing evidence.</p><p>New research can take a few minutes. Saved reports reopen without repeating the analysis.</p></div>
    </section>
    <section><h2>The loop</h2><div className="scenario-grid"><article className="panel"><span className="step">01</span><h3>Discover</h3><p>Find companies worth deep work using quality, revisions, valuation and catalysts.</p></article><article className="panel"><span className="step">02</span><h3>Research</h3><p>SEC-first fundamentals, analyst intelligence, expectation gaps, scenarios and thesis killers.</p></article><article className="panel"><span className="step">03</span><h3>Learn</h3><p>Freeze every prediction and measure 30d / 90d / 180d / 365d outcomes later.</p></article></div></section>
    <section className="panel"><h2>Start your research</h2><p>Try <a href="/company/NVDA">NVDA</a>, <a href="/company/MSFT">MSFT</a>, or <a href="/company/AMZN">AMZN</a>. Each report identifies its data mode, evidence gaps and assumptions.</p></section>
  </>;
}
