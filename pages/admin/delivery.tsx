import { useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'

export default function DeliveryPage() {
  const [messageText, setMessageText] = useState('')
  const [segmentId, setSegmentId] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<any>(null)

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)
    setResult(null)

    try {
      const response = await fetch('/api/delivery/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          segmentId: segmentId || null,
          messageType: 'text',
          messageContent: {
            text: messageText,
          },
        }),
      })

      const data = await response.json()
      
      if (response.ok) {
        setResult({
          success: true,
          ...data,
        })
        setMessageText('')
      } else {
        setResult({
          success: false,
          error: data.error,
        })
      }
    } catch (error) {
      setResult({
        success: false,
        error: 'エラーが発生しました',
      })
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <Head>
        <title>メッセージ配信 - LINE配信システム</title>
      </Head>

      <div style={styles.container}>
        <header style={styles.header}>
          <Link href="/admin" style={styles.backLink}>← 管理画面に戻る</Link>
          <h1 style={styles.title}>メッセージ配信</h1>
        </header>

        <div style={styles.content}>
          <div style={styles.formCard}>
            <h2 style={styles.cardTitle}>新規配信</h2>
            
            <form onSubmit={handleSend} style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>配信先セグメント</label>
                <select
                  value={segmentId}
                  onChange={(e) => setSegmentId(e.target.value)}
                  style={styles.select}
                >
                  <option value="">全ユーザー</option>
                  <option value="segment1">セグメント1（例）</option>
                  <option value="segment2">セグメント2（例）</option>
                </select>
                <small style={styles.helpText}>
                  セグメントを選択しない場合、全ユーザーに配信されます
                </small>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>メッセージ内容 *</label>
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  required
                  rows={6}
                  placeholder="配信するメッセージを入力してください"
                  style={styles.textarea}
                />
              </div>

              <button
                type="submit"
                disabled={sending}
                style={{
                  ...styles.button,
                  ...(sending ? styles.buttonDisabled : {})
                }}
              >
                {sending ? '配信中...' : '配信する'}
              </button>
            </form>

            {result && (
              <div style={{
                ...styles.resultBox,
                ...(result.success ? styles.resultSuccess : styles.resultError)
              }}>
                {result.success ? (
                  <>
                    <h3>配信完了</h3>
                    <p>配信ID: {result.deliveryId}</p>
                    <p>対象ユーザー数: {result.totalRecipients}</p>
                    <p>成功: {result.successCount} / 失敗: {result.failureCount}</p>
                  </>
                ) : (
                  <>
                    <h3>配信失敗</h3>
                    <p>{result.error}</p>
                  </>
                )}
              </div>
            )}
          </div>

          <div style={styles.linkCard}>
            <h3 style={styles.cardTitle}>配信履歴</h3>
            <p>過去の配信履歴を確認できます</p>
            <Link href="/admin/delivery/history" style={styles.linkButton}>
              配信履歴を見る →
            </Link>
          </div>
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
  content: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr',
    gap: '20px',
  },
  formCard: {
    backgroundColor: '#fff',
    padding: '30px',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  linkCard: {
    backgroundColor: '#fff',
    padding: '30px',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    height: 'fit-content',
  },
  cardTitle: {
    fontSize: '20px',
    marginTop: 0,
    marginBottom: '20px',
    color: '#333',
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  label: {
    fontWeight: 'bold' as const,
    fontSize: '14px',
    color: '#333',
  },
  select: {
    padding: '12px',
    fontSize: '14px',
    border: '1px solid #ddd',
    borderRadius: '4px',
  },
  textarea: {
    padding: '12px',
    fontSize: '14px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontFamily: 'inherit',
    resize: 'vertical' as const,
  },
  helpText: {
    fontSize: '12px',
    color: '#666',
  },
  button: {
    padding: '16px',
    fontSize: '16px',
    fontWeight: 'bold' as const,
    color: '#fff',
    backgroundColor: '#06c755',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
    cursor: 'not-allowed',
  },
  linkButton: {
    display: 'inline-block',
    padding: '12px 24px',
    backgroundColor: '#06c755',
    color: '#fff',
    textDecoration: 'none',
    borderRadius: '4px',
    marginTop: '10px',
  },
  resultBox: {
    marginTop: '20px',
    padding: '20px',
    borderRadius: '4px',
  },
  resultSuccess: {
    backgroundColor: '#e8f5e9',
    color: '#2e7d32',
  },
  resultError: {
    backgroundColor: '#ffebee',
    color: '#c62828',
  },
}
