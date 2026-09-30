import {peerGroup,valuationRow,comparePeers,type PeerValuation} from '../peer-valuation';
import {SecProvider} from '../providers/sec';
import {FallbackMarketProvider} from '../providers/market';
import type {FundamentalsSnapshot,MarketSnapshot} from '../providers/types';
export async function peerResearch(ticker:string,f:FundamentalsSnapshot|null,m:MarketSnapshot|null,asOf:string):Promise<PeerValuation|undefined>{
 const group=peerGroup(ticker);if(!group)return undefined;
 // The fallback enforces its persistent daily budget and reuses cached quotes.
 const sec=new SecProvider(),market=new FallbackMarketProvider();
 const rows=[valuationRow(ticker,f,m,group.metric,asOf)];
 for(const symbol of group.symbols.filter(s=>s!==ticker).slice(0,3)){
  const [financial,quote]=await Promise.allSettled([sec.getFundamentals(symbol),market.getMarket(symbol)]);
  const row=valuationRow(symbol,financial.status==='fulfilled'?financial.value:null,quote.status==='fulfilled'?quote.value:null,group.metric,asOf);
  if(quote.status==='rejected'){
   const reason=String(quote.reason);
   row.exclusions.push(reason.includes('daily quote allowance')?'The fallback provider’s daily quote allowance is exhausted. Try after its next daily reset.':reason.includes('402')?'This symbol is outside the primary data plan and the fallback quote is unavailable.':reason.includes('timed out')?'The quote provider timed out. Rerun this report.':'The configured quote providers could not supply this symbol.');
  }
  if(financial.status==='rejected')row.exclusions.push('SEC financial data could not be retrieved for this peer.');
  rows.push(row);
 }
 return comparePeers(group,rows);
}
