import { useState, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'

export default function WelcomeMessagePage() {
  const router = useRouter()
  const tenantKey = router.query.tenantKey as string

  const [messages, setMessages] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!tenantKey) return
    fetch(`/api/admin/welcome-messages?tenantKey=${tenantKey}`)
      .then(r => r.json())
      .then(data => setMessages(data.messages || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [tenantKey])

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch(`/api/admin/welcome-messages?tenantKey=${tenantKey}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: messages.filter(m => m.trim()) }),
      })
      if (res.ok) {
        const data = await res.json()
        setMessages(data.messages)
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      } else {
        alert('保存に失敗しました')
      }
    } catch {
      alert('エラーが発生しました')
    } finally {
      setSaving(false)
    }
  }

  const addMessage = () => {
    if (messages.length >= 5) return
    setMessages([...messages, ''])
  }

  const updateMessage = (index: number, value: string) => {
    const updated = [...messages]
    updated[index] = value
    setMessages(updated)
  }

  const removeMessage = (index: number) => {
    setMessages(messages.filter((_, i) => i !== index))
  }

  const moveMessage = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= messages.length) return
    const updated = [...messages]
    ;[updated[index], updated[newIndex]] = [updated[newIndex], updated[index]]
    setMessages(updated)
  }

  if (!tenantKey) return null

  return (
    <>
      <Head>
        <title>友だち追加メッセージ - {tenantKey}</title>
      </Head>

      <div style={styles.container}>
        <header style={styles.header}>
          <Link href={`/admin/${tenantKey}`} style={styles.backLink}>← ダッシュボード</Link>
          <h1 style={styles.title}>友だち追加メッセージ</h1>
          <p style={styles.subtitle}>友だち追加時に自動送信されるメッセージを設定します（最大5吹き出し）</p>
        </header>

        {loading ? (
          <div style={styles.loading}>読み込み中...</div>
        ) : (
          <div style={styles.content}>
            {/* 編集パネル */}
            <div style={styles.editPanel}>
              <div style={styles.panelHeader}>
                <h2 style={styles.panelTitle}>メッセージ編集</h2>
                <span style={styles.count}>{messages.length} / 5</span>
              </div>

              {messages.length === 0 && (
                <div style={styles.emptyState}>
                  <p style={styles.emptyText}>メッセージが未設定です</p>
                  <p style={styles.emptyHint}>未設定の場合、デフォルトメッセージが送信されます</p>
                </div>
              )}

              <div style={styles.messageList}>
                {messages.map((msg, i) => (
                  <div key={i} style={styles.messageItem}>
                    <div style={styles.messageHeader}>
                      <span style={styles.messageLabel}>吹き出し {i + 1}</span>
                      <div style={styles.messageActions}>
                        <button
                          onClick={() => moveMessage(i, -1)}
                          disabled={i === 0}
                          style={{ ...styles.iconBtn, ...(i === 0 ? styles.iconBtnDisabled : {}) }}
                          title="上に移動"
                        >↑</button>
                        <button
                          onClick={() => moveMessage(i, 1)}
                          disabled={i === messages.length - 1}
                          style={{ ...styles.iconBtn, ...(i === messages.length - 1 ? styles.iconBtnDisabled : {}) }}
                          title="下に移動"
                        >↓</button>
                        <button
                          onClick={() => removeMessage(i)}
                          style={styles.removeBtn}
                          title="削除"
                        >×</button>
                      </div>
                    </div>
                    <textarea
                      id={`msg-textarea-${i}`}
                      value={msg}
                      onChange={e => updateMessage(i, e.target.value)}
                      placeholder="メッセージを入力..."
                      rows={3}
                      style={styles.textarea}
                    />
                    <div style={styles.varBar}>
                      <span style={styles.varLabel}>変数挿入:</span>
                      {[
                        { key: '{liff_url}', label: 'LIFF URL' },
                        { key: '{user_name}', label: 'ユーザー名' },
                      ].map(v => (
                        <button
                          key={v.key}
                          type="button"
                          onClick={() => {
                            const ta = document.getElementById(`msg-textarea-${i}`) as HTMLTextAreaElement
                            if (!ta) return
                            const start = ta.selectionStart
                            const end = ta.selectionEnd
                            const newVal = msg.substring(0, start) + v.key + msg.substring(end)
                            updateMessage(i, newVal)
                            setTimeout(() => {
                              ta.focus()
                              ta.selectionStart = ta.selectionEnd = start + v.key.length
                            }, 0)
                          }}
                          style={styles.varBtn}
                        >{v.label}</button>
                      ))}
                    </div>
                    <small style={styles.charCount}>{msg.length} 文字</small>
                  </div>
                ))}
              </div>

              {messages.length < 5 && (
                <button onClick={addMessage} style={styles.addBtn}>
                  + 吹き出しを追加
                </button>
              )}

              <div style={styles.helpBox}>
                <strong>変数:</strong><br />
                <code style={styles.code}>{'{liff_url}'}</code> → LIFF URL<br />
                <code style={styles.code}>{'{user_name}'}</code> → ユーザーのLINE表示名
              </div>

              <div style={styles.actionBar}>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{ ...styles.saveBtn, ...(saving ? styles.saveBtnDisabled : {}) }}
                >
                  {saving ? '保存中...' : saved ? '保存しました' : '保存する'}
                </button>
              </div>
            </div>

            {/* プレビュー */}
            <div style={styles.previewPanel}>
              <h2 style={styles.panelTitle}>プレビュー</h2>
              <div style={styles.phoneFrame}>
                <div style={styles.phoneHeader}>
                  <div style={styles.phoneHeaderDot} />
                  <span style={styles.phoneHeaderText}>LINE</span>
                  <div style={styles.phoneHeaderDot} />
                </div>
                <div style={styles.chatArea}>
                  {/* 友だち追加イベント */}
                  <div style={styles.systemMessage}>
                    <span style={styles.systemText}>友だちになりました</span>
                  </div>

                  {messages.filter(m => m.trim()).length > 0 ? (
                    messages.filter(m => m.trim()).map((msg, i) => (
                      <div key={i} style={styles.bubbleRow}>
                        {i === 0 && <div style={styles.botAvatar}>B</div>}
                        <div style={{
                          ...styles.bubble,
                          ...(i > 0 ? { marginLeft: '44px' } : {}),
                        }}>
                          {msg.split('\n').map((line, j) => (
                            <span key={j}>
                              {line}
                              {j < msg.split('\n').length - 1 && <br />}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    <>
                      <div style={styles.bubbleRow}>
                        <div style={styles.botAvatar}>B</div>
                        <div style={styles.bubble}>
                          ご登録ありがとうございます！<br /><br />
                          アンケートフォームにご協力いただけると幸いです。<br />
                          下記のリンクからご回答ください。<br />
                          <span style={styles.linkText}>https://liff.line.me/...</span>
                        </div>
                      </div>
                      <div style={styles.defaultBadge}>デフォルトメッセージ</div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
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
    marginBottom: '28px',
    paddingBottom: '16px',
    borderBottom: '2px solid #06c755',
  },
  backLink: {
    fontSize: '13px',
    color: '#06c755',
    textDecoration: 'none',
    display: 'inline-block',
    marginBottom: '8px',
  },
  title: {
    fontSize: '24px',
    color: '#333',
    margin: '0 0 4px 0',
    fontWeight: 'bold' as const,
  },
  subtitle: {
    fontSize: '14px',
    color: '#888',
    margin: 0,
  },
  loading: {
    textAlign: 'center' as const,
    padding: '40px',
    color: '#888',
  },
  content: {
    display: 'grid',
    gridTemplateColumns: '1fr 360px',
    gap: '24px',
    alignItems: 'start',
  },
  editPanel: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '24px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
  },
  panelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  panelTitle: {
    fontSize: '16px',
    fontWeight: 'bold' as const,
    color: '#333',
    margin: 0,
  },
  count: {
    fontSize: '13px',
    color: '#888',
    backgroundColor: '#f5f5f5',
    padding: '4px 10px',
    borderRadius: '12px',
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: '32px 16px',
    backgroundColor: '#fafafa',
    borderRadius: '8px',
    marginBottom: '16px',
  },
  emptyText: {
    fontSize: '15px',
    color: '#666',
    margin: '0 0 4px 0',
  },
  emptyHint: {
    fontSize: '13px',
    color: '#aaa',
    margin: 0,
  },
  messageList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
    marginBottom: '16px',
  },
  messageItem: {
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    padding: '12px',
    backgroundColor: '#fafafa',
  },
  messageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  messageLabel: {
    fontSize: '13px',
    fontWeight: 'bold' as const,
    color: '#06c755',
  },
  messageActions: {
    display: 'flex',
    gap: '4px',
  },
  iconBtn: {
    width: '28px',
    height: '28px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    backgroundColor: '#fff',
    cursor: 'pointer',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#555',
  },
  iconBtnDisabled: {
    opacity: 0.3,
    cursor: 'not-allowed',
  },
  removeBtn: {
    width: '28px',
    height: '28px',
    border: '1px solid #ffcdd2',
    borderRadius: '4px',
    backgroundColor: '#fff',
    cursor: 'pointer',
    fontSize: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#e53935',
    fontWeight: 'bold' as const,
  },
  textarea: {
    width: '100%',
    padding: '10px 12px',
    fontSize: '14px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    resize: 'vertical' as const,
    fontFamily: 'inherit',
    lineHeight: '1.5',
    boxSizing: 'border-box' as const,
    outline: 'none',
  },
  charCount: {
    fontSize: '11px',
    color: '#aaa',
    display: 'block',
    textAlign: 'right' as const,
    marginTop: '4px',
  },
  varBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginTop: '6px',
    flexWrap: 'wrap' as const,
  },
  varLabel: {
    fontSize: '11px',
    color: '#888',
  },
  varBtn: {
    padding: '3px 10px',
    fontSize: '12px',
    border: '1px solid #c8e6c9',
    borderRadius: '4px',
    backgroundColor: '#f1f8e9',
    color: '#388e3c',
    cursor: 'pointer',
    fontWeight: 'bold' as const,
  },
  addBtn: {
    width: '100%',
    padding: '12px',
    border: '2px dashed #c8e6c9',
    borderRadius: '8px',
    backgroundColor: '#f1f8e9',
    color: '#388e3c',
    fontSize: '14px',
    fontWeight: 'bold' as const,
    cursor: 'pointer',
    marginBottom: '16px',
  },
  helpBox: {
    padding: '10px 14px',
    backgroundColor: '#fff3e0',
    borderRadius: '6px',
    fontSize: '13px',
    color: '#e65100',
    marginBottom: '16px',
  },
  code: {
    backgroundColor: '#fbe9e7',
    padding: '2px 6px',
    borderRadius: '3px',
    fontFamily: 'monospace',
    fontSize: '12px',
  },
  actionBar: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
  saveBtn: {
    padding: '12px 32px',
    fontSize: '15px',
    fontWeight: 'bold' as const,
    color: '#fff',
    backgroundColor: '#06c755',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  saveBtnDisabled: {
    backgroundColor: '#aaa',
    cursor: 'not-allowed',
  },

  // プレビュー
  previewPanel: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '20px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
    position: 'sticky' as const,
    top: '24px',
  },
  phoneFrame: {
    border: '2px solid #e0e0e0',
    borderRadius: '16px',
    overflow: 'hidden',
    marginTop: '12px',
  },
  phoneHeader: {
    background: '#06c755',
    padding: '10px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  phoneHeaderDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  phoneHeaderText: {
    color: '#fff',
    fontWeight: 'bold' as const,
    fontSize: '15px',
  },
  chatArea: {
    backgroundColor: '#8cabd9',
    padding: '16px 12px',
    minHeight: '300px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
  },
  systemMessage: {
    textAlign: 'center' as const,
    marginBottom: '8px',
  },
  systemText: {
    fontSize: '11px',
    color: '#fff',
    backgroundColor: 'rgba(0,0,0,0.2)',
    padding: '3px 12px',
    borderRadius: '10px',
  },
  bubbleRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
  },
  botAvatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: '#06c755',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: 'bold' as const,
    flexShrink: 0,
  },
  bubble: {
    backgroundColor: '#fff',
    borderRadius: '0 14px 14px 14px',
    padding: '10px 14px',
    fontSize: '13px',
    lineHeight: '1.5',
    color: '#333',
    maxWidth: '240px',
    wordBreak: 'break-word' as const,
    boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
  },
  linkText: {
    color: '#1a73e8',
    wordBreak: 'break-all' as const,
    fontSize: '12px',
  },
  defaultBadge: {
    textAlign: 'center' as const,
    fontSize: '11px',
    color: 'rgba(255,255,255,0.7)',
    marginTop: '8px',
  },
}
