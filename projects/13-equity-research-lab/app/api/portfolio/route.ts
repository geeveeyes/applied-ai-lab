import {NextRequest,NextResponse} from "next/server";
import {archiveContext} from "@/lib/server/archive";
import {sameOrigin} from "@/lib/server/request-security";
import {runPortfolio,requestSchema} from "@/lib/portfolio/model";
export const maxDuration=60;
export async function POST(request:NextRequest){
 if(!sameOrigin(request))return NextResponse.json({error:"Request origin not allowed."},{status:403});
 try{
  const text=await request.text();if(text.length>30000)throw new Error("Simulation input too large.");
  const parsed=requestSchema.safeParse(JSON.parse(text));if(!parsed.success)return NextResponse.json({error:"Check portfolio amounts, assumptions, weights and model limits."},{status:400});
  const snapshot=runPortfolio(parsed.data);
  try{const ctx=await archiveContext();if(ctx){snapshot.storage="cloud";const {error}=await ctx.db.from("equity_portfolio_snapshots").insert({id:snapshot.id,owner_hash:ctx.owner,created_at:snapshot.createdAt,payload:snapshot});if(error)snapshot.storage="unavailable";}}catch{snapshot.storage="unavailable";}
  return NextResponse.json(snapshot,{headers:{"Cache-Control":"private, no-store"}});
 }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Simulation could not complete."},{status:400});}
}
export async function GET(){
 try{const ctx=await archiveContext();if(!ctx)throw new Error();const {data,error}=await ctx.db.from("equity_portfolio_snapshots").select("id,created_at,payload").eq("owner_hash",ctx.owner).order("created_at",{ascending:false}).limit(30);if(error)throw new Error();return NextResponse.json({runs:(data??[]).map(row=>({id:row.id,createdAt:row.created_at,names:row.payload.request.input.strategies.map((s:{name:string})=>s.name)}))},{headers:{"Cache-Control":"private, no-store"}});}catch{return NextResponse.json({error:"Cloud simulation archive unavailable."},{status:503});}
}
