import { useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const errorParam = router.query.error as string | undefined
  const [uiError, setUiError] = useState('')

  async function handleGoogleLogin() {
    setUiError('')
    const from = (router.query.from as string) || '/admin'
    const redirectTo = `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(from)}`
    console.log('[login] redirectTo:', redirectTo)
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    })
    console.log('[login] signInWithOAuth result:', { data, error })
    if (error) {
      setUiError(`Supabase error: ${error.message}`)
    }
  }

  const displayError = uiError || (errorParam
    ? (errorParam === 'auth_failed' ? '認証に失敗しました。もう一度お試しください。' : `ログインエラー: ${errorParam}`)
    : '')

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.logoWrap}>
          <span style={styles.logo}>LINE</span>
        </div>
        <h1 style={styles.title}>管理画面</h1>
        <p style={styles.subtitle}>Googleアカウントでログインしてください</p>

        {displayError && (
          <p style={styles.error}>{displayError}</p>
        )}

        <button onClick={handleGoogleLogin} style={styles.googleButton}>
          <GoogleIcon />
          Googleでサインイン
        </button>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" style={{ flexShrink: 0 }}>
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
      <path fill="#FBBC05" d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"/>
    </svg>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f5f5f5',
  },
  card: {
    background: '#fff',
    borderRadius: 12,
    padding: '40px 48px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
    width: '100%',
    maxWidth: 380,
    textAlign: 'center',
  },
  logoWrap: {
    marginBottom: 16,
  },
  logo: {
    backgroundColor: '#06c755',
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
    padding: '4px 10px',
    borderRadius: 4,
    letterSpacing: '0.5px',
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    color: '#333',
    margin: '12px 0 4px',
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    marginBottom: 28,
  },
  error: {
    color: '#d32f2f',
    fontSize: 13,
    marginBottom: 16,
    background: '#fff3f3',
    padding: '8px 12px',
    borderRadius: 6,
    textAlign: 'left',
    wordBreak: 'break-all',
  },
  googleButton: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: '12px 16px',
    border: '1px solid #ddd',
    borderRadius: 8,
    background: '#fff',
    fontSize: 15,
    fontWeight: 500,
    color: '#333',
    cursor: 'pointer',
  },
}
