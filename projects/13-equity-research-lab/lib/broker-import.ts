import type { Holdings } from "./holdings";

// Parse a broker "positions" CSV export (Fidelity, Schwab, Vanguard, E*TRADE or any CSV
// with symbol + quantity columns) into a holdings snapshot. Runs in the browser; the file
// never leaves the device. Heuristics are explicit and every row that is skipped or
// guessed is reported back so the user can correct it before saving.

export type ImportResult = {
  holdings: Holdings;
  broker: string;
  skipped: string[];
  guessedFunds: string[];
  merged: string[];
  warnings: string[];
};

/** RFC-4180-ish CSV parser: quoted fields, escaped quotes, CRLF. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); rows.push(row); row = []; field = "";
    } else field += c;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows.map(r => r.map(x => x.trim())).filter(r => r.some(x => x !== ""));
}

/** "$1,234.50", "(12.30)", "1,000", "--", "n/a" → number | undefined */
export function num(raw?: string): number | undefined {
  if (raw == null) return undefined;
  const s = raw.replace(/[$,\s]/g, "").replace(/^\((.*)\)$/, "-$1").replace(/%$/, "");
  if (!s || /^(--|n\/a|na|-)$/i.test(s)) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

const norm = (h: string) => h.toLowerCase().replace(/\(.*?\)/g, "").replace(/[^a-z]/g, "");
const COLS: Record<string, string[]> = {
  symbol: ["symbol", "ticker", "securitysymbol", "sym"],
  quantity: ["quantity", "qty", "shares", "sharesheld", "units"],
  price: ["lastprice", "price", "shareprice", "currentprice", "marketprice", "lastpricedollars"],
  value: ["currentvalue", "marketvalue", "mktval", "totalvalue", "value", "marketvaluedollars"],
  avgCost: ["averagecostbasis", "averagecost", "avgcost", "costpershare", "averageprice", "pricepaid"],
  costTotal: ["costbasistotal", "costbasis", "totalcost", "costbasisdollars"],
  type: ["type", "securitytype", "assettype", "investmenttype", "sectype"],
  description: ["description", "name", "securitydescription", "investmentname", "investment"],
};

function findHeader(rows: string[][]) {
  for (let i = 0; i < Math.min(rows.length, 30); i++) {
    const cells = rows[i].map(norm);
    const has = (k: string) => cells.findIndex(c => COLS[k].includes(c));
    if (has("symbol") >= 0 && has("quantity") >= 0) {
      const map: Record<string, number> = {};
      for (const k of Object.keys(COLS)) map[k] = has(k);
      return { index: i, map };
    }
  }
  return null;
}

function detectBroker(text: string, header: string[]) {
  const h = header.map(norm).join(",");
  if (/accountnumber,accountname,symbol/.test(h) || /fidelity/i.test(text.slice(0, 2000))) return "Fidelity";
  if (/positions for account/i.test(text.slice(0, 300)) || /qtyquantity|mktval/.test(header.map(x => x.toLowerCase().replace(/[^a-z]/g, "")).join(","))) return "Schwab";
  if (/shareprice/.test(h) && /totalvalue/.test(h)) return "Vanguard";
  return "Generic CSV";
}

const CASH = /\*\*$|^(cash|cash & cash investments|core|money market)$/i;
const CASH_DESC = /money market|cash reserves|government money|treasury money|sweep|fdic/i;
const TOTAL = /^(account total|total|totals|grand total)$/i;
const SECURITY_TYPE = /equity|stock|common|etf|etp|fund|closed.?end|index|adr|reit/i;
const FUND_TYPE = /etf|etp|mutual fund|fund|closed.?end|index/i;
const FUND_DESC = /\b(etf|index|fund|trust|ishares|vanguard|spdr|invesco|schwab .*etf|select sector)\b/i;

export function importBrokerCsv(text: string, today = new Date().toISOString().slice(0, 10)): ImportResult {
  const rows = parseCsv(text.replace(/^﻿/, ""));
  const header = findHeader(rows);
  if (!header) throw new Error("Could not find a header row with Symbol and Quantity columns. Export 'Positions' (not activity/history) from your broker as CSV.");
  const { index, map } = header;
  const get = (r: string[], k: string) => (map[k] >= 0 ? r[map[k]] : undefined);
  const broker = detectBroker(text, rows[index]);
  const asOfMatch = text.slice(0, 500).match(/as of.*?(\d{1,2})\/(\d{1,2})\/(\d{4})/i);
  const asOf = asOfMatch ? `${asOfMatch[3]}-${asOfMatch[1].padStart(2, "0")}-${asOfMatch[2].padStart(2, "0")}` : today;

  const skipped: string[] = [], guessedFunds: string[] = [], warnings: string[] = [];
  const bySymbol = new Map<string, { shares: number; value: number; cost?: number; kind: "stock" | "fund"; count: number }>();
  let cash = 0;
  for (const r of rows.slice(index + 1)) {
    if (r.length < 2) continue;
    const rawSymbol = (get(r, "symbol") ?? "").trim();
    const desc = get(r, "description") ?? "";
    const qty = num(get(r, "quantity"));
    const value = num(get(r, "value"));
    if (!rawSymbol && !desc) continue;
    if (TOTAL.test(rawSymbol) || TOTAL.test(desc)) continue;
    if (/^pending activity$/i.test(rawSymbol)) { skipped.push("Pending activity: unsettled, not counted as available cash"); continue; }
    if (CASH.test(rawSymbol) || CASH_DESC.test(desc) || /^cash/i.test(rawSymbol)) {
      const v = value ?? qty;
      if (v != null && v > 0) cash += v;
      continue;
    }
    const symbol = rawSymbol.toUpperCase().replace(/\s+/g, "").replace(/\//g, "-");
    if (!/^[A-Z][A-Z.\-]{0,9}$/.test(symbol)) { skipped.push(`${rawSymbol || desc}: not a listed stock/ETF symbol (options, bonds and CUSIPs are skipped)`); continue; }
    if (qty == null || qty <= 0) { skipped.push(`${symbol}: no positive quantity`); continue; }
    const price = num(get(r, "price")) ?? (value != null ? value / qty : undefined);
    if (!(price && price > 0)) { skipped.push(`${symbol}: no price or market value`); continue; }
    const avg = num(get(r, "avgCost"));
    const costTotal = num(get(r, "costTotal"));
    const cost = avg != null && avg > 0 ? avg * qty : costTotal != null && costTotal > 0 ? costTotal : undefined;
    const typeText = get(r, "type") ?? "";
    // Some brokers' "Type" is the account type (Fidelity: Cash/Margin); trust it only when it names a security type.
    const securityType = SECURITY_TYPE.test(typeText) ? typeText : "";
    const isFund = FUND_TYPE.test(securityType) || (!securityType && FUND_DESC.test(desc));
    if (isFund && !FUND_TYPE.test(securityType)) guessedFunds.push(symbol);
    const prev = bySymbol.get(symbol);
    const v = value ?? qty * price;
    bySymbol.set(symbol, prev
      ? { shares: prev.shares + qty, value: prev.value + v, cost: prev.cost != null && cost != null ? prev.cost + cost : undefined, kind: prev.kind === "fund" || isFund ? "fund" : "stock", count: prev.count + 1 }
      : { shares: qty, value: v, cost, kind: isFund ? "fund" : "stock", count: 1 });
  }
  if (!bySymbol.size) throw new Error("No positions were found. Check that the file is a positions export with quantities.");
  const merged = [...bySymbol.entries()].filter(([, p]) => p.count > 1).map(([s, p]) => `${s} (${p.count} accounts)`);
  const positions = [...bySymbol.entries()].map(([symbol, p]) => ({
    symbol, shares: Number(p.shares.toFixed(6)), price: Number((p.value / p.shares).toFixed(4)), kind: p.kind,
    ...(p.cost != null && p.cost > 0 ? { averageCost: Number((p.cost / p.shares).toFixed(4)) } : {}),
  }));
  const invested = positions.reduce((a, p) => a + p.shares * p.price, 0);
  if (positions.length > 500) warnings.push("Only the first 500 positions are kept.");
  if (asOf !== today) warnings.push(`Prices are as of ${asOf} from the export; use "Update prices from today's quick checks" to refresh.`);
  const holdings: Holdings = {
    version: 1, scope: `${broker} import`, asOf: asOf > today ? today : asOf, coverage: "complete",
    totalValue: Number((invested + cash).toFixed(2)), cashAvailable: Number(cash.toFixed(2)), positions: positions.slice(0, 500),
  };
  return { holdings, broker, skipped, guessedFunds, merged, warnings };
}
