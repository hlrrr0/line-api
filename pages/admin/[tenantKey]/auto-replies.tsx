import { useState, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'

interface AutoReplyRule {
  id: string
  keyword: string
  match_type: 'exact' | 'contains' | 'starts_with'
  reply_messages: string[]
  is_active: boolean
  priority: number
  created_at: string
}

const MATCH_TYPE_LABELS: Record<string, string> = {
  exact: '完全一致',
  contains: '部分一致',
  starts_with: '前方一致',
}

export default function AutoRepliesPage() {
  const router = useRouter()
  const tenantKey = router.query.tenantKey as string

  const [rules, setRules] = useState<AutoReplyRule[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // 編集フォーム
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formKeyword, setFormKeyword] = useState('')
  const [formMatchType, setFormMatchType] = useState<string>('contains')
  const [formMessages, setFormMessages] = useState<string[]>([''])
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    if (tenantKey) fetchRules()
  }, [tenantKey])

  const fetchRules = async () => {
    try {
      const res = await fetch(`/api/admin/auto-replies?tenantKey=${tenantKey}`)
      const data = await res.json()
      setRules(data.rules || [])
    } catch {
      // エラー
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setEditingId(null)
    setFormKeyword('')
    setFormMatchType('contains')
    setFormMessages([''])
    setShowForm(false)
  }

  const handleEdit = (rule: AutoReplyRule) => {
    setEditingId(rule.id)
    setFormKeyword(rule.keyword)
    setFormMatchType(rule.match_type)
    setFormMessages(rule.reply_messages.length > 0 ? [...rule.reply_messages] : [''])
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!formKeyword.trim()) return
    const filtered = formMessages.filter(m => m.trim() !== '')
    if (filtered.length === 0) return

    setSaving(true)
    try {
      if (editingId) {
        await fetch(`/api/admin/auto-replies?tenantKey=${tenantKey}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingId,
            keyword: formKeyword,
            match_type: formMatchType,
            reply_messages: filtered,
          }),
        })
      } else {
        await fetch(`/api/admin/auto-replies?tenantKey=${tenantKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            keyword: formKeyword,
            match_type: formMatchType,
            reply_messages: filtered,
          }),
        })
      }
      resetForm()
      fetchRules()
    } catch {
      alert('保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (rule: AutoReplyRule) => {
    try {
      await fetch(`/api/admin/auto-replies?tenantKey=${tenantKey}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: rule.id, is_active: !rule.is_active }),
      })
      fetchRules()
    } catch {
      // エラー
    }
  }

  const handleDelete = async (ruleId: string) => {
    if (!confirm('このルールを削除しますか？')) return
    try {
      await fetch(`/api/admin/auto-replies?tenantKey=${tenantKey}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: ruleId }),
      })
      fetchRules()
    } catch {
      // エラー
    }
  }

  const addMessage = () => {
    if (formMessages.length < 5) {
      setFormMessages([...formMessages, ''])
    }
  }

  const removeMessage = (index: number) => {
    if (formMessages.length > 1) {
      setFormMessages(formMessages.filter((_, i) => i !== index))
    }
  }

  const updateMessage = (index: number, value: string) => {
    const updated = [...formMessages]
    updated[index] = value
    setFormMessages(updated)
  }

  if (loading) {
    return <div style={s.loading}>読み込み中...</div>
  }

  return (
    <>
      <Head>
        <title>自動返信設定 - LINE配信システム</title>
      </Head>
      <div style={s.page}>
        <div style={s.header}>
          <Link href={`/admin/${tenantKey}`} style={s.backLink}>← ダッシュボード</Link>
          <h1 style={s.title}>自動返信設定</h1>
          <p style={s.subtitle}>特定のキーワードを受信した際に自動でメッセージを返信します</p>
        </div>

        <div style={s.content}>
          {/* ルール追加ボタン */}
          {!showForm && (
            <button style={s.addBtn} onClick={() => { resetForm(); setShowForm(true) }}>
              + 新しいルールを追加
            </button>
          )}

          {/* 編集フォーム */}
          {showForm && (
            <div style={s.formCard}>
              <h3 style={s.formTitle}>{editingId ? 'ルールを編集' : '新しいルール'}</h3>

              <div style={s.formGroup}>
                <label style={s.label}>キーワード</label>
                <input
                  value={formKeyword}
                  onChange={e => setFormKeyword(e.target.value)}
                  placeholder="例: 営業時間"
                  style={s.input}
                />
              </div>

              <div style={s.formGroup}>
                <label style={s.label}>マッチ方法</label>
                <div style={s.matchTypeRow}>
                  {(['contains', 'exact', 'starts_with'] as const).map(type => (
                    <label key={type} style={s.radioLabel}>
                      <input
                        type="radio"
                        name="matchType"
                        value={type}
                        checked={formMatchType === type}
                        onChange={e => setFormMatchType(e.target.value)}
                      />
                      <span style={s.radioText}>{MATCH_TYPE_LABELS[type]}</span>
                    </label>
                  ))}
                </div>
                <p style={s.matchHint}>
                  {formMatchType === 'exact' && '送信されたメッセージがキーワードと完全に一致した場合に返信します'}
                  {formMatchType === 'contains' && '送信されたメッセージにキーワードが含まれている場合に返信します'}
                  {formMatchType === 'starts_with' && '送信されたメッセージがキーワードで始まる場合に返信します'}
                </p>
              </div>

              <div style={s.formGroup}>
                <label style={s.label}>返信メッセージ（最大5件）</label>
                {formMessages.map((msg, i) => (
                  <div key={i} style={s.messageRow}>
                    <div style={s.messageBubbleNum}>{i + 1}</div>
                    <textarea
                      value={msg}
                      onChange={e => updateMessage(i, e.target.value)}
                      placeholder="返信メッセージを入力..."
                      rows={3}
                      style={s.textarea}
                    />
                    {formMessages.length > 1 && (
                      <button style={s.removeBtn} onClick={() => removeMessage(i)}>×</button>
                    )}
                  </div>
                ))}
                {formMessages.length < 5 && (
                  <button style={s.addMsgBtn} onClick={addMessage}>+ 吹き出しを追加</button>
                )}
              </div>

              <div style={s.formActions}>
                <button style={s.cancelBtn} onClick={resetForm}>キャンセル</button>
                <button
                  style={{
                    ...s.saveBtn,
                    ...(saving || !formKeyword.trim() ? s.saveBtnDisabled : {}),
                  }}
                  onClick={handleSave}
                  disabled={saving || !formKeyword.trim()}
                >
                  {saving ? '保存中...' : '保存'}
                </button>
              </div>
            </div>
          )}

          {/* ルール一覧 */}
          {rules.length === 0 && !showForm ? (
            <div style={s.empty}>
              <p style={s.emptyText}>自動返信ルールがまだありません</p>
              <p style={s.emptySubtext}>「+ 新しいルールを追加」から設定してください</p>
            </div>
          ) : (
            <div style={s.ruleList}>
              {rules.map(rule => (
                <div key={rule.id} style={{ ...s.ruleCard, ...(rule.is_active ? {} : s.ruleInactive) }}>
                  <div style={s.ruleHeader}>
                    <div style={s.ruleHeaderLeft}>
                      <span style={s.keyword}>「{rule.keyword}」</span>
                      <span style={s.matchBadge}>{MATCH_TYPE_LABELS[rule.match_type]}</span>
                      {!rule.is_active && <span style={s.inactiveBadge}>無効</span>}
                    </div>
                    <div style={s.ruleActions}>
                      <button
                        style={rule.is_active ? s.toggleBtnActive : s.toggleBtnInactive}
                        onClick={() => handleToggleActive(rule)}
                      >
                        {rule.is_active ? 'ON' : 'OFF'}
                      </button>
                      <button style={s.editBtn} onClick={() => handleEdit(rule)}>編集</button>
                      <button style={s.deleteBtn} onClick={() => handleDelete(rule.id)}>削除</button>
                    </div>
                  </div>
                  <div style={s.ruleBody}>
                    {rule.reply_messages.map((msg, i) => (
                      <div key={i} style={s.previewBubble}>
                        <span style={s.previewNum}>{i + 1}</span>
                        <span style={s.previewText}>{msg.length > 100 ? msg.slice(0, 100) + '...' : msg}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
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
    minHeight: '100vh', backgroundColor: '#f5f5f5', fontFamily: 'sans-serif',
  },
  header: {
    backgroundColor: '#fff', padding: '24px 32px', borderBottom: '1px solid #e0e0e0',
  },
  backLink: {
    fontSize: '13px', color: '#06c755', textDecoration: 'none',
  },
  title: {
    fontSize: '22px', fontWeight: 'bold', color: '#333', margin: '8px 0 4px',
  },
  subtitle: {
    fontSize: '14px', color: '#888', margin: 0,
  },
  content: {
    maxWidth: '800px', margin: '0 auto', padding: '24px',
  },
  addBtn: {
    width: '100%', padding: '14px', fontSize: '15px', fontWeight: 'bold',
    color: '#06c755', backgroundColor: '#fff', border: '2px dashed #06c755',
    borderRadius: '10px', cursor: 'pointer', marginBottom: '20px',
  },

  // フォーム
  formCard: {
    backgroundColor: '#fff', borderRadius: '10px', padding: '24px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: '20px',
  },
  formTitle: {
    fontSize: '16px', fontWeight: 'bold', color: '#333', margin: '0 0 20px',
  },
  formGroup: {
    marginBottom: '20px',
  },
  label: {
    display: 'block', fontSize: '14px', fontWeight: 'bold', color: '#333',
    marginBottom: '8px',
  },
  input: {
    width: '100%', padding: '10px 14px', fontSize: '14px',
    border: '1px solid #ddd', borderRadius: '8px', outline: 'none',
    boxSizing: 'border-box' as const,
  },
  matchTypeRow: {
    display: 'flex', gap: '20px', marginBottom: '6px',
  },
  radioLabel: {
    display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer',
  },
  radioText: {
    fontSize: '14px', color: '#333',
  },
  matchHint: {
    fontSize: '12px', color: '#999', margin: '4px 0 0',
  },
  messageRow: {
    display: 'flex', gap: '8px', alignItems: 'flex-start', marginBottom: '10px',
  },
  messageBubbleNum: {
    width: '24px', height: '24px', borderRadius: '50%',
    backgroundColor: '#06c755', color: '#fff', fontSize: '12px',
    fontWeight: 'bold', display: 'flex', alignItems: 'center',
    justifyContent: 'center', flexShrink: 0, marginTop: '8px',
  },
  textarea: {
    flex: 1, padding: '10px 14px', fontSize: '14px',
    border: '1px solid #ddd', borderRadius: '8px', outline: 'none',
    fontFamily: 'inherit', resize: 'vertical' as const,
    boxSizing: 'border-box' as const,
  },
  removeBtn: {
    width: '28px', height: '28px', borderRadius: '50%',
    backgroundColor: '#f5f5f5', border: '1px solid #ddd',
    color: '#999', fontSize: '16px', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, marginTop: '8px',
  },
  addMsgBtn: {
    fontSize: '13px', color: '#06c755', fontWeight: 'bold',
    background: 'none', border: 'none', cursor: 'pointer',
    padding: '4px 0',
  },
  formActions: {
    display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px',
  },
  cancelBtn: {
    padding: '10px 24px', fontSize: '14px', backgroundColor: '#f5f5f5',
    color: '#666', border: 'none', borderRadius: '8px', cursor: 'pointer',
  },
  saveBtn: {
    padding: '10px 24px', fontSize: '14px', fontWeight: 'bold',
    backgroundColor: '#06c755', color: '#fff', border: 'none',
    borderRadius: '8px', cursor: 'pointer',
  },
  saveBtnDisabled: {
    backgroundColor: '#ccc', cursor: 'not-allowed',
  },

  // 空状態
  empty: {
    textAlign: 'center' as const, padding: '60px 20px',
    backgroundColor: '#fff', borderRadius: '10px',
  },
  emptyText: {
    fontSize: '16px', color: '#666', margin: '0 0 8px',
  },
  emptySubtext: {
    fontSize: '13px', color: '#999', margin: 0,
  },

  // ルール一覧
  ruleList: {
    display: 'flex', flexDirection: 'column' as const, gap: '12px',
  },
  ruleCard: {
    backgroundColor: '#fff', borderRadius: '10px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden',
  },
  ruleInactive: {
    opacity: 0.6,
  },
  ruleHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '14px 20px', borderBottom: '1px solid #f0f0f0',
  },
  ruleHeaderLeft: {
    display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' as const,
  },
  keyword: {
    fontSize: '15px', fontWeight: 'bold', color: '#333',
  },
  matchBadge: {
    fontSize: '11px', padding: '2px 10px', backgroundColor: '#E3F2FD',
    color: '#1565C0', borderRadius: '10px', fontWeight: 'bold',
  },
  inactiveBadge: {
    fontSize: '11px', padding: '2px 10px', backgroundColor: '#f5f5f5',
    color: '#999', borderRadius: '10px',
  },
  ruleActions: {
    display: 'flex', gap: '8px', alignItems: 'center',
  },
  toggleBtnActive: {
    padding: '4px 14px', fontSize: '12px', fontWeight: 'bold',
    backgroundColor: '#06c755', color: '#fff', border: 'none',
    borderRadius: '12px', cursor: 'pointer',
  },
  toggleBtnInactive: {
    padding: '4px 14px', fontSize: '12px', fontWeight: 'bold',
    backgroundColor: '#e0e0e0', color: '#666', border: 'none',
    borderRadius: '12px', cursor: 'pointer',
  },
  editBtn: {
    padding: '4px 12px', fontSize: '12px', color: '#1976D2',
    backgroundColor: '#E3F2FD', border: 'none', borderRadius: '6px',
    cursor: 'pointer',
  },
  deleteBtn: {
    padding: '4px 12px', fontSize: '12px', color: '#e53935',
    backgroundColor: '#FFEBEE', border: 'none', borderRadius: '6px',
    cursor: 'pointer',
  },
  ruleBody: {
    padding: '12px 20px',
  },
  previewBubble: {
    display: 'flex', gap: '10px', alignItems: 'flex-start',
    padding: '8px 0',
  },
  previewNum: {
    width: '20px', height: '20px', borderRadius: '50%',
    backgroundColor: '#e0e0e0', color: '#666', fontSize: '11px',
    fontWeight: 'bold', display: 'flex', alignItems: 'center',
    justifyContent: 'center', flexShrink: 0,
  },
  previewText: {
    fontSize: '13px', color: '#555', lineHeight: '1.5',
    whiteSpace: 'pre-wrap' as const, wordBreak: 'break-word' as const,
  },
}
