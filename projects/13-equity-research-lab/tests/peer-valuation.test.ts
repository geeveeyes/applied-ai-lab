import {expect,it} from 'vitest';
import {valuationRow,comparePeers,peerGroup} from '../lib/peer-valuation';
import {assessDecisionEvidence} from '../lib/decision-evidence';
import {factorKeys, type InvestmentCase} from '../lib/investment';
import {demoResearch} from '../lib/mock-data';
const c={title:'SEC financials',url:'https://www.sec.gov/test',source:'SEC',tier:1 as const,retrievedAt:'2026-09-30'};
const f={netIncome:100,annualDilutedEps:5,stockholdersEquity:500,balanceSheetDate:'2026-06-30',latestAnnualPeriodEnd:'2025-12-31',latestAnnualFiledAt:'2026-02-01',citations:[c]};
const m={price:100,marketCap:2000,timestamp:'2026-09-29',citations:[{...c,url:'https://example.com/price',tier:3 as const}]};
it('uses reported diluted EPS when market cap is absent and uses book for banks',()=>{expect(valuationRow('V',f,{...m,marketCap:undefined},'earnings','2026-09-30')).toMatchObject({multiple:20,eligible:true});expect(valuationRow('JPM',f,m,'book','2026-09-30').multiple).toBe(4);});
it('withholds unusable denominators and stale quotes',()=>{expect(valuationRow('V',{...f,annualDilutedEps:-2},m,'earnings','2026-09-30').eligible).toBe(false);expect(valuationRow('V',f,{...m,timestamp:'2026-08-01'},'earnings','2026-09-30').multiple).toBeUndefined();});
it('requires two peers with aligned financial periods rather than mixing fiscal years',()=>{const g=peerGroup('V')!,s=valuationRow('V',f,m,'earnings','2026-09-30'),a=valuationRow('MA',f,{...m,price:150},'earnings','2026-09-30'),b=valuationRow('AXP',f,{...m,price:125},'earnings','2026-09-30');const r=comparePeers(g,[s,a,b]);expect(r.peerMedian).toBe(27.5);expect(r.relativeDiscount).toBeCloseTo(1-20/27.5);expect(comparePeers(g,[s,a,{...b,periodEnd:'2024-12-31'}]).status).toBe('incomplete');});
it('separates complete evidence from directional attractiveness and cannot score missing valuation as high coverage',()=>{
 const thesis:InvestmentCase={valuationBasis:'Peer comparison',valuationBenchmark:'Dated peer table',factors:Object.fromEntries(factorKeys.map(k=>[k,{rating:'Mixed',reason:'Evidence',evidenceDate:'2026-09-01',sources:[c.url]}])) as InvestmentCase['factors'],growthOutlook:'',strongestCounterargument:'',timing:'',changeMind:''};
 const rows=['V','MA','AXP'].map(s=>valuationRow(s,f,m,'earnings','2026-09-30'));
 const run={...demoResearch('V'),dataMode:'live' as const,analyzedAt:'2026-09-30',marketAsOf:'2026-09-29',investmentCase:thesis,citations:[c],annualFinancials:{periodEnd:'2025-12-31',revenue:100,operatingCashFlow:20},peerValuation:comparePeers(peerGroup('V')!,rows)};
 expect(assessDecisionEvidence(run).score).toBe(100);
 thesis.factors.valuation.rating='Unknown';expect(assessDecisionEvidence(run).score).toBeLessThanOrEqual(69);
});
