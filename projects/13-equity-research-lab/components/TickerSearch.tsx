"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function TickerSearch() {
  const [ticker, setTicker] = useState("NVDA");
  const router = useRouter();
  const [error, setError] = useState("");
  function submit(e: FormEvent) {
    e.preventDefault();
    const value = ticker.trim().toUpperCase();
    if (!/^[A-Z.\-]{1,10}$/.test(value)) { setError("Enter a valid ticker, such as NVDA or BRK-B."); return; }
    setError("");
    if (value) router.push(`/company/${encodeURIComponent(value)}`);
  }
  return (
    <form className="ticker-search" onSubmit={submit}>
      <input aria-label="Ticker symbol" value={ticker} onChange={(e) => setTicker(e.target.value)} placeholder="AAPL" />
      <button type="submit">Run research</button>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
