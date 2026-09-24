"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function TickerSearch() {
  const [ticker, setTicker] = useState("NVDA");
  const router = useRouter();
  function submit(e: FormEvent) {
    e.preventDefault();
    const value = ticker.trim().toUpperCase();
    if (value) router.push(`/company/${encodeURIComponent(value)}`);
  }
  return (
    <form className="ticker-search" onSubmit={submit}>
      <input aria-label="Ticker symbol" value={ticker} onChange={(e) => setTicker(e.target.value)} placeholder="AAPL" />
      <button type="submit">Run research</button>
    </form>
  );
}
