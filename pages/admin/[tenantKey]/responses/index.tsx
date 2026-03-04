import { useState, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'

interface User {
  id: string
  display_name: string
  line_user_id: string
}

interface FormResponse {
  id: string
  user_id: string
  form_data: any
  created_at: string
  users?: User
}

interface FormField {
  id: string
  label: string
  type: string
  options?: { value: string; label: string }[]
}

interface FormDefinition {
  id: string
  fields: FormField[]
}

export default function ResponsesPage() {
  const router = useRouter()
  const tenantKey = router.query.tenantKey as string
  const [responses, setResponses] = useState<FormResponse[]>([])
  const [formDefinitions, setFormDefinitions] = useState<FormDefinition[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (tenantKey) fetchResponses()
  }, [tenantKey])

  const fetchResponses = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/responses?tenantKey=${tenantKey}`)
      const data = await response.json()
      setResponses(data.responses || [])
      setFormDefinitions(data.formDefinitions || [])
    } catch (error) {
      console.error('Error fetching responses:', error)
    } finally {
      setLoading(false)
    }
  }

  const findFormDefinition = (formData: any): FormDefinition | undefined => {
    const keys = Object.keys(formData || {})
    return formDefinitions
      .map(def => {
        const fieldIds = def.fields.map(f => f.id)
        const matches = keys.filter(k => fieldIds.includes(k)).length
        return { def, matches }
      })
      .filter(({ matches }) => matches > 0)
      .sort((a, b) => b.matches - a.matches)[0]?.def
  }

  const getValueByLabel = (formData: any, labelKeyword: string): string => {
    const def = findFormDefinition(formData)
    if (!def) return '-'
    const field = def.fields.find(f => f.label.includes(labelKeyword))
    if (!field) return '-'
    const value = formData[field.id]
    if (value === undefined || value === null || value === '') return '-'
    if (Array.isArray(value)) {
      return value.map(v => field.options?.find(o => o.value === String(v))?.label ?? String(v)).join(', ')
    }
    return field.options?.find(o => o.value === String(value))?.label ?? String(value)
  }

  const exportCSV = () => {
    if (responses.length === 0) { alert('エクスポートするデータがありません'); return }
    const headers = ['回答日時', 'ユーザー名', 'LINE ID', '年齢', '希望勤務エリア']
    const csvData = responses.map(response => [
      new Date(response.created_at).toLocaleString('ja-JP'),
      response.users?.display_name || '',
      response.users?.line_user_id || '',
      getValueByLabel(response.form_data, '年齢'),
      getValueByLabel(response.form_data, 'エリア'),
    ])
    const csvContent = [headers.join(','), ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n')
    const bom = '\uFEFF'
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `form_responses_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (!tenantKey) return null

  return (
    <>
      <Head><title>回答データ - LINE配信システム</title></Head>
      <div style={styles.container}>
        <header style={styles.header}>
          <Link href={`/admin/${tenantKey}`} style={styles.backLink}>← ダッシュボード</Link>
          <div style={styles.headerTop}>
            <h1 style={styles.title}>フォーム回答データ</h1>
            <button onClick={exportCSV} style={styles.exportButton}>CSV出力</button>
          </div>
        </header>

        {loading ? (
          <div style={styles.loading}>読み込み中...</div>
        ) : responses.length === 0 ? (
          <div style={styles.emptyState}>
            <p style={styles.emptyText}>回答データがありません</p>
            <p style={styles.emptyHint}>
              回答データは以下の場合に登録されます：<br/>
              • ユーザーがLIFFフォームを送信<br/>
              • フォームURL: /form/{'{'}tenantKey{'}'}
            </p>
          </div>
        ) : (
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>回答日時</th>
                  <th style={styles.th}>ユーザー名</th>
                  <th style={styles.th}>年齢</th>
                  <th style={styles.th}>希望勤務エリア</th>
                </tr>
              </thead>
              <tbody>
                {responses.map(response => (
                  <tr
                    key={response.id}
                    onClick={() => router.push(`/admin/${tenantKey}/responses/${response.id}`)}
                    style={{ ...styles.tableRow, cursor: 'pointer' }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f5f5f5' }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
                  >
                    <td style={styles.td}>{new Date(response.created_at).toLocaleString('ja-JP')}</td>
                    <td style={styles.td}>{response.users?.display_name || '-'}</td>
                    <td style={styles.td}>{getValueByLabel(response.form_data, '年齢')}</td>
                    <td style={styles.td}>{getValueByLabel(response.form_data, 'エリア')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}

const styles = {
  container: { maxWidth: '1400px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif' },
  header: { marginBottom: '30px' },
  backLink: { color: '#06c755', textDecoration: 'none', fontSize: '14px', display: 'inline-block', marginBottom: '10px' },
  headerTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: '28px', color: '#333', margin: 0 },
  exportButton: { padding: '12px 24px', backgroundColor: '#06c755', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '14px', fontWeight: 'bold' as const, cursor: 'pointer' },
  loading: { textAlign: 'center' as const, padding: '40px', fontSize: '16px', color: '#666' },
  emptyState: { textAlign: 'center' as const, padding: '60px 20px', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' },
  emptyText: { fontSize: '18px', color: '#666', marginBottom: '15px' },
  emptyHint: { fontSize: '14px', color: '#999', lineHeight: '1.6' },
  tableContainer: { backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', overflow: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' as const },
  tableRow: { transition: 'background-color 0.2s' },
  th: { padding: '16px', textAlign: 'left' as const, borderBottom: '2px solid #ddd', backgroundColor: '#f5f5f5', fontWeight: 'bold' as const, fontSize: '14px', color: '#333', whiteSpace: 'nowrap' as const },
  td: { padding: '16px', borderBottom: '1px solid #eee', fontSize: '14px', color: '#666' },
}
