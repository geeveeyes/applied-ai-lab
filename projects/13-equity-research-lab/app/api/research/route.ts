import { NextResponse } from "next/server";
import { z } from "zod";
import { readSnapshots, removedSnapshotIds, changeSnapshotVisibility } from "@/lib/server/archive";
import { sameOrigin } from "@/lib/server/request-security";
export async function GET(request: Request) {
  try { const trash = new URL(request.url).searchParams.get("trash") === "1";
    return NextResponse.json({ runs: await readSnapshots(undefined, trash), removedIds: await removedSnapshotIds() }, { headers: { "Cache-Control": "private, no-store" } }); }
  catch { return NextResponse.json({ error: "Cloud archive unavailable. Showing browser copies." }, { status: 503 }); }
}
const schema = z.object({ ids: z.array(z.string().regex(/^[A-Za-z0-9.\-]{1,100}$/)).min(1).max(100), action: z.enum(["remove", "restore"]) });
export async function PATCH(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Request origin not allowed" }, { status: 403 });
  try {
    const input = schema.parse(await request.json());
    const ids = await changeSnapshotVisibility([...new Set(input.ids)], input.action === "restore");
    return NextResponse.json({ ids }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return NextResponse.json({ error: error instanceof z.ZodError ? "Invalid archive selection" : "Cloud archive could not be updated. Try again." }, { status: error instanceof z.ZodError ? 400 : 503 }); }
}
