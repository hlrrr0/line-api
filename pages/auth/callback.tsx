import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '@/lib/supabase'

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    if (!router.isReady) return
    const { code, next } = router.query
    if (!code || typeof code !== 'string') {
      router.replace('/admin/login?error=missing_code')
      return
    }

    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) {
        console.error('Auth callback error:', error)
        router.replace('/admin/login?error=auth_failed')
      } else {
        router.replace(typeof next === 'string' ? next : '/admin')
      }
    })
  }, [router.isReady, router.query])

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'sans-serif', color: '#888' }}>
      認証中...
    </div>
  )
}
