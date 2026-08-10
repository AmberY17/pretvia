import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

function getSecret() {
  const authSecret = process.env.AUTH_SECRET;
  if (!authSecret) return null;
  return new TextEncoder().encode(authSecret);
}

/**
 * Dashboard areas that only coaches may open. These mirror the client-side
 * `useRequireAuth({ requireCoach: true })` guards — this is defence in depth, so
 * a non-coach can't simply render the page by disabling JS. The API routes remain
 * the real authority (the JWT `role` claim can be up to 7 days stale).
 */
const COACH_ONLY_PREFIXES = [
  "/dashboard/attendance",
  "/dashboard/club",
  "/dashboard/group",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/dashboard")) {
    const secret = getSecret();
    if (!secret) {
      return NextResponse.redirect(new URL("/auth", request.url));
    }

    const token = request.cookies.get("session")?.value;
    if (!token) {
      return NextResponse.redirect(new URL("/auth", request.url));
    }

    try {
      const { payload } = await jwtVerify(token, secret);

      const needsCoach = COACH_ONLY_PREFIXES.some(
        (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
      );
      if (needsCoach && payload.role !== "coach") {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }

      return NextResponse.next();
    } catch {
      return NextResponse.redirect(new URL("/auth", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
