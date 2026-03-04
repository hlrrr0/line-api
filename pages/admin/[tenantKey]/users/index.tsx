import { useState, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'

interface User {
  id: string
  line_user_id: string
  display_name: string
  is_blocked: boolean
  created_at: string
}

export default function UsersPage() {
  const router = useRouter()
  const tenantKey = router.query.tenantKey as string
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'blocked'>('all')

  useEffect(() => {
    if (!tenantKey) return
    setLoading(true)
    fetch(`/api/admin/users?tenantKey=${tenantKey}&filter=${filter}`)
      .then(r => r.json())
      .then(data => setUsers(data.users || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [filter, tenantKey])

  if (!tenantKey) return null

  return (
    <>
      <Head>
        <title>ユーザー管理 - LINE配信システム</title>
      </Head>

      <div style={styles.container}>
        <header style={styles.header}>
          <Link href={`/admin/${tenantKey}`} style={styles.backLink}>← ダッシュボード</Link>
          <h1 style={styles.title}>ユーザー管理</h1>
        </header>

        <div style={styles.filterBar}>
          {(['all', 'active', 'blocked'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                ...styles.filterButton,
                ...(filter === f ? styles.filterButtonActive : {})
              }}
            >
              {f === 'all' ? '全て' : f === 'active' ? 'アクティブ' : 'ブロック済み'}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={styles.loading}>読み込み中...</div>
        ) : users.length === 0 ? (
          <div style={styles.emptyState}>
            <p style={styles.emptyText}>ユーザーが登録されていません</p>
            <p style={styles.emptyHint}>
              ユーザーは以下の場合に自動登録されます：<br/>
              • LINE公式アカウントを友達追加<br/>
              • LIFFフォームを送信
            </p>
          </div>
        ) : (
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeader}>
                  <th style={styles.th}>表示名</th>
                  <th style={styles.th}>LINE ID</th>
                  <th style={styles.th}>ステータス</th>
                  <th style={styles.th}>登録日</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr
                    key={user.id}
                    style={{ ...styles.tableRow, cursor: 'pointer' }}
                    onClick={() => router.push(`/admin/${tenantKey}/users/${user.id}`)}
                  >
                    <td style={styles.td}>{user.display_name || '未設定'}</td>
                    <td style={styles.td}>{user.line_user_id}</td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.statusBadge,
                        ...(user.is_blocked ? styles.statusBlocked : styles.statusActive)
                      }}>
                        {user.is_blocked ? 'ブロック済み' : 'アクティブ'}
                      </span>
                    </td>
                    <td style={styles.td}>{new Date(user.created_at).toLocaleDateString('ja-JP')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
    marginBottom: '30px',
  },
  backLink: {
    color: '#06c755',
    textDecoration: 'none',
    fontSize: '14px',
    display: 'inline-block',
    marginBottom: '10px',
  },
  title: {
    fontSize: '28px',
    color: '#333',
    margin: 0,
  },
  filterBar: {
    display: 'flex',
    gap: '10px',
    marginBottom: '20px',
  },
  filterButton: {
    padding: '10px 20px',
    border: '1px solid #ddd',
    backgroundColor: '#fff',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  filterButtonActive: {
    backgroundColor: '#06c755',
    color: '#fff',
    borderColor: '#06c755',
  },
  loading: {
    textAlign: 'center' as const,
    padding: '40px',
    fontSize: '16px',
    color: '#666',
  },
  tableContainer: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    overflow: 'hidden',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
  },
  tableHeader: {
    backgroundColor: '#f5f5f5',
  },
  th: {
    padding: '15px',
    textAlign: 'left' as const,
    fontSize: '14px',
    fontWeight: 'bold' as const,
    color: '#333',
    borderBottom: '2px solid #ddd',
  },
  tableRow: {
    borderBottom: '1px solid #eee',
  },
  td: {
    padding: '15px',
    fontSize: '14px',
    color: '#333',
  },
  statusBadge: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 'bold' as const,
  },
  statusActive: {
    backgroundColor: '#e8f5e9',
    color: '#2e7d32',
  },
  statusBlocked: {
    backgroundColor: '#ffebee',
    color: '#c62828',
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: '60px 20px',
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  emptyText: {
    fontSize: '18px',
    color: '#666',
    marginBottom: '15px',
  },
  emptyHint: {
    fontSize: '14px',
    color: '#999',
    lineHeight: '1.6',
  },
}
