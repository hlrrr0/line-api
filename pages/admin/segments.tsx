import { useState, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'

interface Segment {
  id: string
  name: string
  description: string
  conditions: any
  created_at: string
}

export default function SegmentsPage() {
  const [segments, setSegments] = useState<Segment[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    tags: [] as string[],
    ageMin: '',
    ageMax: '',
  })

  useEffect(() => {
    fetchSegments()
  }, [])

  const fetchSegments = async () => {
    try {
      const response = await fetch('/api/segments')
      const data = await response.json()
      setSegments(data.segments || [])
    } catch (error) {
      console.error('Error fetching segments:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const conditions: any = {}
    
    if (formData.tags.length > 0) {
      conditions.tags = formData.tags
    }
    if (formData.ageMin) {
      conditions.ageMin = parseInt(formData.ageMin)
    }
    if (formData.ageMax) {
      conditions.ageMax = parseInt(formData.ageMax)
    }

    try {
      const response = await fetch('/api/segments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          conditions,
        }),
      })

      if (response.ok) {
        setFormData({
          name: '',
          description: '',
          tags: [],
          ageMin: '',
          ageMax: '',
        })
        setShowForm(false)
        fetchSegments()
      } else {
        alert('セグメントの作成に失敗しました')
      }
    } catch (error) {
      console.error('Error creating segment:', error)
      alert('エラーが発生しました')
    }
  }

  const handleTagToggle = (tag: string) => {
    if (formData.tags.includes(tag)) {
      setFormData({
        ...formData,
        tags: formData.tags.filter(t => t !== tag)
      })
    } else {
      setFormData({
        ...formData,
        tags: [...formData.tags, tag]
      })
    }
  }

  return (
    <>
      <Head>
        <title>セグメント管理 - LINE配信システム</title>
      </Head>

      <div style={styles.container}>
        <header style={styles.header}>
          <Link href="/admin" style={styles.backLink}>← 管理画面に戻る</Link>
          <div style={styles.headerTop}>
            <h1 style={styles.title}>セグメント管理</h1>
            <button 
              onClick={() => setShowForm(!showForm)}
              style={styles.createButton}
            >
              {showForm ? 'キャンセル' : '+ 新規作成'}
            </button>
          </div>
        </header>

        {showForm && (
          <div style={styles.formCard}>
            <h2 style={styles.cardTitle}>新規セグメント作成</h2>
            <form onSubmit={handleSubmit} style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>セグメント名 *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>説明</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  style={styles.textarea}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>タグ条件（複数選択可）</label>
                <div style={styles.checkboxGroup}>
                  {['スポーツ', '音楽', '映画', '読書', '旅行', '料理'].map(tag => (
                    <label key={tag} style={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={formData.tags.includes(tag)}
                        onChange={() => handleTagToggle(tag)}
                        style={styles.checkbox}
                      />
                      {tag}
                    </label>
                  ))}
                </div>
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>年齢（最小）</label>
                  <input
                    type="number"
                    value={formData.ageMin}
                    onChange={(e) => setFormData({ ...formData, ageMin: e.target.value })}
                    style={styles.input}
                    placeholder="例: 20"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>年齢（最大）</label>
                  <input
                    type="number"
                    value={formData.ageMax}
                    onChange={(e) => setFormData({ ...formData, ageMax: e.target.value })}
                    style={styles.input}
                    placeholder="例: 30"
                  />
                </div>
              </div>

              <button type="submit" style={styles.button}>
                作成する
              </button>
            </form>
          </div>
        )}

        {loading ? (
          <div style={styles.loading}>読み込み中...</div>
        ) : (
          <div style={styles.segmentsList}>
            {segments.length === 0 ? (
              <div style={styles.empty}>
                セグメントがありません。新規作成してください。
              </div>
            ) : (
              segments.map(segment => (
                <div key={segment.id} style={styles.segmentCard}>
                  <h3 style={styles.segmentName}>{segment.name}</h3>
                  {segment.description && (
                    <p style={styles.segmentDescription}>{segment.description}</p>
                  )}
                  <div style={styles.conditionsBox}>
                    <strong>条件:</strong>
                    {segment.conditions.tags && (
                      <div>タグ: {segment.conditions.tags.join(', ')}</div>
                    )}
                    {(segment.conditions.ageMin || segment.conditions.ageMax) && (
                      <div>
                        年齢: {segment.conditions.ageMin || '制限なし'} 〜 {segment.conditions.ageMax || '制限なし'}
                      </div>
                    )}
                  </div>
                  <div style={styles.segmentDate}>
                    作成日: {new Date(segment.created_at).toLocaleDateString('ja-JP')}
                  </div>
                </div>
              ))
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
  headerTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: '28px',
    color: '#333',
    margin: 0,
  },
  createButton: {
    padding: '12px 24px',
    backgroundColor: '#06c755',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: 'bold' as const,
    cursor: 'pointer',
  },
  formCard: {
    backgroundColor: '#fff',
    padding: '30px',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    marginBottom: '30px',
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
    flex: 1,
  },
  formRow: {
    display: 'flex',
    gap: '20px',
  },
  label: {
    fontWeight: 'bold' as const,
    fontSize: '14px',
    color: '#333',
  },
  input: {
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
  checkboxGroup: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '15px',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  checkbox: {
    width: '18px',
    height: '18px',
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
  segmentsList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '20px',
  },
  segmentCard: {
    backgroundColor: '#fff',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  segmentName: {
    fontSize: '18px',
    margin: '0 0 10px 0',
    color: '#333',
  },
  segmentDescription: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '15px',
  },
  conditionsBox: {
    backgroundColor: '#f5f5f5',
    padding: '15px',
    borderRadius: '4px',
    fontSize: '14px',
    marginBottom: '10px',
  },
  segmentDate: {
    fontSize: '12px',
    color: '#999',
  },
}
