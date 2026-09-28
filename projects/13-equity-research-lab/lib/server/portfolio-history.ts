import { database } from "./supabase";
import {parseAlphaHistory,type History} from "../portfolio/history";
export async function getPortfolioHistory(symbol:string):Promise<History>{
 const db=database();if(!db)throw new Error("Historical data requires the configured provider cache.");
 const cacheKey=`HISTORY:MONTHLY:${symbol}`;
 const {data:cached,error}=await db.from("equity_quote_cache").select("payload,fetched_at").eq("ticker",cacheKey).maybeSingle();
 if(error)throw new Error("Historical cache unavailable.");
 if(cached&&Date.now()-Date.parse(cached.fetched_at)<86400000)return cached.payload as History;
 const key=process.env.ALPHA_VANTAGE_API_KEY||process.env.ALPHAVANTAGE_API_KEY||process.env.ALPHA_VENTAGE_API_KEY;
 if(!key)throw new Error("Alpha Vantage is not configured.");
 const {data:allowed,error:budgetError}=await db.rpc("equity_claim_alpha_request");
 if(budgetError||allowed!==true)throw new Error("Historical request allowance reached. Your manual assumptions remain available; try after the daily reset.");
 const response=await fetch(`https://www.alphavantage.co/query?function=TIME_SERIES_MONTHLY_ADJUSTED&symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(key)}`,{cache:"no-store",signal:AbortSignal.timeout(20000)});
 if(!response.ok)throw new Error("Historical provider request failed.");
 const history=parseAlphaHistory(await response.json(),symbol);
 await db.from("equity_quote_cache").upsert({ticker:cacheKey,payload:history,fetched_at:new Date().toISOString()});
 return history;
}
