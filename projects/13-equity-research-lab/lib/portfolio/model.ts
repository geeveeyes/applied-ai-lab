import {z} from "zod";
import {simulate,type SimulationInput,type StrategyResult} from "./engine";
import type {HistoryEstimate} from "./history";
export const MODEL_VERSION="market-mc-1.0.0";
const symbol=z.string().regex(/^[A-Z][A-Z.\-]{0,9}$/);
export const inputSchema=z.object({
 assets:z.array(z.object({symbol,expectedReturn:z.number().finite().gt(-.95).max(1),volatility:z.number().finite().min(0).max(1.5)})).min(1).max(8),
 correlation:z.array(z.array(z.number().finite().min(-1).max(1)).max(8)).max(8),
 strategies:z.array(z.object({name:z.string().trim().min(1).max(70),weights:z.array(z.number().finite().min(0).max(1)).max(8),rebalance:z.enum(["monthly","annual","none"])})).min(2).max(2),
 initialValue:z.number().finite().positive().max(1e10),years:z.union([z.literal(5),z.literal(10),z.literal(20)]),paths:z.literal(10000),seed:z.number().int().min(0).max(4294967295),monthlyContribution:z.number().finite().optional(),goal:z.number().finite().positive().max(1e12).optional(),
});
const estimateSchema=z.object({start:z.string().max(10),end:z.string().max(10),observations:z.number().int().min(12).max(120),years:z.number().int(),assets:z.array(z.object({symbol,cagr:z.number().finite(),arithmeticAnnual:z.number().finite(),volatility:z.number().finite()})).max(8),correlation:z.array(z.array(z.number().finite()).max(8)).max(8),sources:z.array(z.object({symbol,source:z.string().url().startsWith("https://"),retrievedAt:z.string().datetime()})).max(8),warning:z.string().max(1200)});
export const requestSchema=z.object({input:inputSchema,assumptions:z.object({returnSource:z.string().trim().min(5).max(1200),riskSource:z.string().trim().min(5).max(1200),history:estimateSchema.optional(),acknowledged:z.literal(true)})});
export type PortfolioRequest=z.infer<typeof requestSchema>;
export type SummaryResult=Omit<StrategyResult,"endingValues"> & {histogram:{from:number;to:number;count:number}[];hhi:number;largestAssetWeight:number;annualVolatility:number};
export type PortfolioSnapshot={id:string;createdAt:string;modelVersion:string;request:PortfolioRequest;results:SummaryResult[];storage:"cloud"|"browser"|"unavailable"};
export function summarize(input:SimulationInput,results:StrategyResult[]):SummaryResult[]{
 return results.map((result,k)=>{
  const end=result.endingValues,min=end[0],max=end.at(-1)!,width=(max-min)/30||1;
  const histogram=Array.from({length:30},(_,i)=>({from:min+i*width,to:min+(i+1)*width,count:0}));
  end.forEach(v=>histogram[Math.min(29,Math.floor((v-min)/width))].count++);
  const weights=input.strategies[k].weights;
  const variance=weights.reduce((s,w,i)=>s+weights.reduce((s2,v,j)=>s2+w*v*input.assets[i].volatility*input.assets[j].volatility*input.correlation[i][j],0),0);
  const {endingValues:_,...rest}=result;
  return {...rest,histogram,hhi:weights.reduce((s,w)=>s+w*w,0),largestAssetWeight:Math.max(...weights),annualVolatility:Math.sqrt(Math.max(0,variance))};
 });
}
export function runPortfolio(request:PortfolioRequest):PortfolioSnapshot{
 const parsed=requestSchema.parse(request);
 for(const a of parsed.input.assets)if(a.symbol==="CASH"&&a.volatility!==0)throw new Error("Cash volatility must be zero in this model.");
 return {id:crypto.randomUUID(),createdAt:new Date().toISOString(),modelVersion:MODEL_VERSION,request:parsed,results:summarize(parsed.input,simulate(parsed.input)),storage:"browser"};
}
