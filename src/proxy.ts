import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_NAME, decrypt } from "@/lib/auth/session";

const PUBLIC_ROUTES = ["/", "/giris"];

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

  const cookie = request.cookies.get(COOKIE_NAME)?.value;
  const session = await decrypt(cookie);
  const isAuthed = Boolean(session?.userId);

  if (!isPublicRoute && !isAuthed) {
    return NextResponse.redirect(new URL("/giris", request.url));
  }

  if (isPublicRoute && isAuthed) {
    return NextResponse.redirect(new URL("/panel", request.url));
  }

  if (pathname.startsWith("/admin") && session?.role !== "admin") {
    return NextResponse.redirect(new URL("/panel", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
