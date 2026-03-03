import { useState, useEffect, useRef } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'

interface User {
  id: string
  line_user_id: string
  display_name: string
  picture_url?: string
  is_blocked: boolean
  created_at: string
  tenant_id?: string
}

interface FormResponse {
  id: string
  created_at: string
  form_data: Record<string, any>
  form_definitions?: { name: string }
}

interface Message {
  id: string
  direction: 'received' | 'sent'
  message_type: string
  content: string
  read_at: string | null
  created_at: string
}

export default function UserDetailPage() {
  const router = useRouter()
  const { id, tenantKey } = router.query as { id: string; tenantKey: string }

  const [user, setUser] = useState<User | null>(null)
  const [responses, setResponses] = useState<FormResponse[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const threadRef = useRef<HTMLDivElement>(null)

  const [messageText, setMessageText] = useState('')
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState<{ ok: boolean; message: string } | null>(null)

  useEffect(() => {
    if (!id) return
    fetch(`/api/admin/users/${id}`)
      .then(r => r.json())
      .then(data => {
        setUser(data.user)
        setResponses(data.responses || [])
        setMessages(data.messages || [])
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  // 5秒ごとにメッセージを自動更新
  useEffect(() => {
    if (!id) return
    const timer = setInterval(() => {
      fetch(`/api/admin/users/${id}`)
        .then(r => r.json())
        .then(data => setMessages(data.messages || []))
        .catch(console.error)
    }, 5000)
    return () => clearInterval(timer)
  }, [id])

  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight
    }
  }, [messages])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!messageText.trim() || !tenantKey || !user) return

    setSending(true)
    setSendResult(null)

    try {
      const res = await fetch('/api/delivery/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantKey,
          lineUserId: user.line_user_id,
          messageType: 'text',
          messageContent: { text: messageText.trim() },
        }),
      })

      const data = await res.json()
      if (res.ok) {
        setSendResult({ ok: true, message: 'メッセージを送信しました' })
        setMessageText('')
        // メッセージ一覧を更新
        fetch(`/api/admin/users/${id}`)
          .then(r => r.json())
          .then(data => setMessages(data.messages || []))
          .catch(console.error)
      } else {
        setSendResult({ ok: false, message: data.error || '送信に失敗しました' })
      }
    } catch {
      setSendResult({ ok: false, message: '通信エラーが発生しました' })
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return <div style={styles.loading}>読み込み中...</div>
  }

  if (!user) {
    return <div style={styles.loading}>ユーザーが見つかりません</div>
  }

  return (
    <>
      <Head>
        <title>{user.display_name || 'ユーザー詳細'} - LINE配信システム</title>
      </Head>

      <div style={styles.container}>
        <header style={styles.header}>
          <Link href={`/admin/users${tenantKey ? `?tenantKey=${tenantKey}` : ''}`} style={styles.backLink}>
            ← ユーザー一覧に戻る
          </Link>
          <h1 style={styles.title}>ユーザー詳細</h1>
        </header>

        {/* ユーザー情報 */}
        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>プロフィール</h2>
          <div style={styles.profileGrid}>
            {user.picture_url && (
              <img src={user.picture_url} alt={user.display_name} style={styles.avatar} />
            )}
            <div style={styles.profileInfo}>
              <div style={styles.profileRow}>
                <span style={styles.profileLabel}>表示名</span>
                <span style={styles.profileValue}>{user.display_name || '未設定'}</span>
              </div>
              <div style={styles.profileRow}>
                <span style={styles.profileLabel}>LINE ID</span>
                <span style={{ ...styles.profileValue, ...styles.lineId }}>{user.line_user_id}</span>
              </div>
              <div style={styles.profileRow}>
                <span style={styles.profileLabel}>ステータス</span>
                <span style={{
                  ...styles.statusBadge,
                  ...(user.is_blocked ? styles.statusBlocked : styles.statusActive)
                }}>
                  {user.is_blocked ? 'ブロック済み' : 'アクティブ'}
                </span>
              </div>
              <div style={styles.profileRow}>
                <span style={styles.profileLabel}>登録日</span>
                <span style={styles.profileValue}>
                  {new Date(user.created_at).toLocaleDateString('ja-JP')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* メッセージ送信 */}
        {!user.is_blocked && tenantKey && (
          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>メッセージ送信</h2>
            <form onSubmit={handleSendMessage} style={styles.messageForm}>
              <textarea
                value={messageText}
                onChange={e => setMessageText(e.target.value)}
                placeholder="送信するメッセージを入力..."
                rows={4}
                style={styles.textarea}
                maxLength={2000}
              />
              <div style={styles.messageFooter}>
                <span style={styles.charCount}>{messageText.length} / 2000</span>
                <button
                  type="submit"
                  disabled={sending || !messageText.trim()}
                  style={{
                    ...styles.sendButton,
                    ...(sending || !messageText.trim() ? styles.sendButtonDisabled : {}),
                  }}
                >
                  {sending ? '送信中...' : '送信する'}
                </button>
              </div>
              {sendResult && (
                <div style={{
                  ...styles.sendResult,
                  ...(sendResult.ok ? styles.sendResultOk : styles.sendResultError),
                }}>
                  {sendResult.message}
                </div>
              )}
            </form>
          </div>
        )}

        {/* 会話履歴 */}
        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>会話履歴</h2>
          {messages.length === 0 ? (
            <p style={styles.emptyText}>メッセージ履歴がありません</p>
          ) : (
            <div style={threadStyles.thread} ref={threadRef}>
              {messages.map(msg => (
                <div
                  key={msg.id}
                  style={{
                    ...threadStyles.bubble,
                    ...(msg.direction === 'sent' ? threadStyles.bubbleSent : threadStyles.bubbleReceived),
                  }}
                >
                  <div style={{
                    ...threadStyles.bubbleInner,
                    ...(msg.direction === 'sent' ? threadStyles.bubbleInnerSent : threadStyles.bubbleInnerReceived),
                  }}>
                    {msg.content}
                  </div>
                  <div style={{
                    ...threadStyles.bubbleMeta,
                    textAlign: msg.direction === 'sent' ? 'right' : 'left',
                  }}>
                    {msg.direction === 'sent' ? '管理者' : (user?.display_name || 'ユーザー')}
                    {'　'}
                    {new Date(msg.created_at).toLocaleString('ja-JP', {
                      month: 'numeric',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* フォーム回答履歴 */}
        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>フォーム回答履歴</h2>
          {responses.length === 0 ? (
            <p style={styles.emptyText}>回答履歴がありません</p>
          ) : (
            <div style={styles.responseList}>
              {responses.map(response => (
                <div key={response.id} style={styles.responseItem}>
                  <div style={styles.responseHeader}>
                    <span style={styles.formName}>
                      {response.form_definitions?.name || '不明なフォーム'}
                    </span>
                    <span style={styles.responseDate}>
                      {new Date(response.created_at).toLocaleString('ja-JP')}
                    </span>
                  </div>
                  <table style={styles.responseTable}>
                    <tbody>
                      {Object.entries(response.form_data || {}).map(([key, value]) => (
                        <tr key={key}>
                          <td style={styles.responseKey}>{key}</td>
                          <td style={styles.responseValue}>
                            {Array.isArray(value) ? value.join(', ') : String(value ?? '')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

const styles: Record<string, React.CSSProperties> = {
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    fontFamily: 'sans-serif',
    color: '#666',
  },
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
  title: {
    fontSize: '28px',
    color: '#333',
    margin: 0,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    padding: '24px',
    marginBottom: '20px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#333',
    margin: '0 0 16px 0',
    paddingBottom: '10px',
    borderBottom: '1px solid #eee',
  },
  profileGrid: {
    display: 'flex',
    gap: '20px',
    alignItems: 'flex-start',
  },
  avatar: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    objectFit: 'cover',
    flexShrink: 0,
  },
  profileInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  profileRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  profileLabel: {
    fontSize: '13px',
    color: '#999',
    width: '80px',
    flexShrink: 0,
  },
  profileValue: {
    fontSize: '14px',
    color: '#333',
  },
  lineId: {
    fontFamily: 'monospace',
    fontSize: '12px',
    color: '#666',
  },
  statusBadge: {
    padding: '3px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  statusActive: {
    backgroundColor: '#e8f5e9',
    color: '#2e7d32',
  },
  statusBlocked: {
    backgroundColor: '#ffebee',
    color: '#c62828',
  },
  messageForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  textarea: {
    padding: '12px',
    fontSize: '14px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontFamily: 'inherit',
    resize: 'vertical',
    outline: 'none',
  },
  messageFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  charCount: {
    fontSize: '12px',
    color: '#999',
  },
  sendButton: {
    padding: '10px 28px',
    backgroundColor: '#06c755',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
    cursor: 'not-allowed',
  },
  sendResult: {
    padding: '10px 14px',
    borderRadius: '6px',
    fontSize: '14px',
  },
  sendResultOk: {
    backgroundColor: '#e8f5e9',
    color: '#2e7d32',
  },
  sendResultError: {
    backgroundColor: '#ffebee',
    color: '#c62828',
  },
  emptyText: {
    color: '#999',
    fontSize: '14px',
    margin: 0,
  },
  responseList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  responseItem: {
    border: '1px solid #eee',
    borderRadius: '6px',
    overflow: 'hidden',
  },
  responseHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 14px',
    backgroundColor: '#f9f9f9',
    borderBottom: '1px solid #eee',
  },
  formName: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#333',
  },
  responseDate: {
    fontSize: '12px',
    color: '#999',
  },
  responseTable: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  responseKey: {
    padding: '8px 14px',
    fontSize: '13px',
    color: '#666',
    width: '35%',
    borderBottom: '1px solid #f0f0f0',
    backgroundColor: '#fafafa',
  },
  responseValue: {
    padding: '8px 14px',
    fontSize: '13px',
    color: '#333',
    borderBottom: '1px solid #f0f0f0',
  },
}

const threadStyles: Record<string, React.CSSProperties> = {
  thread: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    maxHeight: '480px',
    overflowY: 'auto',
    padding: '4px 0',
  },
  bubble: {
    display: 'flex',
    flexDirection: 'column',
    maxWidth: '75%',
  },
  bubbleSent: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  bubbleReceived: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  bubbleInner: {
    padding: '10px 14px',
    borderRadius: '16px',
    fontSize: '14px',
    lineHeight: 1.5,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  bubbleInnerSent: {
    backgroundColor: '#06c755',
    color: '#fff',
    borderBottomRightRadius: '4px',
  },
  bubbleInnerReceived: {
    backgroundColor: '#f0f0f0',
    color: '#333',
    borderBottomLeftRadius: '4px',
  },
  bubbleMeta: {
    fontSize: '11px',
    color: '#aaa',
    marginTop: '3px',
    padding: '0 4px',
  },
}
