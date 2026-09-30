import {describe,it,expect} from 'vitest';
import {reserveUsage,UsageLimitError,type UsageStore} from '../lib/server/usage-budget';
function memory(initial:number|null=null){
 let value=initial;
 const store:UsageStore={read:async()=>value,insert:async(_p,_d,next)=>{if(value!==null)return false;value=next;return true;},compareAndSet:async(_p,_d,old,next)=>{if(value!==old)return false;value=next;return true;}};
 return {store,value:()=>value};
}
describe('atomic paid-call reservation',()=>{
 it('twenty simultaneous requests cannot spend more than a five-call cap',async()=>{
  const m=memory();const results=await Promise.allSettled(Array.from({length:20},()=>reserveUsage(m.store,'research','2026-09-30',5)));
  expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(5);expect(m.value()).toBe(5);
 });
 it('failed downstream work retains its slot, and the existing snapshot floor is honored',async()=>{
  const m=memory();await reserveUsage(m.store,'research','2026-09-30',5,4);
  await expect(reserveUsage(m.store,'research','2026-09-30',5,4)).rejects.toBeInstanceOf(UsageLimitError);
  expect(m.value()).toBe(5);
 });
 it('fails closed without a readable ledger and when the cap is zero',async()=>{
  const m=memory();await expect(reserveUsage(m.store,'quick_check','2026-09-30',0)).rejects.toBeInstanceOf(UsageLimitError);
  const broken={...m.store,read:async()=>{throw Error('offline');}};
  await expect(reserveUsage(broken,'research','2026-09-30',5)).rejects.toThrow('offline');expect(m.value()).toBeNull();
 });
});
