import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const hostname = request.headers.get("host") || "";
  const normalizedHostname = hostname.split(":")[0];

  const isMarketingPath =
    url.pathname === "/" ||
    url.pathname.startsWith("/marketplace") ||
    url.pathname.startsWith("/features") ||
    url.pathname.startsWith("/pricing");

  const isAlwaysPublicPath =
    isMarketingPath ||
    url.pathname.startsWith("/auth") ||
    url.pathname.startsWith("/share") ||
    url.pathname.startsWith("/_next") ||
    url.pathname.startsWith("/api") ||
    url.pathname === "/robots.txt" ||
    url.pathname === "/sitemap.xml" ||
    url.pathname === "/manifest.webmanifest" ||
    url.pathname.startsWith("/icons/");

  if (normalizedHostname === "poultry360.org") {
    url.hostname = "www.poultry360.org";
    return NextResponse.redirect(url, 308);
  }

  // Extract subdomain (handle both prod and local testing)
  const subdomain = normalizedHostname.split(".")[0];

  // Skip middleware for localhost without subdomain
  if (
    normalizedHostname.startsWith("localhost") &&
    !normalizedHostname.includes(".localhost")
  ) {
    return NextResponse.next();
  }

  // Skip for canonical site hosts and public marketing/auth routes.
  if (
    normalizedHostname === "www.poultry360.org" ||
    normalizedHostname === "poultry360.org" ||
    isAlwaysPublicPath
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
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api|robots.txt|sitemap.xml|manifest.webmanifest|icons/).*)",
  ],
};
