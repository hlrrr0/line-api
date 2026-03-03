import { useState, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'

interface Segment {
  id: string
  name: string
  description: string
  conditions: {
    ageMin?: number
    ageMax?: number
    formFields?: FormCondition[]
  }
  created_at: string
}

interface Tenant {
  id: string
  tenant_key: string
  name: string
}

interface FormField {
  id: string
  label: string
  type: string
  options?: { value: string; label: string }[]
}

interface FormDefinition {
  id: string
  name: string
  fields: FormField[]
}

interface FormCondition {
  fieldId: string
  fieldLabel: string
  fieldType: string
  operator: string
  value: string
  valueLabel: string
}

const OPERATOR_LABELS: Record<string, string> = {
  eq: 'が次に等しい',
  neq: 'が次に等しくない',
  includes: 'が次を含む',
  gte: 'が次の値以上',
  lte: 'が次の値以下',
  contains: 'が次を含む（部分一致）',
}

export default function SegmentsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [selectedTenantKey, setSelectedTenantKey] = useState('')
  const [segments, setSegments] = useState<Segment[]>([])
  const [formDefinitions, setFormDefinitions] = useState<FormDefinition[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  const [formData, setFormData] = useState({ name: '', description: '' })
  const [formConditions, setFormConditions] = useState<FormCondition[]>([])

  // 新しい条件の入力状態
  const [showConditionRow, setShowConditionRow] = useState(false)
  const [newCond, setNewCond] = useState({ fieldId: '', operator: 'eq', value: '' })

  useEffect(() => { fetchTenants() }, [])

  useEffect(() => {
    if (selectedTenantKey) {
      fetchSegments()
      fetchFormDefinitions()
    }
  }, [selectedTenantKey])

  const fetchTenants = async () => {
    try {
      const res = await fetch('/api/admin/tenants')
      const data = await res.json()
      setTenants(data.tenants || [])
      if (data.tenants?.length > 0) setSelectedTenantKey(data.tenants[0].tenant_key)
    } catch (e) { console.error(e) }
  }

  const fetchSegments = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/segments?tenantKey=${selectedTenantKey}`)
      const data = await res.json()
      setSegments(data.segments || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const fetchFormDefinitions = async () => {
    try {
      const res = await fetch(`/api/admin/forms?tenantKey=${selectedTenantKey}`)
      const data = await res.json()
      setFormDefinitions(data.forms || [])
    } catch (e) { console.error(e) }
  }

  // 全フォームのフィールドをまとめて取得
  const allFields: FormField[] = formDefinitions.flatMap(def => def.fields)
  const selectedField = allFields.find(f => f.id === newCond.fieldId)

  const getOperatorOptions = (type: string) => {
    switch (type) {
      case 'number': return [
        { value: 'eq', label: '等しい' },
        { value: 'gte', label: '以上' },
        { value: 'lte', label: '以下' },
      ]
      case 'checkbox': return [{ value: 'includes', label: '含む' }]
      case 'select':
      case 'radio': return [
        { value: 'eq', label: '等しい' },
        { value: 'neq', label: '等しくない' },
      ]
      default: return [
        { value: 'eq', label: '等しい' },
        { value: 'contains', label: '含む（部分一致）' },
      ]
    }
  }

  const handleFieldChange = (fieldId: string) => {
    const field = allFields.find(f => f.id === fieldId)
    if (!field) return
    const ops = getOperatorOptions(field.type)
    setNewCond({ fieldId, operator: ops[0].value, value: '' })
  }

  const handleAddCondition = () => {
    if (!selectedField || !newCond.value) {
      alert('フィールドと値を選択してください')
      return
    }
    const valueLabel = selectedField.options
      ? (selectedField.options.find(o => o.value === newCond.value)?.label ?? newCond.value)
      : newCond.value

    setFormConditions(prev => [...prev, {
      fieldId: selectedField.id,
      fieldLabel: selectedField.label,
      fieldType: selectedField.type,
      operator: newCond.operator,
      value: newCond.value,
      valueLabel,
    }])
    setNewCond({ fieldId: '', operator: 'eq', value: '' })
    setShowConditionRow(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name) { alert('セグメント名を入力してください'); return }
    if (formConditions.length === 0) { alert('条件を1つ以上追加してください'); return }

    const conditions: any = {}
    if (formConditions.length > 0) conditions.formFields = formConditions

    try {
      const res = await fetch('/api/segments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantKey: selectedTenantKey,
          name: formData.name,
          description: formData.description,
          conditions,
        }),
      })
      if (res.ok) {
        setFormData({ name: '', description: '' })
        setFormConditions([])
        setShowForm(false)
        fetchSegments()
      } else {
        alert('セグメントの作成に失敗しました')
      }
    } catch (e) {
      console.error(e)
      alert('エラーが発生しました')
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
            <button onClick={() => setShowForm(!showForm)} style={styles.createButton}>
              {showForm ? 'キャンセル' : '+ 新規作成'}
            </button>
          </div>
        </header>

        <div style={styles.tenantSelector}>
          <label style={styles.label}>テナント選択:</label>
          <select
            value={selectedTenantKey}
            onChange={(e) => setSelectedTenantKey(e.target.value)}
            style={styles.select}
          >
            {tenants.map(t => (
              <option key={t.id} value={t.tenant_key}>{t.name}</option>
            ))}
          </select>
        </div>

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
                  placeholder="例: 関東エリア・未経験者"
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>説明</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  style={styles.textarea}
                  placeholder="任意"
                />
              </div>

              {/* フォーム条件 */}
              <div style={styles.formGroup}>
                <label style={styles.label}>フォーム回答条件（AND条件・全て一致）</label>

                {/* 追加済み条件一覧 */}
                {formConditions.length > 0 && (
                  <div style={styles.conditionList}>
                    {formConditions.map((c, i) => (
                      <div key={i} style={styles.conditionTag}>
                        <span>
                          <strong>{c.fieldLabel}</strong>
                          {' '}{OPERATOR_LABELS[c.operator] ?? c.operator}{' '}
                          <em>「{c.valueLabel}」</em>
                        </span>
                        <button
                          type="button"
                          onClick={() => setFormConditions(prev => prev.filter((_, j) => j !== i))}
                          style={styles.removeBtn}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* 条件追加フォーム */}
                {showConditionRow ? (
                  <div style={styles.conditionRow}>
                    {/* フィールド選択 */}
                    <select
                      value={newCond.fieldId}
                      onChange={(e) => handleFieldChange(e.target.value)}
                      style={styles.condSelect}
                    >
                      <option value="">フィールドを選択...</option>
                      {formDefinitions.map(def => (
                        <optgroup key={def.id} label={def.name}>
                          {def.fields.map(f => (
                            <option key={f.id} value={f.id}>{f.label}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>

                    {/* 演算子 */}
                    {selectedField && (
                      <select
                        value={newCond.operator}
                        onChange={(e) => setNewCond({ ...newCond, operator: e.target.value, value: '' })}
                        style={styles.condSelect}
                      >
                        {getOperatorOptions(selectedField.type).map(op => (
                          <option key={op.value} value={op.value}>{op.label}</option>
                        ))}
                      </select>
                    )}

                    {/* 値入力 */}
                    {selectedField && (
                      selectedField.options ? (
                        <select
                          value={newCond.value}
                          onChange={(e) => setNewCond({ ...newCond, value: e.target.value })}
                          style={styles.condSelect}
                        >
                          <option value="">値を選択...</option>
                          {selectedField.options.map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={selectedField.type === 'number' ? 'number' : 'text'}
                          value={newCond.value}
                          onChange={(e) => setNewCond({ ...newCond, value: e.target.value })}
                          placeholder="値を入力"
                          style={styles.condInput}
                        />
                      )
                    )}

                    <button type="button" onClick={handleAddCondition} style={styles.addCondBtn}>
                      追加
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowConditionRow(false); setNewCond({ fieldId: '', operator: 'eq', value: '' }) }}
                      style={styles.cancelCondBtn}
                    >
                      キャンセル
                    </button>
                  </div>
                ) : (
                  allFields.length > 0 ? (
                    <button type="button" onClick={() => setShowConditionRow(true)} style={styles.addRowBtn}>
                      + 条件を追加
                    </button>
                  ) : (
                    <p style={styles.noFields}>このテナントにフォーム定義がありません</p>
                  )
                )}
              </div>

              <button type="submit" style={styles.button}>作成する</button>
            </form>
          </div>
        )}

        {loading ? (
          <div style={styles.loading}>読み込み中...</div>
        ) : (
          <div style={styles.segmentsList}>
            {segments.length === 0 ? (
              <div style={styles.empty}>セグメントがありません。新規作成してください。</div>
            ) : (
              segments.map(segment => (
                <div key={segment.id} style={styles.segmentCard}>
                  <h3 style={styles.segmentName}>{segment.name}</h3>
                  {segment.description && (
                    <p style={styles.segmentDescription}>{segment.description}</p>
                  )}
                  <div style={styles.conditionsBox}>
                    <strong style={styles.conditionsTitle}>絞り込み条件:</strong>
                    {segment.conditions.formFields?.map((c, i) => (
                      <div key={i} style={styles.conditionItem}>
                        {c.fieldLabel} {OPERATOR_LABELS[c.operator] ?? c.operator} 「{c.valueLabel}」
                      </div>
                    ))}
                    {segment.conditions.ageMin && (
                      <div style={styles.conditionItem}>年齢 {segment.conditions.ageMin}歳以上</div>
                    )}
                    {segment.conditions.ageMax && (
                      <div style={styles.conditionItem}>年齢 {segment.conditions.ageMax}歳以下</div>
                    )}
                    {!segment.conditions.formFields?.length && !segment.conditions.ageMin && !segment.conditions.ageMax && (
                      <div style={styles.conditionItem}>条件なし（全員）</div>
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
  header: { marginBottom: '30px' },
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
  title: { fontSize: '28px', color: '#333', margin: 0 },
  tenantSelector: {
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  select: {
    padding: '8px 12px',
    fontSize: '14px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    minWidth: '200px',
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
  cardTitle: { fontSize: '20px', marginTop: 0, marginBottom: '20px', color: '#333' },
  form: { display: 'flex', flexDirection: 'column' as const, gap: '20px' },
  formGroup: { display: 'flex', flexDirection: 'column' as const, gap: '8px' },
  label: { fontWeight: 'bold' as const, fontSize: '14px', color: '#333' },
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
  conditionList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
    marginBottom: '8px',
  },
  conditionTag: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 14px',
    backgroundColor: '#e8f5e9',
    borderRadius: '6px',
    fontSize: '14px',
    color: '#2e7d32',
  },
  removeBtn: {
    background: 'none',
    border: 'none',
    color: '#c62828',
    cursor: 'pointer',
    fontSize: '18px',
    lineHeight: 1,
    padding: '0 4px',
  },
  conditionRow: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    flexWrap: 'wrap' as const,
    padding: '12px',
    backgroundColor: '#f5f5f5',
    borderRadius: '6px',
  },
  condSelect: {
    padding: '8px 10px',
    fontSize: '14px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    flex: 1,
    minWidth: '140px',
  },
  condInput: {
    padding: '8px 10px',
    fontSize: '14px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    flex: 1,
    minWidth: '120px',
  },
  addCondBtn: {
    padding: '8px 16px',
    backgroundColor: '#06c755',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    whiteSpace: 'nowrap' as const,
  },
  cancelCondBtn: {
    padding: '8px 16px',
    backgroundColor: '#eee',
    color: '#666',
    border: '1px solid #ddd',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    whiteSpace: 'nowrap' as const,
  },
  addRowBtn: {
    padding: '10px 16px',
    backgroundColor: '#fff',
    color: '#06c755',
    border: '2px dashed #06c755',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold' as const,
    alignSelf: 'flex-start',
  },
  noFields: { fontSize: '14px', color: '#999', margin: 0 },
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
  loading: { textAlign: 'center' as const, padding: '40px', fontSize: '16px', color: '#666' },
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
  segmentName: { fontSize: '18px', margin: '0 0 10px 0', color: '#333' },
  segmentDescription: { fontSize: '14px', color: '#666', marginBottom: '15px' },
  conditionsBox: {
    backgroundColor: '#f5f5f5',
    padding: '12px 15px',
    borderRadius: '4px',
    fontSize: '14px',
    marginBottom: '10px',
  },
  conditionsTitle: { display: 'block', marginBottom: '8px', color: '#333' },
  conditionItem: {
    padding: '4px 0',
    color: '#555',
    borderBottom: '1px solid #eee',
  },
  segmentDate: { fontSize: '12px', color: '#999', marginTop: '10px' },
}
