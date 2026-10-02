import { TickerSearch } from "@/components/TickerSearch";

export default function Home() {
  return <>
    <section className="hero">
      <div><p className="eyebrow">DISCOVER · RESEARCH · LEARN</p><h1>Equity Research Lab</h1><p className="lede">One investment score. Understand the growth potential, decide whether to buy, hold or wait, and compare strategies for shares you already own.</p><TickerSearch /></div>
      <div className="hero-card"><strong>One decision, backed by evidence.</strong><p>Company and market data plus current web research inform a 12-month investment view. Every conclusion shows its reasons, counterarguments and missing evidence.</p><p>New research can take a few minutes. Saved reports reopen without repeating the analysis.</p></div>
    </section>
    <section><h2>Start with your portfolio</h2><p>Refresh Fidelity and Robinhood once. In this tab, the same account snapshot flows into My holdings, Portfolio Lab, and the holding-diversification tool.</p><div className="scenario-grid"><article className="panel"><span className="step">01</span><h3>Connect and review accounts</h3><p>See what was refreshed, spot missing data, and move the same holdings into your portfolio tools.</p><a href="/accounts">Refresh connected accounts →</a></article><article className="panel"><span className="step">02</span><h3>What should I do with what I own?</h3><p>Review hold / add / trim signals and concentration across the connected holdings.</p><a href="/holdings">Open My holdings →</a></article><article className="panel"><span className="step">03</span><h3>How could portfolio changes play out?</h3><p>Compare your current mix with another allocation in Portfolio Lab.</p><a href="/portfolio">Open Portfolio Lab →</a></article><article className="panel"><span className="step">04</span><h3>What if I trim a large holding?</h3><p>Select any large company holding and compare several trim ratios.</p><a href="/amzn">Diversify a holding →</a></article></div></section>
    <section className="panel"><h2>How the tool spends credits</h2><p>Quick checks, holdings decisions and the track record use no AI credits. Full research reports use paid AI and data calls, run only when you click Run, are reused for the rest of the day and are capped per day.</p></section>
  </>;
}
