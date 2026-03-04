import { useState, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'

interface InboxItem {
  user_id: string
  display_name: string | null
  picture_url: string | null
  latest_message_content: string
  latest_message_at: string
  unread_count: number
}

export default function ChatPage() {
  const router = useRouter()
  const tenantKey = router.query.tenantKey as string
  const [inbox, setInbox] = useState<InboxItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!tenantKey) return
    fetch(`/api/admin/messages?tenantKey=${tenantKey}`)
      .then(r => r.json())
      .then(data => {
        const items = data.inbox || []
        if (items.length > 0) {
          // 最新のトークがあるユーザーの詳細画面に直接遷移
          router.replace(`/admin/${tenantKey}/users/${items[0].user_id}`)
        } else {
          setInbox(items)
          setLoading(false)
        }
      })
      .catch(err => {
        console.error(err)
        setLoading(false)
      })
  }, [tenantKey, router])

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    if (diff < 86400000) return d.toLocaleString('ja-JP', { hour: '2-digit', minute: '2-digit' })
    if (diff < 172800000) return '昨日'
    return d.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })
  }

  if (!tenantKey) return null

  if (loading) {
    return <div style={s.loading}>読み込み中...</div>
  }

  return (
    <>
      <Head><title>チャット - LINE配信システム</title></Head>
      <div style={s.page}>
        <header style={s.header}>
          <div style={s.headerLeft}>
            <Link href={`/admin/${tenantKey}`} style={s.backLink}>← ダッシュボード</Link>
            <h1 style={s.title}>チャット</h1>
          </div>
        </header>

        <div style={s.list}>
          {inbox.length === 0 ? (
            <div style={s.empty}>メッセージはありません</div>
          ) : (
            inbox.map(item => (
              <div
                key={item.user_id}
                style={s.item}
                onClick={() => router.push(`/admin/${tenantKey}/users/${item.user_id}`)}
              >
                <img
                  src={item.picture_url || '/default-avatar.png'}
                  alt=""
                  style={s.avatar}
                />
                <div style={s.itemContent}>
                  <div style={s.itemTop}>
                    <span style={s.itemName}>{item.display_name || 'ユーザー'}</span>
                    <span style={s.itemDate}>{formatDate(item.latest_message_at)}</span>
                  </div>
                  <div style={s.itemPreview}>
                    {item.latest_message_content.length > 50
                      ? item.latest_message_content.slice(0, 50) + '...'
                      : item.latest_message_content}
                  </div>
                </div>
                {item.unread_count > 0 && (
                  <span style={s.badge}>{item.unread_count}</span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </>
  )
}

const s: Record<string, React.CSSProperties> = {
  loading: {
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    height: '100vh', fontFamily: 'sans-serif', color: '#666',
  },
  page: {
    maxWidth: '700px', margin: '0 auto', padding: '20px',
    fontFamily: 'sans-serif',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: '20px', paddingBottom: '16px', borderBottom: '2px solid #06c755',
  },
  headerLeft: {
    display: 'flex', flexDirection: 'column', gap: '4px',
  },
  backLink: {
    fontSize: '13px', color: '#06c755', textDecoration: 'none',
  },
  title: {
    fontSize: '24px', fontWeight: 'bold', color: '#333', margin: 0,
  },
  list: {
    backgroundColor: '#fff', borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)', overflow: 'hidden',
  },
  empty: {
    padding: '40px 20px', textAlign: 'center', color: '#999', fontSize: '14px',
  },
  item: {
    display: 'flex', gap: '12px', padding: '14px 18px',
    cursor: 'pointer', borderBottom: '1px solid #f0f0f0',
    alignItems: 'center', position: 'relative',
  },
  avatar: {
    width: '48px', height: '48px', borderRadius: '50%',
    objectFit: 'cover', flexShrink: 0,
  },
  itemContent: {
    flex: 1, minWidth: 0,
  },
  itemTop: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: '4px',
  },
  itemName: {
    fontSize: '15px', fontWeight: 'bold', color: '#333',
  },
  itemDate: {
    fontSize: '12px', color: '#999',
  },
  itemPreview: {
    fontSize: '13px', color: '#888',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  badge: {
    backgroundColor: '#06c755', color: '#fff',
    fontSize: '11px', fontWeight: 'bold',
    padding: '2px 8px', borderRadius: '10px',
    flexShrink: 0,
  },
}
