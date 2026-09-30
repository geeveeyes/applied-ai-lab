import {z} from 'zod';
import {simulate,type SimulationInput} from './engine';
import {summarize} from './model';
export const amznSchema=z.object({
 scope:z.string().trim().min(1).max(200),asOf:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v=>!isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v&&v<=new Date().toISOString().slice(0,10),'Use a valid past or current date'),
 total:z.number().finite().positive().max(1e10),amzn:z.number().finite().positive(),basis:z.number().finite().min(0),sale:z.number().finite().positive(),tax:z.number().min(0).max(.6),years:z.union([z.literal(5),z.literal(10),z.literal(20)]),
 amznReturn:z.number().gt(-.95).max(1),amznVol:z.number().min(0).max(1.5),otherReturn:z.number().gt(-.95).max(1),otherVol:z.number().min(0).max(1.5),correlation:z.number().min(-1).max(1),
}).refine(s=>s.amzn<=s.total&&s.sale<=s.amzn,'AMZN cannot exceed the total; sale cannot exceed AMZN.');
export type AmznInput=z.infer<typeof amznSchema>;
export function compareAmzn(raw:AmznInput,paths=10000){
 const s=amznSchema.parse(raw),weights=[s.amzn/s.total,1-s.amzn/s.total];
 const sale=(month:number,fraction:number)=>({month,from:0,to:1,initialAmount:s.sale*fraction,basis:s.basis*s.sale/s.amzn*fraction,taxRate:s.tax});
 const input:SimulationInput={assets:[{symbol:'AMZN',expectedReturn:s.amznReturn,volatility:s.amznVol},{symbol:'OTHER',expectedReturn:s.otherReturn,volatility:s.otherVol}],correlation:[[1,s.correlation],[s.correlation,1]],initialValue:s.total,years:s.years,paths,seed:42971,strategies:[
 {name:'Keep AMZN',weights,rebalance:'none'},
 {name:'Reduce now',weights,rebalance:'none',transfers:[sale(0,1)]},
 {name:'Reduce in four stages',weights,rebalance:'none',transfers:[0,3,6,9].map(m=>sale(m,.25))},
 ]};
 return {input,results:summarize(input,simulate(input))};
}
