import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

const LOGIN_PATH = '/admin/login'

const ALLOWED_EMAILS = (process.env.ADMIN_ALLOWED_EMAILS || '')
  .split(',')
  .map(e => e.trim())
  .filter(Boolean)

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // ログインページと認証コールバックはスルー
  if (
    pathname === LOGIN_PATH ||
    pathname === '/auth/callback' ||
    pathname.startsWith('/api/auth/')
  ) {
    return NextResponse.next()
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase env vars missing. Admin routes are unprotected.')
    return NextResponse.next()
  }

  let res = NextResponse.next()

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            req.cookies.set(name, value)
            res.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const isAllowed =
    user !== null &&
    (ALLOWED_EMAILS.length === 0 || ALLOWED_EMAILS.includes(user.email ?? ''))

  if (!isAllowed) {
    if (
      pathname.startsWith('/api/admin/') ||
      pathname.startsWith('/api/segments') ||
      pathname.startsWith('/api/delivery/')
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const loginUrl = new URL(LOGIN_PATH, req.url)
    if (pathname !== LOGIN_PATH) {
      loginUrl.searchParams.set('from', pathname)
    }
    return NextResponse.redirect(loginUrl)
  }

  return res
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/admin/:path*',
    '/api/segments/:path*',
    '/api/segments',
    '/api/delivery/:path*',
  ],
}
