import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";

const PUBLIC_PATHS = new Set(["/api/auth/login", "/api/cron/morning-report"]);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (
    PUBLIC_PATHS.has(pathname) ||
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }
  const signedIn = await verifySessionToken(
    request.cookies.get(SESSION_COOKIE)?.value,
    process.env.SESSION_SECRET,
  );
  if (pathname === "/login") {
    return signedIn
      ? NextResponse.redirect(new URL("/", request.url))
      : NextResponse.next();
  }
  if (signedIn) {
    if (pathname === "/login")
      return NextResponse.redirect(new URL("/", request.url));
    return NextResponse.next();
  }
  if (pathname.startsWith("/api/"))
    return NextResponse.json({ error: "請先登入。" }, { status: 401 });
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!.*\\..*).*)"],
};
