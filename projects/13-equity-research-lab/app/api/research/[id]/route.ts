import { NextResponse } from "next/server";
import { readSnapshots } from "@/lib/server/archive";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[A-Za-z0-9.\-]{1,100}$/.test(id)) return NextResponse.json({ error: "Invalid report ID" }, { status: 400 });
  try {
    const [run] = await readSnapshots(id);
    return NextResponse.json(run ?? { error: "Snapshot unavailable in this workspace" }, {
      status: run ? 200 : 404, headers: { "Cache-Control": "private, no-store" },
    });
  } catch { return NextResponse.json({ error: "Cloud archive unavailable" }, { status: 503 }); }
}
