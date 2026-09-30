import type {Citation} from './types';
import type {FundamentalsSnapshot,MarketSnapshot} from './providers/types';
export type PeerGroup={sector:string;symbols:string[];metric:'earnings'|'book';caveat:string};
const groups:PeerGroup[]=[
 {sector:'Semiconductors',symbols:['NVDA','AMD','AVGO','QCOM'],metric:'earnings',caveat:'AI mix, chip cycles and acquisition amortization differ; a lower multiple alone is not a bargain.'},
 {sector:'Software platforms',symbols:['MSFT','ORCL','ADBE','CRM'],metric:'earnings',caveat:'Cloud infrastructure spending, software mix and stock compensation differ.'},
 {sector:'Digital platforms',symbols:['GOOGL','META','AMZN'],metric:'earnings',caveat:'Retail, advertising and cloud mixes differ materially. Investment revaluation gains can distort reported earnings; normalize or withhold the valuation rating.'},
 {sector:'Payments',symbols:['V','MA','AXP'],metric:'earnings',caveat:'Visa and Mastercard are networks; American Express also lends. Credit exposure and litigation provisions limit comparability.'},
 {sector:'Banks',symbols:['JPM','BAC','WFC','C'],metric:'book',caveat:'Use price/book alongside profitability, regulatory capital and credit losses. Book value is not tangible book value; do not use corporate free cash flow for banks.'},
 {sector:'Pharmaceuticals',symbols:['ABBV','MRK','JNJ','PFE'],metric:'earnings',caveat:'Patent expirations, acquired R&D and amortization differ substantially. Check recurring earnings and pipelines before assigning value.'},
 {sector:'Exploration and production',symbols:['COP','EOG','DVN'],metric:'earnings',caveat:'Commodity prices can inflate peak earnings. Evaluate mid-cycle oil/gas assumptions; low reported P/E alone is insufficient.'},
 {sector:'Integrated energy',symbols:['XOM','CVX'],metric:'earnings',caveat:'Upstream/refining mix and commodity prices differ. Normalize the cycle before assigning value.'},
 {sector:'Railroads',symbols:['UNP','CSX','NSC'],metric:'earnings',caveat:'Volumes, network mix, merger costs and regulation differ.'},
 {sector:'Aerospace and defense',symbols:['GD','LMT','NOC','RTX'],metric:'earnings',caveat:'Commercial aerospace exposure, contract charges and pension accounting differ. Check cash conversion and backlog quality.'},
 {sector:'Household products',symbols:['PG','CL','KMB'],metric:'earnings',caveat:'Category mix, currency, organic volume and restructuring charges differ.'},
 {sector:'Packaged foods',symbols:['MDLZ','PEP','GIS','HSY'],metric:'earnings',caveat:'Cocoa exposure, beverages, pricing and volume trends differ. Normalize commodity costs and one-time gains.'},
 {sector:'Industrial gases',symbols:['LIN','APD'],metric:'earnings',caveat:'Major-project risk and capital spending differ.'},
];
/** Configured sectors and their example companies (used for diversification ideas). */
export function sectorGroups():readonly PeerGroup[]{return groups;}
export function peerGroup(ticker:string){return groups.find(g=>g.symbols.includes(ticker));}
export type ValuationRow={symbol:string;price?:number;priceDate?:string;marketCap?:number;periodEnd?:string;filedAt?:string;netIncome?:number;annualDilutedEps?:number;calculation?:string;freeCashFlow?:number;bookValue?:number;bookDate?:string;multiple?:number;metric:string;eligible:boolean;exclusions:string[];sources:Citation[]};
export type PeerValuation={sector:string;metric:string;caveat:string;rows:ValuationRow[];peerMedian?:number;relativeDiscount?:number;status:'comparison available'|'incomplete';note:string};
export function valuationRow(symbol:string,f:FundamentalsSnapshot|null,m:MarketSnapshot|null,metric:'earnings'|'book',asOf:string):ValuationRow{
 const exclusions:string[]=[],age=(d?:string)=>(Date.parse(asOf)-Date.parse(d||''))/86400000;
 const epsBasis=metric==='earnings'&&f?.annualDilutedEps!=null;
 if(!m?.price||!Number.isFinite(m.price)||m.price<=0||!Number.isFinite(age(m.timestamp))||age(m.timestamp)<0||age(m.timestamp)>7)exclusions.push('A verified positive share price from the last seven days is required.');
 if(!epsBasis&&(!m?.marketCap||!Number.isFinite(m.marketCap)||m.marketCap<=0))exclusions.push('Verified market capitalization is required for this calculation.');
 const denominator=metric==='book'?f?.stockholdersEquity:epsBasis?f?.annualDilutedEps:f?.netIncome,date=metric==='book'?f?.balanceSheetDate:f?.latestAnnualPeriodEnd;
 if(!denominator||!Number.isFinite(denominator)||denominator<=0)exclusions.push(`Positive reported ${metric==='book'?'equity':epsBasis?'annual diluted EPS':'annual net income'} unavailable.`);
 if(!Number.isFinite(age(date))||age(date)<0||age(date)>(metric==='book'?190:460))exclusions.push('Financial period missing or stale.');
 if(!f?.citations.some(c=>c.tier===1))exclusions.push('Primary financial source missing.');
 const eligible=exclusions.length===0;
 return {symbol,price:m?.price,priceDate:m?.timestamp,marketCap:m?.marketCap,periodEnd:f?.latestAnnualPeriodEnd,filedAt:f?.latestAnnualFiledAt,netIncome:f?.netIncome,annualDilutedEps:f?.annualDilutedEps,calculation:epsBasis?'Quote / annual diluted EPS':'Market cap / reported financial denominator',freeCashFlow:f?.freeCashFlow,bookValue:f?.stockholdersEquity,bookDate:f?.balanceSheetDate,multiple:eligible?(epsBasis?m!.price!:m!.marketCap!)/denominator!:undefined,metric:metric==='book'?'Price / reported book':'Price / reported fiscal-year earnings',eligible,exclusions,sources:[...(f?.citations??[]),...(m?.citations??[])]};
}
export function comparePeers(group:PeerGroup,rows:ValuationRow[]):PeerValuation{
 const subject=rows[0],peers=rows.slice(1).filter(r=>r.eligible&&subject.eligible&&Math.abs(Date.parse(r.priceDate!)-Date.parse(subject.priceDate!))<=4*86400000&&Math.abs(Date.parse((group.metric==='book'?r.bookDate:r.periodEnd)!)-Date.parse((group.metric==='book'?subject.bookDate:subject.periodEnd)!))<=100*86400000);
 const values=peers.map(r=>r.multiple!).sort((a,b)=>a-b),mid=values.length/2;
 const median=values.length>=2?(values[Math.floor(mid)]+values[Math.ceil(mid)-1])/2:undefined;
 return {sector:group.sector,metric:subject.metric,caveat:group.caveat,rows,peerMedian:median,relativeDiscount:median&&subject.multiple?1-subject.multiple/median:undefined,status:median?'comparison available':'incomplete',note:'Calculated from linked provider prices and SEC financial amounts. Fiscal-year earnings are historical GAAP figures, not forward or normalized earnings. At least two dated peers with financial period ends within 100 days and quote dates within four days are required for a median. Relative discount is not fair-value upside. EPS is as reported in the latest filing; check intervening splits and share-class comparability. The research must assess accounting distortions, growth and business differences before rating valuation.'};
}
