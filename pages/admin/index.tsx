import { useState, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'

interface Stats {
  totalUsers: number
  activeUsers: number
  totalResponses: number
  todayResponses: number
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    activeUsers: 0,
    totalResponses: 0,
    todayResponses: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/stats')
      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div style={styles.loading}>読み込み中...</div>
  }

  return (
    <>
      <Head>
        <title>管理画面 - LINE配信システム</title>
      </Head>

      <div style={styles.container}>
        <header style={styles.header}>
          <h1 style={styles.title}>LINE配信システム 管理画面</h1>
        </header>

        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>総ユーザー数</div>
            <div style={styles.statValue}>{stats.totalUsers}</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>アクティブユーザー</div>
            <div style={styles.statValue}>{stats.activeUsers}</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>総回答数</div>
            <div style={styles.statValue}>{stats.totalResponses}</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>本日の回答数</div>
            <div style={styles.statValue}>{stats.todayResponses}</div>
          </div>
        </div>

        <div style={styles.menuGrid}>
          <Link href="/admin/tenants" style={styles.menuCard}>
            <h3 style={styles.menuTitle}>🏢 テナント管理</h3>
            <p style={styles.menuDescription}>アカウント追加・設定</p>
          </Link>

          <Link href="/admin/users" style={styles.menuCard}>
            <h3 style={styles.menuTitle}>👥 ユーザー管理</h3>
            <p style={styles.menuDescription}>ユーザー一覧・詳細確認</p>
          </Link>

          <Link href="/admin/forms" style={styles.menuCard}>
            <h3 style={styles.menuTitle}>📝 フォーム管理</h3>
            <p style={styles.menuDescription}>フォーム作成・編集</p>
          </Link>

          <Link href="/admin/delivery" style={styles.menuCard}>
            <h3 style={styles.menuTitle}>📨 メッセージ配信</h3>
            <p style={styles.menuDescription}>新規配信</p>
          </Link>

          <Link href="/admin/delivery/history" style={styles.menuCard}>
            <h3 style={styles.menuTitle}>📋 配信履歴</h3>
            <p style={styles.menuDescription}>過去の配信確認</p>
          </Link>

          <Link href="/admin/segments" style={styles.menuCard}>
            <h3 style={styles.menuTitle}>🎯 セグメント管理</h3>
            <p style={styles.menuDescription}>セグメント作成・編集</p>
          </Link>

          <Link href="/admin/responses" style={styles.menuCard}>
            <h3 style={styles.menuTitle}>📄 回答データ</h3>
            <p style={styles.menuDescription}>フォーム回答閲覧</p>
          </Link>
        </div>
      </div>
    </>
  )
}

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '20px',
    fontFamily: 'sans-serif',
  },
  header: {
    marginBottom: '40px',
  },
  title: {
    fontSize: '32px',
    color: '#06c755',
    margin: 0,
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    fontSize: '18px',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px',
    marginBottom: '40px',
  },
  statCard: {
    backgroundColor: '#fff',
    padding: '30px',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    textAlign: 'center' as const,
  },
  statLabel: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '10px',
  },
  statValue: {
    fontSize: '36px',
    fontWeight: 'bold' as const,
    color: '#06c755',
  },
  menuGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '20px',
  },
  menuCard: {
    backgroundColor: '#fff',
    padding: '30px',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    textDecoration: 'none',
    color: 'inherit',
    transition: 'transform 0.2s, box-shadow 0.2s',
    cursor: 'pointer',
  },
  menuTitle: {
    fontSize: '20px',
    margin: '0 0 10px 0',
    color: '#333',
  },
  menuDescription: {
    fontSize: '14px',
    color: '#666',
    margin: 0,
  },
}
