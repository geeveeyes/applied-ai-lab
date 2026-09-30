export type History = { symbol: string; /** close = split/dividend-adjusted; raw = actual close that month (for point-in-time valuation). */ prices: {date:string; close:number; raw?:number}[]; source:string; retrievedAt:string; adjusted:true };
export type Estimate = { symbol:string; cagr:number; arithmeticAnnual:number; volatility:number };
export type HistoryEstimate = { start:string; end:string; observations:number; years:number; assets:Estimate[]; correlation:number[][]; sources:{symbol:string;source:string;retrievedAt:string}[]; warning:string };
export function parseAlphaHistory(body:unknown,symbol:string,now=new Date()):History {
 const root=body as Record<string,any>;
 const notice=String(root?.Information||root?.Note||root?.["Error Message"]||"");
 // Classify provider notices without exposing raw text, which can contain the API key.
 if(notice){
  if(/premium|subscription|entitlement/i.test(notice))throw new Error("Alpha Vantage requires a different plan for adjusted monthly history. Manual assumptions remain available.");
  if(/rate limit|call frequency|requests per|calls per|higher.*limit/i.test(notice))throw new Error("Alpha Vantage request limit reached. Try after the provider limit resets; manual assumptions remain available.");
  if(/apikey|api key/i.test(notice))throw new Error("Alpha Vantage rejected the configured API key. Check the deployment's provider configuration.");
  if(root?.["Error Message"])throw new Error("Alpha Vantage could not supply adjusted history for this symbol.");
  throw new Error("Alpha Vantage did not return adjusted monthly history. Check the provider's access and request allowance; manual assumptions remain available.");
 }
 const meta=root?.["Meta Data"];
 if(meta?.["2. Symbol"]?.toUpperCase()!==symbol)throw new Error("Historical response symbol did not match.");
 const series=root?.["Monthly Adjusted Time Series"];
 if(!series||typeof series!=="object")throw new Error("No adjusted monthly history returned.");
 const prices=Object.entries(series).map(([date,row])=>{const r=row as Record<string,string>,raw=Number(r["4. close"]);return {date,close:Number(r["5. adjusted close"]),...(Number.isFinite(raw)&&raw>0?{raw}:{})};});
 if(prices.some(p=>!/^\d{4}-\d{2}-\d{2}$/.test(p.date)||!Number.isFinite(Date.parse(p.date))||new Date(p.date).toISOString().slice(0,10)!==p.date||!Number.isFinite(p.close)||p.close<=0))throw new Error("Invalid historical price or date.");
 return {symbol,prices:prices.filter(p=>p.date.slice(0,7)<now.toISOString().slice(0,7)).sort((a,b)=>a.date.localeCompare(b.date)),source:"https://www.alphavantage.co/documentation/#monthlyadj",retrievedAt:now.toISOString(),adjusted:true};
}
function monthIndex(month:string){return Number(month.slice(0,4))*12+Number(month.slice(5,7))-1;}
export function estimateHistory(histories:History[],symbols:string[],years:number,now=new Date()):HistoryEstimate {
 if(![1,3,5,10].includes(years))throw new Error("Choose 1, 3, 5 or 10 years of history.");
 const risky=symbols.filter(s=>s!=="CASH");
 if(!risky.length)throw new Error("Cash needs no historical correlation estimate.");
 const maps=risky.map(symbol=>{
  const h=histories.find(x=>x.symbol===symbol);if(!h)throw new Error(`Missing adjusted history for ${symbol}.`);
  const m=new Map<string,number>();
  for(const p of h.prices){const month=p.date.slice(0,7);if(month>=now.toISOString().slice(0,7))continue;if(m.has(month))throw new Error(`Duplicate month in ${symbol} history.`);if(!Number.isFinite(p.close)||p.close<=0)throw new Error("Invalid adjusted price.");m.set(month,p.close);}
  return m;
 });
 const months=[...maps[0].keys()].filter(m=>maps.every(map=>map.has(m))).sort().slice(-(years*12+1));
 if(months.length!==years*12+1)throw new Error(`Need ${years*12+1} common month-end prices for the selected window. Choose a shorter window or provide more history.`);
 for(let i=1;i<months.length;i++)if(monthIndex(months[i])-monthIndex(months[i-1])!==1)throw new Error("Historical months have gaps; correlations require consecutive aligned months.");
 if(monthIndex(now.toISOString().slice(0,7))-monthIndex(months.at(-1)!)>2)throw new Error("Common history is stale by more than one completed month.");
 const returns=maps.map(map=>months.slice(1).map((m,i)=>Math.log(map.get(m)!/map.get(months[i])!)));
 const means=returns.map(r=>r.reduce((a,b)=>a+b,0)/r.length),n=months.length-1;
 const covariance=returns.map((a,i)=>returns.map((b,j)=>a.reduce((s,v,k)=>s+(v-means[i])*(b[k]-means[j]),0)/(n-1)));
 const assets=symbols.map(symbol=>{const i=risky.indexOf(symbol);return i<0?{symbol,cagr:0,arithmeticAnnual:0,volatility:0}:{symbol,cagr:Math.expm1(means[i]*12),arithmeticAnnual:returns[i].reduce((a,v)=>a+Math.expm1(v),0)/n*12,volatility:Math.sqrt(covariance[i][i]*12)};});
 const correlation=symbols.map((s,i)=>symbols.map((t,j)=>{if(i===j)return 1;const a=risky.indexOf(s),b=risky.indexOf(t);if(a<0||b<0)return 0;const denom=Math.sqrt(covariance[a][a]*covariance[b][b]);return denom<1e-14?0:Math.max(-1,Math.min(1,covariance[a][b]/denom));}));
 return {start:months[0],end:months.at(-1)!,observations:n,years,assets,correlation,sources:histories.map(h=>({symbol:h.symbol,source:h.source,retrievedAt:h.retrievedAt})),warning:"Monthly adjusted closes; incomplete current month excluded. Historical estimates are uncertain, especially with only 12 observations. Returns are context, not forward forecasts. Monthly sampling misses intramonth crashes; correlations can change in crises."};
}
