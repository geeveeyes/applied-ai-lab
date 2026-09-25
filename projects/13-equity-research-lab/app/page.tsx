import { TickerSearch } from "@/components/TickerSearch";

export default function Home() {
  return <>
    <section className="hero">
      <div><p className="eyebrow">DISCOVER · RESEARCH · LEARN</p><h1>Equity Research Lab</h1><p className="lede">Analyze a company, understand what the market already expects, preserve the prediction, and later grade the thesis against reality.</p><TickerSearch /></div>
      <div className="hero-card"><strong>Research is not a rating.</strong><p>We separately score business quality, expectations, valuation and timing—then red-team the thesis before producing a research verdict.</p></div>
    </section>
    <section><h2>The loop</h2><div className="scenario-grid"><article className="panel"><span className="step">01</span><h3>Discover</h3><p>Find companies worth deep work using quality, revisions, valuation and catalysts.</p></article><article className="panel"><span className="step">02</span><h3>Research</h3><p>SEC-first fundamentals, analyst intelligence, expectation gaps, scenarios and thesis killers.</p></article><article className="panel"><span className="step">03</span><h3>Learn</h3><p>Freeze every prediction and measure 30d / 90d / 180d / 365d outcomes later.</p></article></div></section>
    <section className="panel"><h2>Start your research</h2><p>Try <a href="/company/NVDA">NVDA</a>, <a href="/company/MSFT">MSFT</a>, or <a href="/company/AMZN">AMZN</a>. Each report identifies its data mode, evidence gaps and assumptions.</p></section>
  </>;
}
