import { z } from 'zod';
export const HOLDINGS_KEY = 'equity-private-holdings-v1';
const money = z.number().finite().min(0).max(1e12);
export const holdingsSchema = z.object({
  version: z.literal(1), scope: z.string().trim().min(1).max(200),
  asOf: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => !isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0,10)===v, 'Use a valid date'),
  coverage: z.enum(['partial','complete']), totalValue: money.positive(), cashAvailable: money,
  positions: z.array(z.object({symbol: z.string().regex(/^[A-Z][A-Z.\-]{0,9}$/), shares: money, price: money.positive(), averageCost: money.optional(), kind: z.enum(['stock','fund']).default('stock')})).max(500),
}).superRefine((s,c) => {
  if (new Set(s.positions.map(p=>p.symbol)).size!==s.positions.length) c.addIssue({code:'custom',message:'Combine duplicate symbols first.'});
  if (s.cashAvailable+s.positions.reduce((v,p)=>v+p.shares*p.price,0)>s.totalValue+1) c.addIssue({code:'custom',message:'Positions plus available cash exceed the stated portfolio total.'});
  if(s.asOf>new Date().toISOString().slice(0,10)) c.addIssue({code:'custom',message:'Holdings date cannot be in the future.'});
});
export type Holdings = z.infer<typeof holdingsSchema>;
export function readHoldings(): Holdings | null {
  const raw=localStorage.getItem(HOLDINGS_KEY); return raw ? holdingsSchema.parse(JSON.parse(raw)) : null;
}
export function adjustHolding(snapshot:Holdings,symbol:string,amount:number,funding:'cash'|'external') {
  const s=holdingsSchema.parse(snapshot),p=s.positions.find(p=>p.symbol===symbol);
  if(!p) throw new Error('Enter shares (including an explicit zero) and a dated price for this symbol first.');
  if(!Number.isFinite(amount))throw new Error('Enter a valid amount.');
  const before=p.shares*p.price;
  if(amount < -before-1e-8) throw new Error('The trim exceeds the recorded position.');
  if(amount>0&&funding==='cash'&&amount>s.cashAvailable)throw new Error('The add exceeds your recorded available cash.');
  const total=s.totalValue+(amount>0&&funding==='external'?amount:0),after=Math.max(0,before+amount);
  return {before,after,sharesBefore:p.shares,sharesAfter:after/p.price,shareChange:amount/p.price,weightBefore:before/s.totalValue,weightAfter:after/total,totalAfter:total,cashAfter:s.cashAvailable+(funding==='cash'||amount<0?-amount:0)};
}
export const dollars=(n:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n);
export const percent=(n:number)=>(100*n).toFixed(1)+'%';
