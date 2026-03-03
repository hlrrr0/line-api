import { useState, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'

interface User {
  id: string
  display_name: string
  line_user_id: string
  picture_url?: string
}

interface FormResponse {
  id: string
  user_id: string
  form_data: Record<string, any>
  created_at: string
  users?: User
}

export default function ResponseDetailPage() {
  const router = useRouter()
  const { id } = router.query

  const [response, setResponse] = useState<FormResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) {
      fetchResponseDetail()
    }
  }, [id])

  const fetchResponseDetail = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/responses/${id}`)
      const data = await res.json()
      
      if (res.ok) {
        setResponse(data.response)
      } else {
        console.error('Error:', data.error)
      }
    } catch (error) {
      console.error('Error fetching response detail:', error)
    } finally {
      setLoading(false)
    }
  }

  const renderFieldValue = (value: any): string => {
    if (Array.isArray(value)) {
      return value.join(', ')
    }
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value, null, 2)
    }
    return String(value || '-')
  }

  if (loading) {
    return (
      <div style={styles.loading}>
        <p>読み込み中...</p>
      </div>
    )
  }

  if (!response) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>
          <h2>回答が見つかりません</h2>
          <Link href="/admin/responses" style={styles.backLink}>
            ← 回答一覧に戻る
          </Link>
        </div>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>回答詳細 - LINE配信システム</title>
      </Head>

      <div style={styles.container}>
        <header style={styles.header}>
          <Link href="/admin/responses" style={styles.backLink}>
            ← 回答一覧に戻る
          </Link>
          <h1 style={styles.title}>回答詳細</h1>
        </header>

        {/* ユーザー情報 */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>ユーザー情報</h2>
          <div style={styles.card}>
            <div style={styles.userInfo}>
              {response.users?.picture_url && (
                <img 
                  src={response.users.picture_url} 
                  alt="User avatar" 
                  style={styles.avatar}
                />
              )}
              <div style={styles.userDetails}>
                <div style={styles.infoRow}>
                  <span style={styles.label}>表示名:</span>
                  <span style={styles.value}>{response.users?.display_name || '未設定'}</span>
                </div>
                <div style={styles.infoRow}>
                  <span style={styles.label}>LINE ID:</span>
                  <span style={styles.value}>{response.users?.line_user_id || '-'}</span>
                </div>
                <div style={styles.infoRow}>
                  <span style={styles.label}>回答日時:</span>
                  <span style={styles.value}>
                    {new Date(response.created_at).toLocaleString('ja-JP')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* フォーム回答 */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>フォーム回答</h2>
          <div style={styles.card}>
            {Object.keys(response.form_data).length === 0 ? (
              <div style={styles.empty}>回答データがありません</div>
            ) : (
              <table style={styles.responseTable}>
                <tbody>
                  {Object.entries(response.form_data).map(([key, value]) => (
                    <tr key={key} style={styles.responseRow}>
                      <td style={styles.labelCell}>{key}</td>
                      <td style={styles.valueCell}>
                        {renderFieldValue(value)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* JSON表示（開発者向け） */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Raw Data（JSON）</h2>
          <div style={styles.card}>
            <pre style={styles.jsonPre}>
              {JSON.stringify(response.form_data, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </>
  )
}

const styles = {
  container: {
    maxWidth: '1000px',
    margin: '0 auto',
    padding: '20px',
    fontFamily: 'sans-serif',
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    fontFamily: 'sans-serif',
  },
  error: {
    textAlign: 'center' as const,
    padding: '40px',
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
  section: {
    marginBottom: '30px',
  },
  sectionTitle: {
    fontSize: '18px',
    color: '#333',
    marginBottom: '15px',
    fontWeight: 'bold' as const,
  },
  card: {
    backgroundColor: '#fff',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  userInfo: {
    display: 'flex',
    gap: '20px',
    alignItems: 'flex-start',
  },
  avatar: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    objectFit: 'cover' as const,
  },
  userDetails: {
    flex: 1,
  },
  infoRow: {
    display: 'flex',
    padding: '10px 0',
    borderBottom: '1px solid #eee',
  },
  label: {
    fontSize: '14px',
    color: '#666',
    fontWeight: 'bold' as const,
    minWidth: '120px',
  },
  value: {
    fontSize: '14px',
    color: '#333',
    flex: 1,
  },
  responseTable: {
    width: '100%',
    borderCollapse: 'collapse' as const,
  },
  responseRow: {
    borderBottom: '1px solid #eee',
  },
  labelCell: {
    padding: '16px',
    fontSize: '14px',
    fontWeight: 'bold' as const,
    color: '#666',
    backgroundColor: '#f9f9f9',
    width: '30%',
    verticalAlign: 'top' as const,
  },
  valueCell: {
    padding: '16px',
    fontSize: '14px',
    color: '#333',
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'break-word' as const,
  },
  empty: {
    textAlign: 'center' as const,
    padding: '20px',
    color: '#999',
  },
  jsonPre: {
    backgroundColor: '#f5f5f5',
    padding: '15px',
    borderRadius: '4px',
    fontSize: '12px',
    overflow: 'auto',
    maxHeight: '400px',
    margin: 0,
  },
}
