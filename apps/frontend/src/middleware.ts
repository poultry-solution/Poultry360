import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const hostname = request.headers.get("host") || "";

  // Extract subdomain (handle both prod and local testing)
  const subdomain = hostname.split(".")[0];

  // Skip middleware for localhost without subdomain
  if (hostname.startsWith("localhost") && !hostname.includes(".localhost")) {
    return NextResponse.next();
  }

  // Skip for main domain (p360.com or www.p360.com)
  if (hostname === "p360.com" || hostname === "www.p360.com") {
    return NextResponse.next();
  }

  // Skip for auth and public routes
  if (
    url.pathname.startsWith("/auth") ||
    url.pathname.startsWith("/share") ||
    url.pathname.startsWith("/_next") ||
    url.pathname.startsWith("/api")
  ) {
    return NextResponse.next();
  }

  // Handle subdomain routing
  if (subdomain === "farmer" || subdomain === "farmer.localhost") {
    // farmer.p360.com/dashboard/home → /farmer/dashboard/home
    if (!url.pathname.startsWith("/farmer")) {
      url.pathname = `/farmer${url.pathname}`;
      return NextResponse.rewrite(url);
    }
  }

  if (subdomain === "doctor" || subdomain === "doctor.localhost") {
    // doctor.p360.com/dashboard → /doctor/dashboard
    if (!url.pathname.startsWith("/doctor")) {
      url.pathname = `/doctor${url.pathname}`;
      return NextResponse.rewrite(url);
    }
  }

  if (subdomain === "admin" || subdomain === "admin.localhost") {
    // admin.p360.com/dashboard → /admin/dashboard
    if (!url.pathname.startsWith("/admin")) {
      url.pathname = `/admin${url.pathname}`;
      return NextResponse.rewrite(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};
