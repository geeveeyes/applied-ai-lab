import type {SummaryResult} from "@/lib/portfolio/model";
export const wealth=(v:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",notation:"compact",maximumFractionDigits:2}).format(v);
export function FanChart({result,maxValue}:{result:SummaryResult;maxValue?:number}){
 const rows=result.years,w=640,h=300,left=70,right=15,top=15,bottom=40,max=maxValue??Math.max(1,...rows.map(r=>r.percentiles[6]));
 const x=(year:number)=>left+year/(rows.length-1)*(w-left-right),y=(v:number)=>h-bottom-v/max*(h-top-bottom);
 const band=(lo:number,hi:number)=>rows.map(r=>`${x(r.year)},${y(r.percentiles[hi])}`).concat([...rows].reverse().map(r=>`${x(r.year)},${y(r.percentiles[lo])}`)).join(" ");
 return <figure className="portfolio-chart"><figcaption>{result.name} · future wealth ranges</figcaption><svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`${result.name} simulated wealth fan chart. Percentile values are available in the table below.`}>
 {[0,.25,.5,.75,1].map(t=><g key={t}><line x1={left} x2={w-right} y1={y(max*t)} y2={y(max*t)} stroke="#35515d"/><text x={left-7} y={y(max*t)+4} textAnchor="end" fill="#bdd1d9" fontSize="12">{wealth(max*t)}</text></g>)}
 <polygon points={band(0,6)} fill="#32536d"/><polygon points={band(1,5)} fill="#337b88"/><polygon points={band(2,4)} fill="#449c8a"/>
 <polyline points={rows.map(r=>`${x(r.year)},${y(r.percentiles[3])}`).join(" ")} fill="none" stroke="#d8ffe9" strokeWidth="3"/>
 {[0,Math.floor((rows.length-1)/2),rows.length-1].map(year=><text key={year} x={x(year)} y={h-18} textAnchor={year===rows.length-1?"end":year===0?"start":"middle"} fill="#bdd1d9" fontSize="12">Year {year}</text>)}
 </svg><p className="muted">Outer to inner bands: 5–95%, 10–90%, 25–75%. Light line: median. Pointwise ranges, not paths that stay within each band.</p></figure>;
}
export function Histogram({result}:{result:SummaryResult}){
 const bins=result.histogram,max=Math.max(1,...bins.map(b=>b.count)),w=640,h=220;
 return <figure className="portfolio-chart"><figcaption>{result.name} · ending wealth distribution</figcaption><svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`Histogram of ending wealth for ${result.name}. Horizontal axis wealth, vertical axis frequency.`}>
 {bins.map((b,i)=><rect key={i} x={55+i*18} y={170-b.count/max*145} width="16" height={b.count/max*145} fill="#55b9a0"><title>{wealth(b.from)}–{wealth(b.to)}: {b.count} paths</title></rect>)}
 <text x="50" y="190" fill="#bdd1d9" fontSize="12">{wealth(bins[0].from)}</text><text x="595" y="190" textAnchor="end" fill="#bdd1d9" fontSize="12">{wealth(bins.at(-1)!.to)}</text><text x="45" y="26" textAnchor="end" fill="#bdd1d9" fontSize="12">{max}</text><text x="320" y="214" textAnchor="middle" fill="#bdd1d9" fontSize="12">Ending wealth · full simulated range</text>
 </svg><p className="muted">Rare large outcomes can stretch the horizontal scale. Hover over a bar for its count.</p></figure>;
}
