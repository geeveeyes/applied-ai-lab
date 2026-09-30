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
  rows.push(valuationRow(symbol,financial.status==='fulfilled'?financial.value:null,quote.status==='fulfilled'?quote.value:null,group.metric,asOf));
 }
 return comparePeers(group,rows);
}
