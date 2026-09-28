/** Pure, UI-independent Market Monte Carlo. Annual arithmetic expected returns;
 * monthly GBM increments with log drift log(1+r)-vol²/2. Nominal USD, long only.
 * Fixed correlations and normally distributed log returns omit crisis regimes.
 */
export type Asset = { symbol: string; expectedReturn: number; volatility: number };
export type Strategy = { name: string; weights: number[]; rebalance: "monthly" | "annual" | "none" };
export type SimulationInput = { assets: Asset[]; correlation: number[][]; strategies: Strategy[]; initialValue: number; years: number; paths: number; seed: number; monthlyContribution?: number; goal?: number };
export type YearOutcome = { year: number; percentiles: number[] };
export type StrategyResult = { name: string; years: YearOutcome[]; lossProbability: number; goalProbability: number | null; expectedMaxDrawdown: number; drawdownProbabilities: number[]; worstFivePercentMean: number; endingValues: number[]; unfundedWithdrawalProbability: number };
export const PERCENTILES = [.05,.10,.25,.50,.75,.90,.95];
export function cholesky(matrix: number[][]): number[][] {
 const n=matrix.length;
 if (!n || matrix.some(r=>r.length!==n || r.some(v=>!Number.isFinite(v)))) throw new Error("Correlation matrix must be square.");
 const lower=Array.from({length:n},()=>Array(n).fill(0));
 for(let i=0;i<n;i++) for(let j=0;j<=i;j++) {
  const v=matrix[i][j];
  if(!Number.isFinite(v)||Math.abs(v)>1+1e-10||Math.abs(v-matrix[j][i])>1e-9||(i===j&&Math.abs(v-1)>1e-9)) throw new Error("Invalid correlation matrix.");
  let residual=v;for(let k=0;k<j;k++)residual-=lower[i][k]*lower[j][k];
  if(i===j){if(residual < -1e-8)throw new Error("Correlations must form a positive semidefinite matrix.");lower[i][j]=Math.sqrt(Math.max(0,residual));}
  else if(lower[j][j]>1e-10)lower[i][j]=residual/lower[j][j];
  else if(Math.abs(residual)>1e-8)throw new Error("Inconsistent singular correlations.");
 }
 return lower;
}
function random(seed:number){let state=seed>>>0;return()=>{state=(state+0x6D2B79F5)>>>0;let t=state;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
export function quantile(sorted:number[],p:number){const x=(sorted.length-1)*p,i=Math.floor(x);return sorted[i]+(sorted[Math.min(i+1,sorted.length-1)]-sorted[i])*(x-i);}
export function simulate(input:SimulationInput):StrategyResult[]{
 const {assets,strategies,years,paths,initialValue}=input,n=assets.length;
 if(n<1||n>20||strategies.length<1||strategies.length>4||!Number.isInteger(years)||years<1||years>30||!Number.isInteger(paths)||paths<1||paths>100000||!Number.isFinite(initialValue)||initialValue<=0||initialValue>1e12||!Number.isInteger(input.seed))throw new Error("Invalid simulation size or starting value.");
 if(assets.some(a=>!a.symbol||!Number.isFinite(a.expectedReturn)||a.expectedReturn<=-.95||a.expectedReturn>1||!Number.isFinite(a.volatility)||a.volatility<0||a.volatility>1.5))throw new Error("Returns must be above -95% and at most 100%; volatility must be 0–150%.");
 if(new Set(assets.map(a=>a.symbol)).size!==n)throw new Error("Combine duplicate assets before simulation.");
 const flow=input.monthlyContribution??0;
 if(!Number.isFinite(flow)||Math.abs(flow)>initialValue||input.goal!==undefined&&(!Number.isFinite(input.goal)||input.goal<=0))throw new Error("Invalid cash flow or goal.");
 if(input.correlation.length!==n)throw new Error("Correlation dimensions do not match assets.");
 const lower=cholesky(input.correlation);
 for(const s of strategies)if(!s.name||!["monthly","annual","none"].includes(s.rebalance)||s.weights.length!==n||s.weights.some(w=>!Number.isFinite(w)||w<0)||Math.abs(s.weights.reduce((a,b)=>a+b,0)-1)>1e-8)throw new Error("Long-only strategy weights must sum to 100%.");
 const rng=random(input.seed);const normal=()=>Math.sqrt(-2*Math.log(Math.max(rng(),1e-12)))*Math.cos(2*Math.PI*rng());
 const values=strategies.map(()=>Array.from({length:years+1},()=>new Array<number>(paths)));
 const stats=strategies.map(()=>({drawdown:0,breaches:[0,0,0],loss:0,goal:0,unfunded:0}));
 for(let p=0;p<paths;p++){
  const balances=strategies.map(s=>s.weights.map(w=>w*initialValue));
  const unit=strategies.map(()=>1),peak=strategies.map(()=>1),dd=strategies.map(()=>0),unfunded=strategies.map(()=>false),netFlow=strategies.map(()=>0);
  values.forEach(v=>v[0][p]=initialValue);
  for(let month=1;month<=years*12;month++){
   // Common shocks make strategy differences attributable to allocation, not different random samples.
   const z=assets.map(()=>normal());
   const growth=assets.map((a,i)=>Math.exp((Math.log1p(a.expectedReturn)-a.volatility*a.volatility/2)/12+a.volatility/Math.sqrt(12)*lower[i].reduce((s,v,j)=>s+v*z[j],0)));
   strategies.forEach((s,k)=>{
    const b=balances[k],before=b.reduce((a,v)=>a+v,0);for(let i=0;i<n;i++)b[i]*=growth[i];
    let total=b.reduce((a,v)=>a+v,0);
    if(!Number.isFinite(total))throw new Error("Assumptions produced numerical overflow; reduce horizon or volatility.");
    if(before>0){unit[k]*=total/before;peak[k]=Math.max(peak[k],unit[k]);dd[k]=Math.max(dd[k],1-unit[k]/peak[k]);}
    // Month-end contributions use target weights; withdrawals are proportional, capped at available wealth.
    const applied=Math.max(flow,-total);if(applied!==flow)unfunded[k]=true;netFlow[k]+=applied;
    for(let i=0;i<n;i++)b[i]+=applied>=0?applied*s.weights[i]:total>0?applied*b[i]/total:0;
    total=Math.max(0,total+applied);
    if(s.rebalance==="monthly"||s.rebalance==="annual"&&month%12===0)for(let i=0;i<n;i++)b[i]=total*s.weights[i];
    if(month%12===0)values[k][month/12][p]=total;
   });
  }
  strategies.forEach((_,k)=>{const st=stats[k],end=values[k][years][p];st.drawdown+=dd[k];[.2,.3,.4].forEach((threshold,i)=>{if(dd[k]>threshold)st.breaches[i]++;});if(end<initialValue+netFlow[k]-1e-6)st.loss++;if(input.goal!==undefined&&end>=input.goal)st.goal++;if(unfunded[k])st.unfunded++;});
 }
 return strategies.map((s,k)=>{
  const sorted=values[k].map(v=>v.sort((a,b)=>a-b)),end=sorted[years],count=Math.max(1,Math.floor(paths*.05)),st=stats[k];
  return {name:s.name,years:sorted.map((v,year)=>({year,percentiles:PERCENTILES.map(p=>quantile(v,p))})),endingValues:end,lossProbability:st.loss/paths,goalProbability:input.goal===undefined?null:st.goal/paths,expectedMaxDrawdown:st.drawdown/paths,drawdownProbabilities:st.breaches.map(v=>v/paths),worstFivePercentMean:end.slice(0,count).reduce((a,b)=>a+b,0)/count,unfundedWithdrawalProbability:st.unfunded/paths};
 });
}
