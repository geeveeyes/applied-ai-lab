import { describe,it,expect,vi } from "vitest";
import { callPayoff, investmentDecision, plainSummary } from "../lib/decision";
import { parseGroundingResponse,safeSourceUrl } from "../lib/grounding";
import { sameOrigin } from "../lib/server/request-security";
import { demoResearch } from "../lib/mock-data";
import { changeSnapshotVisibility, ownerHash } from "../lib/server/archive";
const mocks=vi.hoisted(()=>({db:vi.fn(),cookies:vi.fn()}));
vi.mock("../lib/server/supabase",()=>({database:mocks.db}));
vi.mock("next/headers",()=>({cookies:mocks.cookies}));
const base={strategy:"call" as const,strike:100,debit:5,contracts:2,targetPrice:120,expiration:"2027-12-31",budget:1000};
describe("options payoff",()=>{
 it("calculates long-call loss, break-even and profit at expiry",()=>{expect(callPayoff(base,"2026-09-25")).toMatchObject({maxLoss:1000,breakEven:105,profitAtTarget:3000,maxGain:null,budgetExceeded:false,affordableContracts:2});});
 it("caps spread upside and accounts for both legs",()=>{expect(callPayoff({...base,strategy:"spread",shortStrike:110},"2026-09-25")).toMatchObject({maxLoss:1000,maxGain:1000,profitAtTarget:1000});});
 it("models total premium loss below the long strike",()=>{expect(callPayoff({...base,targetPrice:80},"2026-09-25").profitAtTarget).toBe(-1000);});
 it("rejects invalid spreads and expired or malformed dates",()=>{expect(()=>callPayoff({...base,strategy:"spread",shortStrike:104},"2026-09-25")).toThrow();expect(()=>callPayoff({...base,expiration:"2026-02-30"},"2026-01-01")).toThrow();expect(()=>callPayoff({...base,expiration:"2026-09-24"},"2026-09-25")).toThrow();});
 it("flags excessive risk budgets and rejects fractional contracts",()=>{expect(callPayoff({...base,budget:400},"2026-09-25").budgetExceeded).toBe(true);expect(()=>callPayoff({...base,contracts:1.5},"2026-09-25")).toThrow();});
});
describe("plain-English decision",()=>{
 it("reduces investment conviction when evidence is weak",()=>{const run={...demoResearch("NBIS"),dataMode:"hybrid" as const,score:80,confidence:25};expect(investmentDecision(run)).toMatchObject({confidence:20,action:"Wait for better evidence"});});
 it("does not label demo data investment-ready",()=>{expect(investmentDecision(demoResearch("NVDA")).available).toBe(false);});
 it("supports archived reports without new model calls",()=>{const run=demoResearch("NBIS");run.annualFinancials={periodEnd:"2025-12-31",revenue:500e6,netIncome:10e6,freeCashFlow:-100e6};expect(plainSummary(run).overview).toContain("2025-12-31");expect(plainSummary(run).overview).toContain("exceeded operating cash");});
});
describe("grounded citations and request safety",()=>{
 const payload={status:"completed",model:"model",output:[{type:"web_search_call",status:"completed"},{type:"message",content:[{type:"output_text",text:"Evidence [1]",annotations:[{type:"url_citation",url:"https://example.com/filing",title:"Filing",start_index:9,end_index:12}]}]}],usage:{input_tokens:150,output_tokens:100}};
 it("requires completed web searches and valid citation annotations",()=>{expect(parseGroundingResponse(payload)).toMatchObject({searchCalls:1,inputTokens:150,outputTokens:100});expect(()=>parseGroundingResponse({...payload,output:payload.output.slice(1)})).toThrow("No cited web");expect(()=>parseGroundingResponse({...payload,status:"incomplete"})).toThrow();});
 it("rejects unsafe links instead of rendering them",()=>{expect(safeSourceUrl("javascript:alert(1)")).toBeNull();expect(safeSourceUrl("https://127.0.0.1/secret")).toBeNull();expect(safeSourceUrl("https://user:pass@example.com")).toBeNull();});
 it("rejects cross-site mutation requests",()=>{expect(sameOrigin(new Request("https://example.com/api",{headers:{origin:"https://attacker.com"}}))).toBe(false);expect(sameOrigin(new Request("https://example.com/api",{headers:{origin:"https://example.com"}}))).toBe(true);});
 it("only changes archive visibility for the requesting workspace",async()=>{mocks.cookies.mockResolvedValue({get:()=>({value:"b".repeat(64)})});const q:any={update:vi.fn(()=>q),eq:vi.fn(()=>q),in:vi.fn(()=>q),select:vi.fn().mockResolvedValue({data:[{id:"test"}]})};mocks.db.mockReturnValue({from:()=>q});expect(await changeSnapshotVisibility(["test"],false)).toEqual(["test"]);expect(q.eq).toHaveBeenCalledWith("owner_hash",ownerHash("b".repeat(64)));expect(Object.keys(q.update.mock.calls[0][0])).toEqual(["deleted_at"]);await changeSnapshotVisibility(["test"],true);expect(q.update).toHaveBeenLastCalledWith({deleted_at:null});});
});
