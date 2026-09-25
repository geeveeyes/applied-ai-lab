import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const existing = request.cookies.get("research_workspace")?.value;
  if (existing && /^[a-f0-9]{64}$/.test(existing)) return NextResponse.next();
  const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), n => n.toString(16).padStart(2, "0")).join("");
  request.cookies.set("research_workspace", token);
  const response = NextResponse.next({ request: { headers: request.headers } });
  response.cookies.set("research_workspace", token, {
    httpOnly: true, secure: request.nextUrl.protocol === "https:", sameSite: "lax",
    path: "/", maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}
export const config = { matcher: ["/", "/company/:path*", "/research/:path*", "/api/:path*", "/performance"] };
