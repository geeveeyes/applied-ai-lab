import { describe, expect, it } from "vitest";
import { importBrokerCsv, num, parseCsv } from "../lib/broker-import";
import { holdingsSchema } from "../lib/holdings";

// Synthetic exports that mirror common broker layouts (no real account data).
const fidelity = `Account Number,Account Name,Symbol,Description,Quantity,Last Price,Last Price Change,Current Value,Today's Gain/Loss Dollar,Today's Gain/Loss Percent,Total Gain/Loss Dollar,Total Gain/Loss Percent,Percent Of Account,Cost Basis Total,Average Cost Basis,Type
Z123,Individual,SPAXX**,HELD IN MONEY MARKET,,,,$5000.00,,,,,5%,,,Cash
Z123,Individual,AMZN,AMAZON.COM INC,300,$200.00,+$1.00,"$60,000.00",,,,,60%,"$15,000.00",$50.00,Cash
Z123,Individual,VTI,VANGUARD INDEX FDS TOTAL STK MKT ETF,50,$300.00,,"$15,000.00",,,,,15%,"$10,000.00",$200.00,Cash
Z456,Roth IRA,AMZN,AMAZON.COM INC,20,$200.00,,"$4,000.00",,,,,,$3000.00,$150.00,Cash
Z456,Roth IRA,Pending Activity,,,,,$100.00,,,,,,,,
Z456,Roth IRA,912828XX1,US TREASURY NOTE,10,$99.00,,$990.00,,,,,,,,Cash

"The data and information in this spreadsheet is provided to you solely for your use..."
"Date downloaded 09/30/2026 4:00 PM ET"`;

const schwab = `"Positions for account Individual ...123 as of 09:30 PM ET, 09/29/2026","","",""
"Symbol","Description","Qty (Quantity)","Price","Price Chng $ (Price Change $)","Mkt Val (Market Value)","Cost Basis","Security Type"
"MSFT","MICROSOFT CORP","10","$500.00","$1.00","$5,000.00","$3,000.00","Equity"
"SCHD","SCHWAB US DIVIDEND EQUITY ETF","100","$28.00","$0.10","$2,800.00","$2,500.00","ETFs & Closed End Funds"
"Cash & Cash Investments","--","--","--","--","$1,200.00","--","Cash and Money Market"
"Account Total","--","--","--","--","$9,000.00","$5,500.00","--"`;

const generic = `ticker,shares,price
nvda,5,100
BRK.B,2,400`;

describe("CSV parsing", () => {
  it("handles quotes, embedded commas and escaped quotes", () => {
    expect(parseCsv('a,"b,c","d ""e"""\r\n1,2,3')).toEqual([["a", "b,c", 'd "e"'], ["1", "2", "3"]]);
  });
  it("parses money formats", () => {
    expect([num("$1,234.50"), num("(12.30)"), num("--"), num("5%"), num("")]).toEqual([1234.5, -12.3, undefined, 5, undefined]);
  });
});

describe("broker import", () => {
  it("Fidelity: merges accounts, keeps cost basis, treats SPAXX as cash, skips pending and CUSIPs", () => {
    const r = importBrokerCsv(fidelity, "2026-09-30");
    expect(r.broker).toBe("Fidelity");
    const amzn = r.holdings.positions.find(p => p.symbol === "AMZN")!;
    expect(amzn.shares).toBe(320);
    expect(amzn.price).toBe(200);
    expect(amzn.averageCost).toBeCloseTo((15000 + 3000) / 320, 3);
    expect(r.merged).toEqual(["AMZN (2 accounts)"]);
    expect(r.holdings.positions.find(p => p.symbol === "VTI")!.kind).toBe("fund");
    expect(r.holdings.cashAvailable).toBe(5000);
    expect(r.holdings.totalValue).toBe(64000 + 15000 + 5000);
    expect(r.skipped.join(" ")).toMatch(/912828XX1/);
    expect(() => holdingsSchema.parse(r.holdings)).not.toThrow();
  });
  it("Schwab: finds the header after a title row, reads as-of date, cash row and ETFs", () => {
    const r = importBrokerCsv(schwab, "2026-09-30");
    expect(r.broker).toBe("Schwab");
    expect(r.holdings.asOf).toBe("2026-09-29");
    expect(r.holdings.positions.map(p => [p.symbol, p.kind])).toEqual([["MSFT", "stock"], ["SCHD", "fund"]]);
    expect(r.holdings.positions[0].averageCost).toBe(300);
    expect(r.holdings.cashAvailable).toBe(1200);
    expect(r.holdings.totalValue).toBe(9000);
    expect(() => holdingsSchema.parse(r.holdings)).not.toThrow();
  });
  it("generic: lowercase symbols, class shares, no value column", () => {
    const r = importBrokerCsv(generic, "2026-09-30");
    expect(r.holdings.positions.map(p => p.symbol)).toEqual(["NVDA", "BRK.B"]);
    expect(r.holdings.totalValue).toBe(1300);
  });
  it("explains a wrong file type", () => {
    expect(() => importBrokerCsv("Date,Action,Amount\n2026-01-01,Buy,100")).toThrow(/header row/);
  });
});
