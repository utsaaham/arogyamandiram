// ============================================
// Middleware - Auth Route Protection
// ============================================

import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    // Redirect logged-in users away from auth pages
    if (token && (pathname === '/login' || pathname === '/register')) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized({ token, req }) {
        const { pathname } = req.nextUrl;

        // Public routes - no auth required
        const publicPaths = ['/login', '/register', '/api/auth'];
        if (publicPaths.some((p) => pathname.startsWith(p))) {
          return true;
        }

        // Root page is public
        if (pathname === '/') {
          return true;
        }

        // All other routes require auth
        return !!token;
      },
    },
    pages: {
      signIn: '/login',
    },
  }
);

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|icons|images).*)',
  ],
};
