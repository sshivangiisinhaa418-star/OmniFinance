import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const VALID_COMPANIES = new Set(['ssl', 'avl', 'bkm']);

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Bypass internal Next.js assets, public files, and API endpoints
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // 2. Allow standalone public authentication pages & root gateway
  if (pathname === '/login' || pathname.startsWith('/auth') || pathname === '/') {
    return NextResponse.next();
  }

  // Split path segments
  const segments = pathname.split('/').filter(Boolean);
  const firstSegment = segments[0]?.toLowerCase();

  // 3. If path begins with a valid company slug (e.g. /bkm, /ssl/sales, /avl/purchases)
  if (VALID_COMPANIES.has(firstSegment)) {
    const subRoute = segments.slice(1).join('/');

    const url = request.nextUrl.clone();
    // /bkm -> /dashboard?company=bkm
    // /bkm/sales -> /sales?company=bkm
    url.pathname = subRoute ? `/${subRoute}` : '/dashboard';
    url.searchParams.set('company', firstSegment);

    const response = NextResponse.rewrite(url);
    response.cookies.set('omnifinance_active_company_id', firstSegment, { path: '/' });
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
