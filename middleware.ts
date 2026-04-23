import { NextResponse, type NextRequest } from 'next/server'

// Lightweight middleware — no Supabase client, no network calls.
// Auth is validated properly inside each Server Component via createClient().
// Here we only redirect unauthenticated cookie-less visitors so they don't
// hit a blank page before the server component runs.
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Supabase stores the session in one or more cookies prefixed with "sb-"
  const hasSession = request.cookies.getAll().some(c => c.name.startsWith('sb-'))

  if (pathname.startsWith('/dashboard') && !hasSession) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (pathname === '/login' && hasSession) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
