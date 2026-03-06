import { useState, useEffect, useRef, useCallback } from 'react'
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
  support_status?: 'none' | 'action_required' | 'resolved'
  assignee_name?: string
}

interface FormField {
  id: string
  label: string
  type: string
  options?: { value: string; label: string }[]
}

interface FormResponse {
  id: string
  created_at: string
  form_data: Record<string, any>
  form_definitions?: { name: string; fields?: FormField[] }
}

interface Message {
  id: string
  direction: 'received' | 'sent'
  message_type: string
  content: string
  read_at: string | null
  created_at: string
}

interface Tag {
  id: string
  name: string
}

interface Note {
  id: string
  content: string
  created_by?: string
  created_at: string
}

interface InboxItem {
  user_id: string
  line_user_id: string
  display_name: string | null
  picture_url: string | null
  latest_message_content: string
  latest_message_at: string
  latest_direction: 'received' | 'sent'
  unread_count: number
  support_status?: string
}

export default function UserDetailPage() {
  const router = useRouter()
  const { id, tenantKey } = router.query as { id: string; tenantKey: string }

  // ユーザー一覧（左パネル）
  const [inbox, setInbox] = useState<InboxItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  // 選択ユーザー詳細（中央・右パネル）
  const [user, setUser] = useState<User | null>(null)
  const [responses, setResponses] = useState<FormResponse[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const threadRef = useRef<HTMLDivElement>(null)

  const [hasMoreMessages, setHasMoreMessages] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [messageText, setMessageText] = useState('')
  const [sending, setSending] = useState(false)

  const [sidebarTab, setSidebarTab] = useState<'notes' | 'activity'>('notes')
  const [editingAssignee, setEditingAssignee] = useState(false)
  const [assigneeInput, setAssigneeInput] = useState('')
  const [editingTags, setEditingTags] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [newNoteText, setNewNoteText] = useState('')
  const [showNoteForm, setShowNoteForm] = useState(false)
  const prevTotalUnreadRef = useRef<number | null>(null)

  // ブラウザ通知の許可リクエスト
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  // インボックス取得
  const fetchInbox = useCallback(() => {
    if (!tenantKey) return
    fetch(`/api/admin/messages?tenantKey=${tenantKey}`)
      .then(r => r.json())
      .then(data => {
        const items: InboxItem[] = data.inbox || []
        const totalUnread = items.reduce((sum, item) => sum + item.unread_count, 0)

        // 未読が増えた場合にブラウザ通知
        if (prevTotalUnreadRef.current !== null && totalUnread > prevTotalUnreadRef.current) {
          const newItems = items.filter(item => item.unread_count > 0)
          if (newItems.length > 0 && 'Notification' in window && Notification.permission === 'granted') {
            const latest = newItems[0]
            new Notification('新しいメッセージ', {
              body: `${latest.display_name || 'ユーザー'}: ${latest.latest_message_content}`,
              icon: latest.picture_url || '/default-avatar.png',
            })
          }
        }
        prevTotalUnreadRef.current = totalUnread

        setInbox(items)
      })
      .catch(console.error)
  }, [tenantKey])

  useEffect(() => { fetchInbox() }, [fetchInbox])

  // インボックスも定期更新
  useEffect(() => {
    if (!tenantKey) return
    const timer = setInterval(fetchInbox, 15000)
    return () => clearInterval(timer)
  }, [tenantKey, fetchInbox])

  // 選択ユーザーのデータ取得
  const fetchData = useCallback(() => {
    if (!id) return
    fetch(`/api/admin/users/${id}`)
      .then(r => r.json())
      .then(data => {
        setUser(data.user)
        setResponses(data.responses || [])
        const msgs = data.messages || []
        setMessages(msgs)
        setHasMoreMessages(msgs.length >= 50)
        setTags(data.tags || [])
        setNotes(data.notes || [])
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => { fetchData() }, [fetchData])

  // 過去メッセージ読み込み
  const loadMoreMessages = async () => {
    if (!id || loadingMore || messages.length === 0) return
    setLoadingMore(true)
    try {
      const oldest = messages[0].created_at
      const res = await fetch(`/api/admin/users/${id}/messages?before=${oldest}`)
      const data = await res.json()
      const olderMsgs: Message[] = data.messages || []
      if (olderMsgs.length > 0) {
        setMessages([...olderMsgs, ...messages])
      }
      setHasMoreMessages(data.hasMore ?? false)
    } catch {
      // エラー
    } finally {
      setLoadingMore(false)
    }
  }

  // 15秒ごとにメッセージを自動更新（メッセージのみ取得）
  useEffect(() => {
    if (!id || !user?.tenant_id) return
    const timer = setInterval(() => {
      fetch(`/api/admin/messages?tenantKey=${tenantKey}&userId=${id}`)
        .then(r => r.json())
        .then(data => {
          const msgs = data.messages || []
          if (msgs.length > 0) setMessages(msgs)
        })
        .catch(console.error)
    }, 15000)
    return () => clearInterval(timer)
  }, [id, tenantKey, user?.tenant_id])

  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight
    }
  }, [messages])

  const handleSelectUser = (userId: string) => {
    router.push(`/admin/${tenantKey}/users/${userId}`, undefined, { shallow: false })
  }

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!messageText.trim() || !tenantKey || !user) return

    setSending(true)
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
      if (res.ok) {
        setMessageText('')
        fetchData()
        fetchInbox()
      }
    } catch {
      // エラーは静かに処理
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleStatusToggle = async (status: 'action_required' | 'resolved') => {
    if (!user) return
    const newStatus = user.support_status === status ? 'none' : status
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ support_status: newStatus }),
      })
      if (res.ok) {
        const data = await res.json()
        setUser(data.user)
        fetchInbox()
      }
    } catch { /* */ }
  }

  const handleAssigneeSave = async () => {
    if (!user) return
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignee_name: assigneeInput.trim() || null }),
      })
      if (res.ok) {
        const data = await res.json()
        setUser(data.user)
      }
    } catch { /* */ }
    setEditingAssignee(false)
  }

  const handleAddTag = async () => {
    if (!tagInput.trim() || !user?.tenant_id) return
    try {
      const res = await fetch(`/api/admin/users/${id}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tagName: tagInput.trim(), tenantId: user.tenant_id }),
      })
      if (res.ok) {
        setTagInput('')
        fetchData()
      }
    } catch { /* */ }
  }

  const handleRemoveTag = async (tagId: string) => {
    if (!user?.tenant_id) return
    try {
      await fetch(`/api/admin/users/${id}/tags`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tagId, tenantId: user.tenant_id }),
      })
      fetchData()
    } catch { /* */ }
  }

  const handleAddNote = async () => {
    if (!newNoteText.trim() || !user?.tenant_id) return
    try {
      const res = await fetch(`/api/admin/users/${id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newNoteText.trim(), tenantId: user.tenant_id }),
      })
      if (res.ok) {
        setNewNoteText('')
        setShowNoteForm(false)
        fetchData()
      }
    } catch { /* */ }
  }

  const handleDeleteNote = async (noteId: string) => {
    try {
      await fetch(`/api/admin/users/${id}/notes`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noteId }),
      })
      fetchData()
    } catch { /* */ }
  }

  // フォーム回答のフィールドラベル取得
  const getFieldLabel = (response: FormResponse, fieldId: string): string => {
    const fields = response.form_definitions?.fields
    if (fields && Array.isArray(fields)) {
      const field = fields.find((f: FormField) => f.id === fieldId)
      if (field?.label) return field.label
    }
    return fieldId
  }

  // フォーム回答の値をラベルに変換（select/radio/checkbox対応）
  const renderFieldValue = (response: FormResponse, fieldId: string, value: any): string => {
    const fields = response.form_definitions?.fields
    const field = fields?.find((f: FormField) => f.id === fieldId)
    const options = field?.options

    if (Array.isArray(value)) {
      if (options) {
        return value.map(v => {
          const opt = options.find(o => o.value === String(v))
          return opt ? opt.label : String(v)
        }).join(', ')
      }
      return value.join(', ')
    }
    if (options) {
      const opt = options.find(o => o.value === String(value))
      if (opt) return opt.label
    }
    return String(value ?? '-')
  }

  // インボックスのフィルタリング
  const filteredInbox = searchQuery
    ? inbox.filter(item =>
        (item.display_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.latest_message_content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : inbox

  const formatRelativeDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const dayMs = 86400000

    if (diff < dayMs) {
      return date.toLocaleString('ja-JP', { hour: '2-digit', minute: '2-digit' })
    }
    if (diff < dayMs * 2) return '昨日'
    if (diff < dayMs * 7) {
      return ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'][date.getDay()]
    }
    return date.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })
  }

  if (loading) {
    return <div style={st.loadingScreen}>読み込み中...</div>
  }
  if (!user) {
    return <div style={st.loadingScreen}>ユーザーが見つかりません</div>
  }

  return (
    <>
      <Head>
        <title>{user.display_name || 'ユーザー詳細'} - LINE配信システム</title>
      </Head>

      <div style={st.page}>
        <div style={st.main}>
          {/* ===== 左: ユーザー一覧パネル ===== */}
          <div style={st.listPanel}>
            <div style={st.listNav}>
              <Link href={`/admin/${tenantKey}`} style={st.navLink}>← ダッシュボード</Link>
            </div>
            <div style={st.listHeader}>
              <span style={st.listTitle}>すべて</span>
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="検索"
                style={st.listSearch}
              />
            </div>
            <div style={st.listBody}>
              {filteredInbox.map(item => (
                <div
                  key={item.user_id}
                  style={{
                    ...st.listItem,
                    ...(item.user_id === id ? st.listItemActive : {}),
                  }}
                  onClick={() => handleSelectUser(item.user_id)}
                >
                  <img
                    src={item.picture_url || '/default-avatar.png'}
                    alt=""
                    style={st.listAvatar}
                  />
                  <div style={st.listItemContent}>
                    <div style={st.listItemTop}>
                      <span style={st.listItemName}>{item.display_name || 'ユーザー'}</span>
                      <span style={st.listItemDate}>{formatRelativeDate(item.latest_message_at)}</span>
                    </div>
                    <div style={st.listItemBottom}>
                      <span style={st.listItemPreview}>
                        {item.latest_message_content.length > 30
                          ? item.latest_message_content.slice(0, 30) + '...'
                          : item.latest_message_content}
                      </span>
                    </div>
                    {item.unread_count > 0 && (
                      <span style={st.unreadBadge}>{item.unread_count}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ===== 中央: チャットエリア ===== */}
          <div style={st.chatArea}>
            <div style={st.chatHeader}>
              <div style={st.chatHeaderLeft}>
                <span style={st.chatHeaderName}>{user.display_name || 'ユーザー'}</span>
              </div>
              <div style={st.chatHeaderActions}>
                <button
                  style={{
                    ...st.statusBtn,
                    ...(user.support_status === 'action_required' ? st.statusBtnActionActive : st.statusBtnAction),
                  }}
                  onClick={() => handleStatusToggle('action_required')}
                >
                  ● 要対応
                </button>
                <button
                  style={{
                    ...st.statusBtn,
                    ...(user.support_status === 'resolved' ? st.statusBtnResolvedActive : st.statusBtnResolved),
                  }}
                  onClick={() => handleStatusToggle('resolved')}
                >
                  ● 対応済み
                </button>
              </div>
            </div>

            <div style={st.chatThread} ref={threadRef}>
              {hasMoreMessages && messages.length > 0 && (
                <div style={st.loadMoreRow}>
                  <button
                    style={st.loadMoreBtn}
                    onClick={loadMoreMessages}
                    disabled={loadingMore}
                  >
                    {loadingMore ? '読み込み中...' : '過去のメッセージを読み込む'}
                  </button>
                </div>
              )}
              {messages.length === 0 ? (
                <div style={st.emptyChat}>メッセージ履歴がありません</div>
              ) : (
                messages.map((msg, i) => {
                  const isSent = msg.direction === 'sent'
                  const showSender = isSent && (i === 0 || messages[i - 1].direction !== 'sent')
                  return (
                    <div key={msg.id} style={{ ...st.msgRow, justifyContent: isSent ? 'flex-end' : 'flex-start' }}>
                      {!isSent && (
                        <img
                          src={user.picture_url || '/default-avatar.png'}
                          alt=""
                          style={st.msgAvatar}
                        />
                      )}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: isSent ? 'flex-end' : 'flex-start', maxWidth: '70%' }}>
                        {showSender && <span style={st.senderName}>管理者</span>}
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', flexDirection: isSent ? 'row-reverse' : 'row' }}>
                          <div style={isSent ? st.bubbleSent : st.bubbleReceived}>
                            {msg.content}
                          </div>
                          <span style={st.msgTime}>
                            {new Date(msg.created_at).toLocaleString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {!user.is_blocked && tenantKey && (
              <div style={st.inputArea}>
                <div style={st.inputHint}>Enterで送信 / Shift + Enterで改行</div>
                <div style={st.inputRow}>
                  <textarea
                    value={messageText}
                    onChange={e => setMessageText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="メッセージを入力"
                    rows={1}
                    style={st.textInput}
                  />
                  <button
                    onClick={() => handleSendMessage()}
                    disabled={sending || !messageText.trim()}
                    style={{
                      ...st.sendBtn,
                      ...(sending || !messageText.trim() ? st.sendBtnDisabled : {}),
                    }}
                  >
                    送信
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ===== 右: プロフィールサイドバー ===== */}
          <div style={st.sidebar}>
            <div style={st.profileSection}>
              <img
                src={user.picture_url || '/default-avatar.png'}
                alt={user.display_name}
                style={st.largeAvatar}
              />
              <div style={st.displayName}>
                {user.display_name || '未設定'}
              </div>

              <div style={st.tagSection}>
                {tags.map(tag => (
                  <span key={tag.id} style={st.tagBadge}>
                    {tag.name}
                    {editingTags && (
                      <span style={st.tagRemove} onClick={() => handleRemoveTag(tag.id)}>×</span>
                    )}
                  </span>
                ))}
                <button style={st.editIcon} onClick={() => setEditingTags(!editingTags)}>✏️</button>
              </div>
              {editingTags && (
                <div style={st.tagInputRow}>
                  <input
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleAddTag() }}
                    placeholder="タグ名を入力"
                    style={st.tagInputField}
                  />
                  <button onClick={handleAddTag} style={st.tagAddBtn}>追加</button>
                </div>
              )}
            </div>

            <div style={st.assigneeSection}>
              <span style={st.assigneeLabel}>担当者</span>
              {editingAssignee ? (
                <div style={st.assigneeEditRow}>
                  <input
                    value={assigneeInput}
                    onChange={e => setAssigneeInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleAssigneeSave() }}
                    placeholder="担当者名"
                    style={st.assigneeInput}
                    autoFocus
                  />
                  <button onClick={handleAssigneeSave} style={st.assigneeSaveBtn}>保存</button>
                </div>
              ) : (
                <div style={st.assigneeValueRow}>
                  <span style={st.assigneeValue}>{user.assignee_name || '未設定'}</span>
                  <button style={st.editIcon} onClick={() => { setAssigneeInput(user.assignee_name || ''); setEditingAssignee(true) }}>✏️</button>
                </div>
              )}
            </div>

            <div style={st.tabBar}>
              <button
                style={{ ...st.tab, ...(sidebarTab === 'notes' ? st.tabActive : {}) }}
                onClick={() => setSidebarTab('notes')}
              >
                ノート {notes.length > 0 && <span style={st.tabCount}>{notes.length}</span>}
              </button>
              <button
                style={{ ...st.tab, ...(sidebarTab === 'activity' ? st.tabActive : {}) }}
                onClick={() => setSidebarTab('activity')}
              >
                アクティビティ
              </button>
            </div>

            <div style={st.tabContent}>
              {sidebarTab === 'notes' ? (
                <div>
                  <div style={st.noteHeader}>
                    <span style={st.noteCount}>{notes.length}件</span>
                    <button style={st.noteAddBtn} onClick={() => setShowNoteForm(true)}>
                      ノートを追加 +
                    </button>
                  </div>

                  {showNoteForm && (
                    <div style={st.noteForm}>
                      <textarea
                        value={newNoteText}
                        onChange={e => setNewNoteText(e.target.value)}
                        placeholder="ノートを入力..."
                        rows={3}
                        style={st.noteTextarea}
                      />
                      <div style={st.noteFormActions}>
                        <button onClick={() => { setShowNoteForm(false); setNewNoteText('') }} style={st.noteCancelBtn}>キャンセル</button>
                        <button onClick={handleAddNote} disabled={!newNoteText.trim()} style={st.noteSaveBtn}>保存</button>
                      </div>
                    </div>
                  )}

                  {notes.length === 0 && !showNoteForm ? (
                    <div style={st.emptyNotes}>
                      <div style={st.emptyNotesIcon}>ℹ️</div>
                      <div style={st.emptyNotesTitle}>相手とのやりとりを記録できます</div>
                      <div style={st.emptyNotesDesc}>相手の情報や対応の記録、引き継ぎ用のメモなどを追加できます。ノートの内容は相手には見えず、アカウントのメンバーだけが閲覧・編集できます。</div>
                    </div>
                  ) : (
                    <div style={st.noteList}>
                      {notes.map(note => (
                        <div key={note.id} style={st.noteItem}>
                          <div style={st.noteContent}>{note.content}</div>
                          <div style={st.noteMeta}>
                            {note.created_by && <span>{note.created_by} · </span>}
                            {new Date(note.created_at).toLocaleString('ja-JP', {
                              month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
                            })}
                            <button style={st.noteDeleteBtn} onClick={() => handleDeleteNote(note.id)}>削除</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div style={st.activityTab}>
                  {responses.length === 0 ? (
                    <p style={st.emptyActivity}>アクティビティがありません</p>
                  ) : (
                    responses.map(response => (
                      <div key={response.id} style={st.activityItem}>
                        <div style={st.activityHeader}>
                          <span style={st.activityFormName}>
                            {response.form_definitions?.name || '不明なフォーム'}
                          </span>
                          <span style={st.activityDate}>
                            {new Date(response.created_at).toLocaleString('ja-JP')}
                          </span>
                        </div>
                        <table style={st.activityTable}>
                          <tbody>
                            {Object.entries(response.form_data || {}).map(([key, value]) => (
                              <tr key={key}>
                                <td style={st.activityKey}>{getFieldLabel(response, key)}</td>
                                <td style={st.activityValue}>
                                  {renderFieldValue(response, key, value)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// ===== スタイル定義 =====

const st: Record<string, React.CSSProperties> = {
  loadingScreen: {
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    height: '100vh', fontFamily: 'sans-serif', color: '#666',
  },
  page: {
    display: 'flex', flexDirection: 'column', height: '100vh',
    fontFamily: 'sans-serif', backgroundColor: '#f5f5f5',
  },
  main: {
    display: 'flex', flex: 1, overflow: 'hidden',
  },
  listPanel: {
    width: '280px', minWidth: '280px', display: 'flex', flexDirection: 'column',
    backgroundColor: '#fff', borderRight: '1px solid #e0e0e0',
  },
  listNav: {
    padding: '8px 14px', borderBottom: '1px solid #f0f0f0', flexShrink: 0,
  },
  navLink: {
    fontSize: '12px', color: '#06c755', textDecoration: 'none',
  },
  listHeader: {
    display: 'flex', alignItems: 'center', gap: '10px',
    padding: '12px 14px', borderBottom: '1px solid #e0e0e0', flexShrink: 0,
  },
  listTitle: {
    fontSize: '14px', fontWeight: 'bold', color: '#333', whiteSpace: 'nowrap',
  },
  listSearch: {
    flex: 1, padding: '6px 10px', fontSize: '13px',
    border: '1px solid #e0e0e0', borderRadius: '6px', outline: 'none',
    backgroundColor: '#f5f5f5',
  },
  listBody: {
    flex: 1, overflowY: 'auto',
  },
  listItem: {
    display: 'flex', gap: '10px', padding: '12px 14px',
    cursor: 'pointer', borderBottom: '1px solid #f0f0f0',
    position: 'relative',
  },
  listItemActive: {
    backgroundColor: '#f0f7ff',
  },
  listAvatar: {
    width: '44px', height: '44px', borderRadius: '50%',
    objectFit: 'cover', flexShrink: 0,
  },
  listItemContent: {
    flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px',
  },
  listItemTop: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  },
  listItemName: {
    fontSize: '14px', fontWeight: 'bold', color: '#333',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  listItemDate: {
    fontSize: '11px', color: '#999', whiteSpace: 'nowrap', marginLeft: '8px',
  },
  listItemBottom: {
    display: 'flex', alignItems: 'center',
  },
  listItemPreview: {
    fontSize: '12px', color: '#888',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  unreadBadge: {
    position: 'absolute', right: '14px', bottom: '14px',
    backgroundColor: '#06c755', color: '#fff',
    fontSize: '11px', fontWeight: 'bold',
    padding: '1px 7px', borderRadius: '10px', minWidth: '18px',
    textAlign: 'center',
  },
  chatArea: {
    flex: 1, display: 'flex', flexDirection: 'column',
    borderRight: '1px solid #e0e0e0', minWidth: 0,
  },
  chatHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '10px 20px', backgroundColor: '#fff',
    borderBottom: '1px solid #e0e0e0', flexShrink: 0,
  },
  chatHeaderLeft: {
    display: 'flex', alignItems: 'center', gap: '10px',
  },
  chatHeaderName: {
    fontSize: '16px', fontWeight: 'bold', color: '#333',
  },
  chatHeaderActions: {
    display: 'flex', gap: '8px',
  },
  statusBtn: {
    padding: '6px 16px', borderRadius: '20px',
    fontSize: '13px', fontWeight: 'bold', cursor: 'pointer',
    border: '2px solid transparent', backgroundColor: 'transparent',
  },
  statusBtnAction: {
    border: '2px solid #06c755', color: '#06c755', backgroundColor: 'transparent',
  },
  statusBtnActionActive: {
    border: '2px solid #06c755', color: '#fff', backgroundColor: '#06c755',
  },
  statusBtnResolved: {
    border: '2px solid #aaa', color: '#aaa', backgroundColor: 'transparent',
  },
  statusBtnResolvedActive: {
    border: '2px solid #aaa', color: '#fff', backgroundColor: '#aaa',
  },
  chatThread: {
    flex: 1, overflowY: 'auto', padding: '16px 20px',
    backgroundColor: '#7494C0', display: 'flex',
    flexDirection: 'column', gap: '12px',
  },
  loadMoreRow: {
    textAlign: 'center', padding: '8px 0',
  },
  loadMoreBtn: {
    padding: '6px 16px', fontSize: '12px', color: 'rgba(255,255,255,0.9)',
    backgroundColor: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)',
    borderRadius: '16px', cursor: 'pointer',
  },
  emptyChat: {
    textAlign: 'center', color: 'rgba(255,255,255,0.7)',
    fontSize: '14px', marginTop: '40px',
  },
  msgRow: {
    display: 'flex', gap: '8px',
  },
  msgAvatar: {
    width: '36px', height: '36px', borderRadius: '50%',
    objectFit: 'cover', flexShrink: 0, alignSelf: 'flex-end',
  },
  senderName: {
    fontSize: '11px', color: 'rgba(255,255,255,0.8)',
    marginBottom: '2px',
  },
  bubbleSent: {
    padding: '10px 14px', borderRadius: '18px 4px 18px 18px',
    backgroundColor: '#6B5CE7', color: '#fff',
    fontSize: '14px', lineHeight: '1.5',
    whiteSpace: 'pre-wrap', wordBreak: 'break-word',
  },
  bubbleReceived: {
    padding: '10px 14px', borderRadius: '4px 18px 18px 18px',
    backgroundColor: '#fff', color: '#333',
    fontSize: '14px', lineHeight: '1.5',
    whiteSpace: 'pre-wrap', wordBreak: 'break-word',
    boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
  },
  msgTime: {
    fontSize: '11px', color: 'rgba(255,255,255,0.6)',
    whiteSpace: 'nowrap', flexShrink: 0,
  },
  inputArea: {
    padding: '8px 16px 12px', backgroundColor: '#fff',
    borderTop: '1px solid #e0e0e0', flexShrink: 0,
  },
  inputHint: {
    fontSize: '11px', color: '#aaa', marginBottom: '6px',
  },
  inputRow: {
    display: 'flex', alignItems: 'flex-end', gap: '8px',
  },
  textInput: {
    flex: 1, border: '1px solid #ddd', borderRadius: '8px',
    padding: '10px 12px', fontSize: '14px', fontFamily: 'inherit',
    resize: 'none', outline: 'none', lineHeight: '1.5',
    maxHeight: '100px', overflowY: 'auto',
  },
  sendBtn: {
    padding: '10px 24px', backgroundColor: '#06c755',
    color: '#fff', border: 'none', borderRadius: '8px',
    fontSize: '14px', fontWeight: 'bold', cursor: 'pointer',
    whiteSpace: 'nowrap', flexShrink: 0,
  },
  sendBtnDisabled: {
    backgroundColor: '#ccc', cursor: 'not-allowed',
  },
  sidebar: {
    width: '300px', minWidth: '300px', display: 'flex', flexDirection: 'column',
    backgroundColor: '#fff', overflow: 'hidden',
  },
  profileSection: {
    padding: '24px 20px 16px', textAlign: 'center',
    borderBottom: '1px solid #e0e0e0',
  },
  largeAvatar: {
    width: '80px', height: '80px', borderRadius: '50%',
    objectFit: 'cover', display: 'block', margin: '0 auto 12px',
  },
  displayName: {
    fontSize: '18px', fontWeight: 'bold', color: '#333',
    marginBottom: '12px',
  },
  tagSection: {
    display: 'flex', flexWrap: 'wrap', gap: '6px',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: '4px',
  },
  tagBadge: {
    display: 'inline-flex', alignItems: 'center', gap: '4px',
    padding: '4px 12px', backgroundColor: '#E3F2FD',
    color: '#1565C0', borderRadius: '12px',
    fontSize: '12px', fontWeight: 'bold',
  },
  tagRemove: {
    cursor: 'pointer', marginLeft: '2px', fontWeight: 'normal',
    fontSize: '14px',
  },
  editIcon: {
    background: 'none', border: 'none', cursor: 'pointer',
    fontSize: '14px', padding: '2px',
  },
  tagInputRow: {
    display: 'flex', gap: '6px', marginTop: '8px',
    justifyContent: 'center',
  },
  tagInputField: {
    padding: '4px 10px', fontSize: '13px', border: '1px solid #ddd',
    borderRadius: '6px', outline: 'none', width: '140px',
  },
  tagAddBtn: {
    padding: '4px 12px', fontSize: '13px', backgroundColor: '#06c755',
    color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer',
  },
  assigneeSection: {
    display: 'flex', alignItems: 'center', gap: '12px',
    padding: '12px 20px', borderBottom: '1px solid #e0e0e0',
  },
  assigneeLabel: {
    fontSize: '13px', color: '#999', flexShrink: 0, width: '56px',
  },
  assigneeValueRow: {
    display: 'flex', alignItems: 'center', gap: '8px', flex: 1,
  },
  assigneeValue: {
    fontSize: '14px', color: '#333',
  },
  assigneeEditRow: {
    display: 'flex', gap: '6px', flex: 1,
  },
  assigneeInput: {
    flex: 1, padding: '4px 10px', fontSize: '13px',
    border: '1px solid #ddd', borderRadius: '6px', outline: 'none',
  },
  assigneeSaveBtn: {
    padding: '4px 12px', fontSize: '13px', backgroundColor: '#06c755',
    color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer',
  },
  tabBar: {
    display: 'flex', borderBottom: '2px solid #e0e0e0', flexShrink: 0,
  },
  tab: {
    flex: 1, padding: '12px 0', textAlign: 'center',
    fontSize: '14px', fontWeight: 'bold', cursor: 'pointer',
    color: '#999', backgroundColor: 'transparent', border: 'none',
    borderBottom: '2px solid transparent', marginBottom: '-2px',
  },
  tabActive: {
    color: '#333', borderBottomColor: '#06c755',
  },
  tabCount: {
    display: 'inline-block', marginLeft: '4px',
    padding: '1px 6px', backgroundColor: '#06c755',
    color: '#fff', borderRadius: '10px', fontSize: '11px',
  },
  tabContent: {
    flex: 1, overflowY: 'auto', padding: '0',
  },
  noteHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '12px 16px', borderBottom: '1px solid #f0f0f0',
  },
  noteCount: {
    fontSize: '13px', color: '#999',
  },
  noteAddBtn: {
    fontSize: '13px', color: '#06c755', fontWeight: 'bold',
    background: 'none', border: 'none', cursor: 'pointer',
  },
  noteForm: {
    padding: '12px 16px', borderBottom: '1px solid #f0f0f0',
  },
  noteTextarea: {
    width: '100%', padding: '10px', fontSize: '13px',
    border: '1px solid #ddd', borderRadius: '6px',
    fontFamily: 'inherit', resize: 'vertical', outline: 'none',
    boxSizing: 'border-box',
  },
  noteFormActions: {
    display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px',
  },
  noteCancelBtn: {
    padding: '6px 14px', fontSize: '13px', backgroundColor: '#f5f5f5',
    color: '#666', border: 'none', borderRadius: '6px', cursor: 'pointer',
  },
  noteSaveBtn: {
    padding: '6px 14px', fontSize: '13px', backgroundColor: '#06c755',
    color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer',
  },
  emptyNotes: {
    padding: '32px 20px', textAlign: 'center',
  },
  emptyNotesIcon: {
    fontSize: '24px', marginBottom: '8px',
  },
  emptyNotesTitle: {
    fontSize: '14px', fontWeight: 'bold', color: '#333', marginBottom: '8px',
  },
  emptyNotesDesc: {
    fontSize: '12px', color: '#999', lineHeight: '1.6',
  },
  noteList: {
    display: 'flex', flexDirection: 'column',
  },
  noteItem: {
    padding: '12px 16px', borderBottom: '1px solid #f0f0f0',
  },
  noteContent: {
    fontSize: '13px', color: '#333', lineHeight: '1.5',
    whiteSpace: 'pre-wrap', wordBreak: 'break-word',
  },
  noteMeta: {
    fontSize: '11px', color: '#aaa', marginTop: '6px',
  },
  noteDeleteBtn: {
    fontSize: '11px', color: '#e53935', background: 'none',
    border: 'none', cursor: 'pointer', marginLeft: '8px',
  },
  activityTab: {
    padding: '0',
  },
  emptyActivity: {
    padding: '32px 20px', textAlign: 'center',
    color: '#999', fontSize: '14px',
  },
  activityItem: {
    borderBottom: '1px solid #f0f0f0',
  },
  activityHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '10px 16px', backgroundColor: '#fafafa',
    borderBottom: '1px solid #f0f0f0',
  },
  activityFormName: {
    fontSize: '13px', fontWeight: 'bold', color: '#333',
  },
  activityDate: {
    fontSize: '11px', color: '#999',
  },
  activityTable: {
    width: '100%', borderCollapse: 'collapse',
  },
  activityKey: {
    padding: '6px 16px', fontSize: '12px', color: '#666',
    width: '35%', borderBottom: '1px solid #f5f5f5', backgroundColor: '#fafafa',
  },
  activityValue: {
    padding: '6px 16px', fontSize: '12px', color: '#333',
    borderBottom: '1px solid #f5f5f5',
  },
}
