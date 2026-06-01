import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const ipAttempts = new Map<string, { count: number; resetAt: number }>()

function rateLimit(ip: string, maxAttempts: number, windowMs: number): boolean {
  const now = Date.now()
  const record = ipAttempts.get(ip)
  if (!record || now > record.resetAt) {
    ipAttempts.set(ip, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (record.count >= maxAttempts) return false
  record.count++
  return true
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'

  const isAuthOrApi = pathname.startsWith('/login') || pathname.startsWith('/auth') || pathname.startsWith('/api')
  if (isAuthOrApi && !rateLimit(ip, 20, 15 * 60 * 1000)) {
    return new NextResponse(
      JSON.stringify({ error: 'Demasiados intentos. Intenta de nuevo en 15 minutos.' }),
      { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': '900' } }
    )
  }

  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  const response = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options))
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()

  const publicRoutes = ['/login', '/auth/callback']
  if (publicRoutes.includes(pathname)) return response

  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
