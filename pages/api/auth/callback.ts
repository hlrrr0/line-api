import { createServerClient } from '@supabase/ssr'
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const code = req.query.code as string
  const next = (req.query.next as string) || '/admin'
  // OAuthエラー（Google側やSupabase側からのエラー）
  const oauthError = req.query.error as string | undefined
  const oauthErrorDesc = req.query.error_description as string | undefined

  console.log('[auth/callback] query:', req.query)

  if (oauthError) {
    console.error('[auth/callback] OAuth error:', oauthError, oauthErrorDesc)
    return res.redirect(`/admin/login?error=${encodeURIComponent(oauthError)}`)
  }

  if (!code) {
    console.error('[auth/callback] No code in query')
    return res.redirect('/admin/login?error=missing_code')
  }

  const cookieStore: Record<string, string> = {}
  const rawCookies = req.headers.cookie || ''
  rawCookies.split(';').forEach(c => {
    const [name, ...rest] = c.trim().split('=')
    if (name) cookieStore[name] = rest.join('=')
  })

  const setCookieHeaders: string[] = []

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return Object.entries(cookieStore).map(([name, value]) => ({ name, value }))
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            let cookie = `${name}=${value}`
            if (options?.path) cookie += `; Path=${options.path}`
            if (options?.maxAge !== undefined) cookie += `; Max-Age=${options.maxAge}`
            if (options?.httpOnly) cookie += `; HttpOnly`
            if (options?.secure) cookie += `; Secure`
            if (options?.sameSite) cookie += `; SameSite=${options.sameSite}`
            setCookieHeaders.push(cookie)
          })
        },
      },
    }
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('Auth callback error:', error)
    return res.redirect('/admin/login?error=auth_failed')
  }

  if (setCookieHeaders.length > 0) {
    res.setHeader('Set-Cookie', setCookieHeaders)
  }

  return res.redirect(next)
}
