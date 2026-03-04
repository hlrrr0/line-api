import { useState, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { supabase } from '@/lib/supabase'

interface Stats {
  totalUsers: number
  activeUsers: number
  totalResponses: number
  todayResponses: number
}

const menuGroups = [
  {
    label: '配信管理',
    color: '#1976d2',
    items: [
      { href: '/admin/chat', icon: '💬', title: 'チャット', description: 'ユーザーとのチャット・メッセージ管理' },
      { href: '/admin/delivery', icon: '📨', title: 'メッセージ配信', description: 'セグメント選択してLINE配信' },
      { href: '/admin/segments', icon: '🎯', title: 'セグメント管理', description: 'フォーム回答で絞り込み条件を設定' },
      { href: '/admin/delivery/history', icon: '📋', title: '配信履歴', description: '過去の配信結果を確認' },
    ],
  },
  {
    label: 'フォーム・回答',
    color: '#f57c00',
    items: [
      { href: '/admin/forms', icon: '📝', title: 'フォーム管理', description: '質問フォームの作成・編集' },
      { href: '/admin/responses', icon: '📄', title: '回答データ', description: 'ユーザーのフォーム回答を閲覧・CSV出力' },
    ],
  },
  {
    label: 'ユーザー・設定',
    color: '#388e3c',
    items: [
      { href: '/admin/users', icon: '👥', title: 'ユーザー管理', description: 'LINEユーザー一覧・詳細確認' },
      { href: '/admin/tenants', icon: '🏢', title: 'テナント設定', description: 'LINE認証情報・アカウント設定' },
    ],
  },
]

export default function AdminDashboard() {
  const router = useRouter()
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    activeUsers: 0,
    totalResponses: 0,
    todayResponses: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(r => r.json())
      .then(data => setStats(data))
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

        {/* サマリー */}
        <div style={styles.statsGrid}>
          {[
            { label: '総ユーザー数', value: loading ? '…' : stats.totalUsers },
            { label: 'アクティブ', value: loading ? '…' : stats.activeUsers },
            { label: '総回答数', value: loading ? '…' : stats.totalResponses },
            { label: '本日の回答', value: loading ? '…' : stats.todayResponses },
          ].map(s => (
            <div key={s.label} style={styles.statCard}>
              <div style={styles.statLabel}>{s.label}</div>
              <div style={styles.statValue}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* カテゴリ別メニュー */}
        {menuGroups.map(group => (
          <section key={group.label} style={styles.section}>
            <div style={{ ...styles.sectionHeader, borderLeftColor: group.color }}>
              <h2 style={{ ...styles.sectionTitle, color: group.color }}>{group.label}</h2>
            </div>
            <div style={styles.cardRow}>
              {group.items.map(item => (
                <Link key={item.href} href={item.href} style={styles.card}>
                  <div style={{ ...styles.cardAccent, backgroundColor: group.color }} />
                  <div style={styles.cardBody}>
                    <div style={styles.cardIcon}>{item.icon}</div>
                    <div>
                      <div style={styles.cardTitle}>{item.title}</div>
                      <div style={styles.cardDesc}>{item.description}</div>
                    </div>
                  </div>
                  <div style={{ ...styles.cardArrow, color: group.color }}>→</div>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  )
}

const styles = {
  container: {
    maxWidth: '1100px',
    margin: '0 auto',
    padding: '24px 20px 48px',
    fontFamily: 'sans-serif',
  },
  header: {
    marginBottom: '32px',
    paddingBottom: '20px',
    borderBottom: '2px solid #06c755',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '16px',
    marginBottom: '40px',
  },
  statCard: {
    backgroundColor: '#fff',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
    textAlign: 'center' as const,
  },
  statLabel: {
    fontSize: '12px',
    color: '#888',
    marginBottom: '8px',
    fontWeight: 'bold' as const,
    letterSpacing: '0.5px',
  },
  statValue: {
    fontSize: '32px',
    fontWeight: 'bold' as const,
    color: '#06c755',
  },
  section: {
    marginBottom: '32px',
  },
  sectionHeader: {
    borderLeft: '4px solid',
    paddingLeft: '12px',
    marginBottom: '12px',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 'bold' as const,
    margin: 0,
    letterSpacing: '0.3px',
  },
  cardRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '12px',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
    textDecoration: 'none',
    color: 'inherit',
    display: 'flex',
    alignItems: 'center',
    overflow: 'hidden',
    transition: 'box-shadow 0.15s, transform 0.15s',
    position: 'relative' as const,
  },
  cardAccent: {
    width: '5px',
    alignSelf: 'stretch',
    flexShrink: 0,
  },
  cardBody: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '18px 16px',
    flex: 1,
  },
  cardIcon: {
    fontSize: '28px',
    lineHeight: 1,
    flexShrink: 0,
  },
  cardTitle: {
    fontSize: '15px',
    fontWeight: 'bold' as const,
    color: '#333',
    marginBottom: '4px',
  },
  cardDesc: {
    fontSize: '12px',
    color: '#888',
    lineHeight: 1.4,
  },
  cardArrow: {
    fontSize: '18px',
    padding: '0 16px',
    opacity: 0.5,
    flexShrink: 0,
  },
}
