import {factorKeys} from './investment';
import type {ResearchRun} from './types';
export function assessDecisionEvidence(run:ResearchRun){
 const t=run.investmentCase,gaps:string[]=[],age=(d?:string)=>(Date.parse(run.analyzedAt)-Date.parse(d||''))/86400000;
 const fresh=(d:string|undefined,limit:number)=>Number.isFinite(age(d))&&age(d)>=0&&age(d)<=limit;
 const known=t?factorKeys.filter(k=>t.factors[k].rating!=='Unknown'):[];
 const sourced=known.filter(k=>t!.factors[k].sources.some(url=>run.citations.some(c=>c.url===url)));
 const recent=known.filter(k=>fresh(t!.factors[k].evidenceDate,k==='valuation'||k==='market'?120:190));
 const price=run.asOfPrice>0&&fresh(run.marketAsOf,7);
 const financial=!!run.annualFinancials&&fresh(run.annualFinancials.periodEnd,460)&&run.citations.some(c=>c.tier===1)&&run.annualFinancials.revenue!=null&&run.annualFinancials.operatingCashFlow!=null;
 const comparable=run.peerValuation?.status==='comparison available';
 const valuation=known.includes('valuation')&&t?.valuationBasis!=='Unavailable';
 let score=Math.round(sourced.length/6*40+recent.length/6*20+(price?10:0)+(financial?15:0)+(valuation?comparable?15:8:0));
 if(!price)gaps.push('A recent verified price is missing.');
 if(!financial)gaps.push('Recent primary annual revenue and operating cash flow are incomplete.');
 for(const k of factorKeys)if(!known.includes(k))gaps.push(`${k}: supporting evidence is incomplete.`);
 if(!comparable)gaps.push('Two comparable dated peer financial records are unavailable.');
 if(!valuation)score=Math.min(score,69);
 if(!known.includes('growth')||!known.includes('cash')||!price)score=Math.min(score,49);
 const label=score>=80?'Broad evidence coverage':score>=60?'Partial evidence coverage':'Limited evidence coverage';
 return {score,label,gaps,explanation:`Evidence coverage ${score}/100: linked factor evidence up to 40 points, recent factor evidence 20, verified price 10, primary annual financials 15, and supported valuation 15 (8 without a complete peer table). This measures completeness and freshness, not factual certainty, prediction accuracy or probability of profit. Missing valuation caps coverage at 69; missing price, growth or cash evidence caps it at 49.`};
}
