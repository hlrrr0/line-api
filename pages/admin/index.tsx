import { useState, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { supabase } from '@/lib/supabase'

interface Tenant {
  id: string
  tenant_key: string
  name: string
}

export default function AdminTopPage() {
  const router = useRouter()
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/tenants')
      .then(r => r.json())
      .then(data => setTenants(data.tenants || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/admin/login')
  }

  return (
    <>
      <Head>
        <title>管理画面 - LINE配信システム</title>
      </Head>

      <div style={styles.container}>
        <header style={styles.header}>
          <div style={styles.headerInner}>
            <span style={styles.logo}>LINE</span>
            <h1 style={styles.title}>配信システム 管理画面</h1>
          </div>
          <button onClick={handleLogout} style={styles.logoutButton}>ログアウト</button>
        </header>

        <h2 style={styles.sectionTitle}>アカウントを選択</h2>

        {loading ? (
          <div style={styles.loading}>読み込み中...</div>
        ) : tenants.length === 0 ? (
          <div style={styles.empty}>
            <p>テナントが登録されていません。</p>
            <Link href="/admin/tenants" style={styles.tenantLink}>テナント設定へ →</Link>
          </div>
        ) : (
          <div style={styles.tenantGrid}>
            {tenants.map(tenant => (
              <Link
                key={tenant.id}
                href={`/admin/${tenant.tenant_key}`}
                style={styles.tenantCard}
              >
                <div style={styles.tenantIcon}>🏢</div>
                <div style={styles.tenantName}>{tenant.name}</div>
                <div style={styles.tenantKey}>{tenant.tenant_key}</div>
                <div style={styles.tenantArrow}>→</div>
              </Link>
            ))}
          </div>
        )}

        <div style={styles.footer}>
          <Link href="/admin/tenants" style={styles.footerLink}>テナント設定</Link>
        </div>
      </div>
    </>
  )
}

const styles = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '24px 20px 48px',
    fontFamily: 'sans-serif',
  },
  header: {
    marginBottom: '40px',
    paddingBottom: '20px',
    borderBottom: '2px solid #06c755',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerInner: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  logo: {
    backgroundColor: '#06c755',
    color: '#fff',
    fontWeight: 'bold' as const,
    fontSize: '14px',
    padding: '4px 8px',
    borderRadius: '4px',
    letterSpacing: '0.5px',
  },
  title: {
    fontSize: '24px',
    color: '#333',
    margin: 0,
    fontWeight: 'bold' as const,
  },
  logoutButton: {
    padding: '8px 16px',
    background: 'transparent',
    border: '1px solid #ccc',
    borderRadius: '6px',
    fontSize: '13px',
    color: '#666',
    cursor: 'pointer',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 'bold' as const,
    color: '#333',
    marginBottom: '20px',
  },
  loading: {
    textAlign: 'center' as const,
    padding: '40px',
    color: '#666',
  },
  empty: {
    textAlign: 'center' as const,
    padding: '60px 20px',
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    color: '#666',
  },
  tenantLink: {
    color: '#06c755',
    textDecoration: 'none',
    fontWeight: 'bold' as const,
    display: 'inline-block',
    marginTop: '12px',
  },
  tenantGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
    gap: '16px',
  },
  tenantCard: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    padding: '24px',
    textDecoration: 'none',
    color: 'inherit',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '8px',
    transition: 'box-shadow 0.15s, transform 0.15s',
    position: 'relative' as const,
  },
  tenantIcon: {
    fontSize: '36px',
    marginBottom: '4px',
  },
  tenantName: {
    fontSize: '18px',
    fontWeight: 'bold' as const,
    color: '#333',
  },
  tenantKey: {
    fontSize: '13px',
    color: '#999',
  },
  tenantArrow: {
    position: 'absolute' as const,
    right: '16px',
    top: '50%',
    transform: 'translateY(-50%)',
    fontSize: '18px',
    color: '#06c755',
    opacity: 0.5,
  },
  footer: {
    marginTop: '40px',
    textAlign: 'center' as const,
  },
  footerLink: {
    color: '#06c755',
    textDecoration: 'none',
    fontSize: '14px',
  },
}
