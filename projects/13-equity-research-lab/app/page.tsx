import { TickerSearch } from "@/components/TickerSearch";

export default function Home() {
  return <>
    <section className="hero">
      <div><p className="eyebrow">DISCOVER · RESEARCH · LEARN</p><h1>Equity Research Lab</h1><p className="lede">One investment score. Understand the growth potential, decide whether to buy, hold or wait, and compare strategies for shares you already own.</p><TickerSearch /></div>
      <div className="hero-card"><strong>One decision, backed by evidence.</strong><p>Company and market data plus current web research inform a 12-month investment view. Every conclusion shows its reasons, counterarguments and missing evidence.</p><p>New research can take a few minutes. Saved reports reopen without repeating the analysis.</p></div>
    </section>
    <section><h2>What would you like to decide?</h2><div className="scenario-grid"><article className="panel"><span className="step">01</span><h3>Should I buy, hold, trim or wait?</h3><p>Search above for one explained investment score, evidence and what would change the conclusion.</p></article><article className="panel"><span className="step">02</span><h3>I want to diversify AMZN</h3><p>Compare keeping shares, reducing now and selling in stages, including assumed sale taxes.</p><a href="/amzn">Compare AMZN choices →</a></article><article className="panel"><span className="step">03</span><h3>I already own this</h3><p>Use your private holdings to calculate how an add or trim changes your portfolio weight.</p><a href="/holdings">Add my holdings →</a></article></div></section>
    <section className="panel"><h2>Start your research</h2><p>Try <a href="/company/NVDA">NVDA</a>, <a href="/company/MSFT">MSFT</a>, or <a href="/company/AMZN">AMZN</a>. Each report identifies its data mode, evidence gaps and assumptions.</p></section>
  </>;
}
