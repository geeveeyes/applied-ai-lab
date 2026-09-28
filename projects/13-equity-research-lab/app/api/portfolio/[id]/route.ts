import {NextResponse} from "next/server";
import {archiveContext} from "@/lib/server/archive";
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 try{const ctx=await archiveContext();if(!ctx)throw new Error();const {id}=await params;const {data,error}=await ctx.db.from("equity_portfolio_snapshots").select("payload").eq("owner_hash",ctx.owner).eq("id",id).maybeSingle();if(error)throw new Error();return NextResponse.json(data?.payload??{error:"Simulation not found in this workspace."},{status:data?200:404,headers:{"Cache-Control":"private, no-store"}});}catch{return NextResponse.json({error:"Cloud simulation archive unavailable."},{status:503});}
}
