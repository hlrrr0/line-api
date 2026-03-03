import { useState, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'

interface Tenant {
  id: string
  tenant_key: string
  name: string
}

interface DeliveryHistory {
  id: string
  segment_id: string | null
  message_type: string
  message_content: any
  status: string
  total_recipients: number
  success_count: number
  failure_count: number
  sent_at: string
  created_at: string
  segments?: { name: string }
}

export default function DeliveryHistoryPage() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [selectedTenantKey, setSelectedTenantKey] = useState('')
  const [history, setHistory] = useState<DeliveryHistory[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTenants()
  }, [])

  useEffect(() => {
    if (selectedTenantKey) {
      fetchHistory()
    }
  }, [selectedTenantKey])

  const fetchTenants = async () => {
    try {
      const response = await fetch('/api/admin/tenants')
      const data = await response.json()
      setTenants(data.tenants || [])
      if (data.tenants && data.tenants.length > 0) {
        setSelectedTenantKey(data.tenants[0].tenant_key)
      }
    } catch (error) {
      console.error('Error fetching tenants:', error)
    }
  }

  const fetchHistory = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/delivery/history?tenantKey=${selectedTenantKey}`)
      const data = await response.json()
      setHistory(data.history || [])
    } catch (error) {
      console.error('Error fetching history:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#4caf50'
      case 'processing':
        return '#ff9800'
      case 'failed':
        return '#f44336'
      default:
        return '#999'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return '完了'
      case 'processing':
        return '処理中'
      case 'failed':
        return '失敗'
      default:
        return status
    }
  }

  return (
    <>
      <Head>
        <title>配信履歴 - LINE配信システム</title>
      </Head>

      <div style={styles.container}>
        <header style={styles.header}>
          <Link href="/admin" style={styles.backLink}>← 管理画面に戻る</Link>
          <h1 style={styles.title}>配信履歴</h1>
        </header>

        <div style={styles.tenantSelector}>
          <label style={styles.label}>テナント選択:</label>
          <select
            value={selectedTenantKey}
            onChange={(e) => setSelectedTenantKey(e.target.value)}
            style={styles.select}
          >
            {tenants.map(tenant => (
              <option key={tenant.id} value={tenant.tenant_key}>
                {tenant.name}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div style={styles.loading}>読み込み中...</div>
        ) : (
          <div style={styles.content}>
            {history.length === 0 ? (
              <div style={styles.empty}>配信履歴がありません</div>
            ) : (
              <div style={styles.historyList}>
                {history.map(item => (
                  <div key={item.id} style={styles.historyCard}>
                    <div style={styles.historyHeader}>
                      <div style={styles.historyInfo}>
                        <h3 style={styles.historyTitle}>
                          {item.segments ? item.segments.name : '全ユーザー配信'}
                        </h3>
                        <span style={{
                          ...styles.statusBadge,
                          backgroundColor: getStatusColor(item.status),
                        }}>
                          {getStatusText(item.status)}
                        </span>
                      </div>
                      <div style={styles.historyDate}>
                        {new Date(item.created_at).toLocaleString('ja-JP')}
                      </div>
                    </div>

                    <div style={styles.historyContent}>
                      <div style={styles.messagePreview}>
                        <strong>メッセージ:</strong>{' '}
                        {item.message_content.text || 'メッセージ内容なし'}
                      </div>
                    </div>

                    <div style={styles.historyStats}>
                      <div style={styles.stat}>
                        <div style={styles.statValue}>{item.total_recipients}</div>
                        <div style={styles.statLabel}>送信対象</div>
                      </div>
                      <div style={styles.stat}>
                        <div style={{...styles.statValue, color: '#4caf50'}}>
                          {item.success_count}
                        </div>
                        <div style={styles.statLabel}>成功</div>
                      </div>
                      <div style={styles.stat}>
                        <div style={{...styles.statValue, color: '#f44336'}}>
                          {item.failure_count}
                        </div>
                        <div style={styles.statLabel}>失敗</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
  tenantSelector: {
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  label: {
    fontSize: '14px',
    fontWeight: 'bold' as const,
  },
  select: {
    padding: '8px 12px',
    fontSize: '14px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    minWidth: '200px',
  },
  loading: {
    textAlign: 'center' as const,
    padding: '40px',
    fontSize: '16px',
    color: '#666',
  },
  empty: {
    textAlign: 'center' as const,
    padding: '40px',
    fontSize: '16px',
    color: '#666',
    backgroundColor: '#fff',
    borderRadius: '8px',
  },
  content: {
    marginTop: '20px',
  },
  historyList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '15px',
  },
  historyCard: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  historyHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '15px',
  },
  historyInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
  },
  historyTitle: {
    fontSize: '18px',
    margin: 0,
    color: '#333',
  },
  statusBadge: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 'bold' as const,
    color: '#fff',
  },
  historyDate: {
    fontSize: '14px',
    color: '#999',
  },
  historyContent: {
    marginBottom: '15px',
  },
  messagePreview: {
    fontSize: '14px',
    color: '#666',
    backgroundColor: '#f5f5f5',
    padding: '10px',
    borderRadius: '4px',
  },
  historyStats: {
    display: 'flex',
    gap: '30px',
    paddingTop: '15px',
    borderTop: '1px solid #eee',
  },
  stat: {
    textAlign: 'center' as const,
  },
  statValue: {
    fontSize: '24px',
    fontWeight: 'bold' as const,
    color: '#333',
  },
  statLabel: {
    fontSize: '12px',
    color: '#999',
    marginTop: '5px',
  },
}
