import type {ResearchRun} from './types';
import {singleInvestmentDecision} from './investment';
export const screenUniverse=[{symbol:'V',sector:'Financials'},{symbol:'JPM',sector:'Financials'},{symbol:'ABBV',sector:'Healthcare'},{symbol:'MRK',sector:'Healthcare'},{symbol:'COP',sector:'Energy'},{symbol:'XOM',sector:'Energy'},{symbol:'GD',sector:'Industrials'},{symbol:'UNP',sector:'Industrials'},{symbol:'MDLZ',sector:'Consumer staples'},{symbol:'PG',sector:'Consumer staples'}];
export function rankOpportunities(runs:ResearchRun[]){
 const latest=new Map<string,ResearchRun>();for(const r of runs)if(!latest.has(r.ticker)||r.analyzedAt>latest.get(r.ticker)!.analyzedAt)latest.set(r.ticker,r);
 return [...latest.values()].map(run=>({run,decision:singleInvestmentDecision(run),sector:screenUniverse.find(x=>x.symbol===run.ticker)?.sector??'Other / unclassified'})).sort((a,b)=>(b.decision.score??-1)-(a.decision.score??-1));
}
