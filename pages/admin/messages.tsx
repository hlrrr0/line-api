import { useState, useEffect, useCallback } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'

interface Tenant {
  id: string
  tenant_key: string
  name: string
}

interface InboxEntry {
  user_id: string
  line_user_id: string
  display_name: string | null
  picture_url: string | null
  latest_message_content: string
  latest_message_at: string
  latest_direction: 'received' | 'sent'
  unread_count: number
}

export default function MessagesPage() {
  const router = useRouter()
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [selectedTenantKey, setSelectedTenantKey] = useState('')
  const [inbox, setInbox] = useState<InboxEntry[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/admin/tenants')
      .then(r => r.json())
      .then(data => {
        setTenants(data.tenants || [])
        if (data.tenants?.length > 0) {
          setSelectedTenantKey(data.tenants[0].tenant_key)
        }
      })
      .catch(console.error)
  }, [])

  const fetchInbox = useCallback(() => {
    if (!selectedTenantKey) return
    setLoading(true)
    fetch(`/api/admin/messages?tenantKey=${selectedTenantKey}`)
      .then(r => r.json())
      .then(data => setInbox(data.inbox || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [selectedTenantKey])

  useEffect(() => {
    fetchInbox()
  }, [fetchInbox])

  // 10秒ごとに自動更新
  useEffect(() => {
    if (!selectedTenantKey) return
    const timer = setInterval(() => {
      fetch(`/api/admin/messages?tenantKey=${selectedTenantKey}`)
        .then(r => r.json())
        .then(data => setInbox(data.inbox || []))
        .catch(console.error)
    }, 10000)
    return () => clearInterval(timer)
  }, [selectedTenantKey])

  const handleRowClick = (entry: InboxEntry) => {
    router.push(`/admin/users/${entry.user_id}?tenantKey=${selectedTenantKey}`)
  }

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffDays = Math.floor(diffMs / 86400000)
    if (diffDays === 0) return d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
    if (diffDays < 7) return `${diffDays}日前`
    return d.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })
  }

  const unreadTotal = inbox.reduce((sum, e) => sum + e.unread_count, 0)

  return (
    <>
      <Head>
        <title>受信メッセージ - LINE配信システム</title>
      </Head>
      <div style={styles.container}>
        <header style={styles.header}>
          <Link href="/admin" style={styles.backLink}>← 管理画面に戻る</Link>
          <div style={styles.headerTop}>
            <h1 style={styles.title}>
              受信メッセージ
              {unreadTotal > 0 && (
                <span style={styles.totalUnreadBadge}>{unreadTotal}</span>
              )}
            </h1>
            <button onClick={fetchInbox} style={styles.refreshButton}>更新</button>
          </div>
        </header>

        <div style={styles.tenantSelector}>
          <label style={styles.label}>テナント選択:</label>
          <select
            value={selectedTenantKey}
            onChange={e => setSelectedTenantKey(e.target.value)}
            style={styles.select}
          >
            {tenants.map(t => (
              <option key={t.id} value={t.tenant_key}>{t.name}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div style={styles.loadingText}>読み込み中...</div>
        ) : inbox.length === 0 ? (
          <div style={styles.emptyState}>
            <p style={styles.emptyText}>メッセージはありません</p>
            <p style={styles.emptyHint}>
              ユーザーからLINEメッセージが届くとここに表示されます
            </p>
          </div>
        ) : (
          <div style={styles.list}>
            {inbox.map(entry => (
              <div
                key={entry.user_id}
                style={{
                  ...styles.row,
                  ...(entry.unread_count > 0 ? styles.rowUnread : {}),
                }}
                onClick={() => handleRowClick(entry)}
              >
                <div style={styles.avatarWrap}>
                  {entry.picture_url ? (
                    <img src={entry.picture_url} alt="" style={styles.avatar} />
                  ) : (
                    <div style={styles.avatarFallback}>
                      {(entry.display_name ?? entry.line_user_id).charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                <div style={styles.rowBody}>
                  <div style={styles.rowTop}>
                    <span style={styles.displayName}>
                      {entry.display_name || '名前なし'}
                    </span>
                    <span style={styles.timestamp}>{formatTime(entry.latest_message_at)}</span>
                  </div>
                  <div style={styles.rowBottom}>
                    <span style={styles.preview}>
                      {entry.latest_direction === 'sent' && (
                        <span style={styles.sentLabel}>自分: </span>
                      )}
                      {entry.latest_message_content.length > 60
                        ? entry.latest_message_content.slice(0, 60) + '…'
                        : entry.latest_message_content}
                    </span>
                    {entry.unread_count > 0 && (
                      <span style={styles.unreadBadge}>{entry.unread_count}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '20px',
    fontFamily: 'sans-serif',
  },
  header: {
    marginBottom: '24px',
  },
  backLink: {
    color: '#06c755',
    textDecoration: 'none',
    fontSize: '14px',
    display: 'inline-block',
    marginBottom: '10px',
  },
  headerTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: '28px',
    color: '#333',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  totalUnreadBadge: {
    backgroundColor: '#e53935',
    color: '#fff',
    borderRadius: '12px',
    fontSize: '13px',
    fontWeight: 'bold',
    padding: '2px 8px',
  },
  refreshButton: {
    padding: '8px 16px',
    backgroundColor: '#fff',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
    color: '#555',
  },
  tenantSelector: {
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  label: {
    fontSize: '14px',
    fontWeight: 'bold',
  },
  select: {
    padding: '8px 12px',
    fontSize: '14px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    minWidth: '200px',
  },
  loadingText: {
    textAlign: 'center',
    padding: '40px',
    color: '#666',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  emptyText: {
    fontSize: '18px',
    color: '#666',
    marginBottom: '10px',
  },
  emptyHint: {
    fontSize: '14px',
    color: '#999',
    lineHeight: 1.6,
  },
  list: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    overflow: 'hidden',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    padding: '14px 16px',
    borderBottom: '1px solid #f0f0f0',
    cursor: 'pointer',
    gap: '12px',
  },
  rowUnread: {
    backgroundColor: '#f0f9f4',
  },
  avatarWrap: {
    flexShrink: 0,
  },
  avatar: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    objectFit: 'cover',
  },
  avatarFallback: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    backgroundColor: '#06c755',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    fontWeight: 'bold',
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
  },
  rowTop: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '4px',
  },
  displayName: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#333',
  },
  timestamp: {
    fontSize: '12px',
    color: '#aaa',
    flexShrink: 0,
    marginLeft: '8px',
  },
  rowBottom: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  preview: {
    fontSize: '13px',
    color: '#666',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
  },
  sentLabel: {
    color: '#aaa',
    fontStyle: 'italic',
  },
  unreadBadge: {
    backgroundColor: '#06c755',
    color: '#fff',
    borderRadius: '10px',
    fontSize: '11px',
    fontWeight: 'bold',
    padding: '2px 7px',
    flexShrink: 0,
    marginLeft: '8px',
  },
}
