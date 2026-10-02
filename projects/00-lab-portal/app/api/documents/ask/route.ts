import { NextResponse } from "next/server";
import { ask } from "@/lib/ask";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const text = await request.text();
    if (text.length > 4000) throw new Error("Request is too large.");
    const body = JSON.parse(text || "{}");
    return NextResponse.json(ask(body.question, body.mode));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Request failed." }, { status: 400 });
  }
}
