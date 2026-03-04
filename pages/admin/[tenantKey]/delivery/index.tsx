import { useState, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'

interface Segment {
  id: string
  name: string
  description: string
}

export default function DeliveryPage() {
  const router = useRouter()
  const tenantKey = router.query.tenantKey as string

  const [segments, setSegments] = useState<Segment[]>([])
  const [messageText, setMessageText] = useState('')
  const [segmentId, setSegmentId] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<any>(null)

  useEffect(() => {
    if (tenantKey) fetchSegments()
  }, [tenantKey])

  const fetchSegments = async () => {
    try {
      const response = await fetch(`/api/segments?tenantKey=${tenantKey}`)
      const data = await response.json()
      setSegments(data.segments || [])
    } catch (error) {
      console.error('Error fetching segments:', error)
    }
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tenantKey) { setResult({ success: false, error: 'テナントが見つかりません' }); return }

    setSending(true)
    setResult(null)

    try {
      const response = await fetch('/api/delivery/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantKey,
          segmentId: segmentId || null,
          messageType: 'text',
          messageContent: { text: messageText },
        }),
      })
      const data = await response.json()
      if (response.ok) {
        setResult({ success: true, ...data })
        setMessageText('')
      } else {
        setResult({ success: false, error: data.error })
      }
    } catch {
      setResult({ success: false, error: 'エラーが発生しました' })
    } finally {
      setSending(false)
    }
  }

  if (!tenantKey) return null

  return (
    <>
      <Head><title>メッセージ配信 - LINE配信システム</title></Head>
      <div style={styles.container}>
        <header style={styles.header}>
          <Link href={`/admin/${tenantKey}`} style={styles.backLink}>← ダッシュボード</Link>
          <div style={styles.headerTop}>
            <h1 style={styles.title}>メッセージ配信</h1>
            <Link href={`/admin/${tenantKey}/delivery/history`} style={styles.historyLink}>配信履歴を見る</Link>
          </div>
        </header>

        <div style={styles.content}>
          <div style={styles.formCard}>
            <h2 style={styles.cardTitle}>新規配信</h2>
            <form onSubmit={handleSend} style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>配信先セグメント</label>
                <select value={segmentId} onChange={(e) => setSegmentId(e.target.value)} style={styles.select}>
                  <option value="">全ユーザー</option>
                  {segments.map(segment => (
                    <option key={segment.id} value={segment.id}>{segment.name}</option>
                  ))}
                </select>
                <small style={styles.helpText}>セグメントを選択しない場合、全ユーザーに配信されます</small>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>メッセージ内容 *</label>
                <textarea value={messageText} onChange={(e) => setMessageText(e.target.value)} required rows={6} placeholder="配信するメッセージを入力してください" style={styles.textarea} />
              </div>

              <button type="submit" disabled={sending} style={{ ...styles.button, ...(sending ? styles.buttonDisabled : {}) }}>
                {sending ? '配信中...' : '配信する'}
              </button>
            </form>

            {result && (
              <div style={{ ...styles.resultBox, ...(result.success ? styles.resultSuccess : styles.resultError) }}>
                {result.success ? (
                  <>
                    <h3>配信完了</h3>
                    <p>配信ID: {result.deliveryId}</p>
                    <p>対象ユーザー数: {result.totalRecipients}</p>
                    <p>成功: {result.successCount} / 失敗: {result.failureCount}</p>
                  </>
                ) : (
                  <><h3>配信失敗</h3><p>{result.error}</p></>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

const styles = {
  container: { maxWidth: '1200px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif' },
  header: { marginBottom: '30px' },
  backLink: { color: '#06c755', textDecoration: 'none', fontSize: '14px', display: 'inline-block', marginBottom: '10px' },
  headerTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: '28px', color: '#333', margin: 0 },
  historyLink: { padding: '10px 20px', backgroundColor: '#06c755', color: '#fff', textDecoration: 'none', borderRadius: '4px', fontSize: '14px', fontWeight: 'bold' as const },
  content: { display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' },
  formCard: { backgroundColor: '#fff', padding: '30px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' },
  cardTitle: { fontSize: '20px', marginTop: 0, marginBottom: '20px', color: '#333' },
  form: { display: 'flex', flexDirection: 'column' as const, gap: '20px' },
  formGroup: { display: 'flex', flexDirection: 'column' as const, gap: '8px' },
  label: { fontWeight: 'bold' as const, fontSize: '14px', color: '#333' },
  select: { padding: '12px', fontSize: '14px', border: '1px solid #ddd', borderRadius: '4px' },
  textarea: { padding: '12px', fontSize: '14px', border: '1px solid #ddd', borderRadius: '4px', fontFamily: 'inherit', resize: 'vertical' as const },
  helpText: { fontSize: '12px', color: '#666' },
  button: { padding: '16px', fontSize: '16px', fontWeight: 'bold' as const, color: '#fff', backgroundColor: '#06c755', border: 'none', borderRadius: '4px', cursor: 'pointer' },
  buttonDisabled: { backgroundColor: '#ccc', cursor: 'not-allowed' },
  resultBox: { marginTop: '20px', padding: '20px', borderRadius: '4px' },
  resultSuccess: { backgroundColor: '#e8f5e9', color: '#2e7d32' },
  resultError: { backgroundColor: '#ffebee', color: '#c62828' },
}
