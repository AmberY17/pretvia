import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

function getSecret() {
  const authSecret = process.env.AUTH_SECRET;
  if (!authSecret) return null;
  return new TextEncoder().encode(authSecret);
}

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
      await jwtVerify(token, secret);
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
