import {NextRequest,NextResponse} from "next/server";
import {getPortfolioHistory} from "@/lib/server/portfolio-history";
import {estimateHistory} from "@/lib/portfolio/history";
import {sameOrigin} from "@/lib/server/request-security";
export const maxDuration=180;
export async function POST(request:NextRequest){
 if(!sameOrigin(request))return NextResponse.json({error:"Request origin not allowed."},{status:403});
 try{
  const body=await request.json();const symbols=body.symbols;
  if(!Array.isArray(symbols)||!symbols.length||symbols.length>8||symbols.some(s=>typeof s!=="string"||!/^[A-Z][A-Z.\-]{0,9}$/.test(s))||new Set(symbols).size!==symbols.length||![1,3,5,10].includes(body.years))throw new Error("Use up to eight unique symbols and a 1, 3, 5 or 10-year window.");
  const history=[];for(const symbol of symbols)if(symbol!=="CASH")history.push(await getPortfolioHistory(symbol));
  return NextResponse.json({estimate:estimateHistory(history,symbols,body.years)},{headers:{"Cache-Control":"private, no-store"}});
 }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Historical estimates unavailable."},{status:400});}
}
