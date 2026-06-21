import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Paths that don't need authentication
const PUBLIC_PATHS = ["/login", "/report"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow static files & API
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // Check auth cookie
  const token = request.cookies.get("sms_token")?.value;
  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect root to dashboard
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Matcher ini jalan SEBELUM function middleware() di atas, jadi request yang
  // sudah dikecualikan di sini tidak akan pernah masuk ke logic auth check.
  // Tambahan dari versi lama: exclude semua file statis berdasarkan ekstensi
  // (gambar, font, dll) di /public — termasuk /branding/login-bg.jpeg — supaya
  // tidak ikut kena redirect ke /login saat belum punya token.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|gif|ico|css|js|woff|woff2|ttf|map)$).*)",
  ],
};