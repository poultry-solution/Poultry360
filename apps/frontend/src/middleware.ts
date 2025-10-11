import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const hostname = request.headers.get('host') || '';
  
  // Extract subdomain
  const subdomain = hostname.split('.')[0];
  
  // Skip middleware for localhost and main domain
  if (hostname === 'localhost:3000' || hostname === 'p360.com' || hostname === 'www.p360.com') {
    return NextResponse.next();
  }
  
  // Handle subdomain routing - all subdomains go to /dashboard
  // The dashboard page will handle role-based rendering
  switch (subdomain) {
    case 'admin':
    case 'doctor':
    case 'farmer':
    case 'dealer':
      // All subdomains redirect to /dashboard
      // The dashboard page will determine which UI to show based on user role
      if (url.pathname === '/') {
        url.pathname = '/dashboard';
        return NextResponse.rewrite(url);
      }
      return NextResponse.next();
      
    default:
      // Unknown subdomain, redirect to main site
      return NextResponse.redirect(new URL('/', request.url));
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
