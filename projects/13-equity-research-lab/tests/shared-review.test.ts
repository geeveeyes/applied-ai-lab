import { describe, it, expect } from 'vitest';
import { intrinsicValuation, presentValue } from '../lib/intrinsic-valuation';
import { buildQuickCheck, zoneFor } from '../lib/quick-check';
import { adviseHoldings } from '../lib/position-advice';
import { importBrokerCsv } from '../lib/broker-import';
import type { ResearchRun } from '../lib/types';
const now=new Date('2026-09-30T12:00:00Z');
const f={revenue:50e9,operatingCashFlow:10e9,capitalExpenditures:2e9,freeCashFlow:8e9,netIncome:7e9,cash:5e9,debt:3e9,latestAnnualPeriodEnd:'2025-12-31',citations:[]};
const m={price:30,marketCap:30e9,timestamp:'2026-09-30',citations:[]};
const a={calls:[],estimates:[{date:'2027-12-31',revenueAvg:60.5e9}],citations:[],unavailable:[]};
const h={version:1 as const,scope:'test',asOf:'2026-09-30',coverage:'complete' as const,totalValue:100000,cashAvailable:99000,positions:[{symbol:'TEST',shares:10,price:100,kind:'stock' as const}]};
describe('shared tool decision regressions',()=>{
 it('15% margin of safety means price is no more than 85% of value',()=>{
  const v=intrinsicValuation({...f,...m,annualPeriodEnd:f.latestAnnualPeriodEnd,estimates:a.estimates});
  if(!v.available)throw Error(v.note);
  expect(zoneFor({...v,perShare:{bear:80,base:100,bull:120}},86)).not.toBe('Buy zone');
  expect(zoneFor({...v,perShare:{bear:80,base:100,bull:120}},85)).toBe('Buy zone');
 });
 it('equity cash flows are not reduced by subtracting debt a second time',()=>{
  const v=intrinsicValuation({...f,...m,annualPeriodEnd:f.latestAnnualPeriodEnd,estimates:a.estimates});
  if(!v.available)throw Error(v.note);
  expect(v.perShare.base).toBeCloseTo(presentValue(f.freeCashFlow,v.growth,.09)/v.shares,2);
 });
 it('stale, missing and future quotes cannot produce a buy zone',()=>{
  for(const timestamp of ['2026-08-01',undefined,'2026-10-01'])expect(buildQuickCheck('TEST',f,{...m,timestamp},a,now).zone).toBe('Not valued');
 });
 it('missing forecasts, missing balance sheet and earnings proxies do not become buy signals',()=>{
  expect(buildQuickCheck('TEST',f,m,null,now).zone).toBe('Not valued');
  expect(buildQuickCheck('TEST',{...f,debt:undefined},m,a,now).zone).toBe('Not valued');
  expect(buildQuickCheck('TEST',{...f,capitalExpenditures:12e9,freeCashFlow:-2e9},m,a,now).zone).toBe('Not valued');
 });
 it('old quick checks cannot drive an add decision',()=>{
  const q=buildQuickCheck('TEST',f,m,a,now);
  expect(adviseHoldings(h,{TEST:{...q,priceDate:'2026-08-01',checkedAt:'2026-08-01'}},[],undefined,now)[0].action).toBe('Check value first');
 });
 it('a full hold report takes priority over a cheap quick check',()=>{
  const q=buildQuickCheck('TEST',f,m,a,now);
  const factor={rating:'Mixed' as const,reason:'mixed',sources:['https://example.org'],evidenceDate:'2026-09-29'};
  const r={ticker:'TEST',dataMode:'live',analyzedAt:now.toISOString(),marketAsOf:m.timestamp,asOfPrice:30,investmentCase:{valuationBasis:'Peer comparison',valuationBenchmark:'dated peers',factors:{growth:factor,cash:factor,valuation:factor,competition:factor,execution:factor,market:factor},timing:'wait'}} as ResearchRun;
  expect(adviseHoldings(h,{TEST:q},[r],undefined,now)[0].action).toBe('Hold');
 });
 it('skipped broker securities make portfolio coverage partial',()=>{
  const r=importBrokerCsv('Symbol,Quantity,Price,Market Value\nAMZN,10,100,1000\nAMZN 261016C200,1,10,1000','2026-09-30');
  expect(r.skipped.length).toBe(1);expect(r.holdings.coverage).toBe('partial');
 });
});
