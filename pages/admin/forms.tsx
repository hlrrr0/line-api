import { useState, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'

interface Tenant {
  id: string
  tenant_key: string
  name: string
}

interface FormField {
  id: string
  type: string
  label: string
  placeholder?: string
  required: boolean
  options?: { value: string; label: string }[]
  min?: number
  max?: number
  rows?: number
  order: number
}

interface FormDefinition {
  id: string
  tenant_id: string
  name: string
  description: string
  fields: FormField[]
  is_active: boolean
  created_at: string
}

export default function FormsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [selectedTenantKey, setSelectedTenantKey] = useState('')
  const [forms, setForms] = useState<FormDefinition[]>([])
  const [loading, setLoading] = useState(true)
  const [showBuilder, setShowBuilder] = useState(false)
  const [editingForm, setEditingForm] = useState<FormDefinition | null>(null)
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_active: true,
  })
  
  const [fields, setFields] = useState<FormField[]>([])
  const [editingField, setEditingField] = useState<FormField | null>(null)

  useEffect(() => {
    fetchTenants()
  }, [])

  useEffect(() => {
    if (selectedTenantKey) {
      fetchForms()
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

  const fetchForms = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/forms?tenantKey=${selectedTenantKey}`)
      const data = await response.json()
      setForms(data.forms || [])
    } catch (error) {
      console.error('Error fetching forms:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEditForm = (form: FormDefinition) => {
    setEditingForm(form)
    setFormData({
      name: form.name,
      description: form.description,
      is_active: form.is_active,
    })
    setFields(form.fields || [])
    setShowBuilder(true)
  }

  const handleNewForm = () => {
    setEditingForm(null)
    setFormData({
      name: '',
      description: '',
      is_active: true,
    })
    setFields([])
    setShowBuilder(true)
  }

  const handleSaveForm = async () => {
    if (!formData.name) {
      alert('フォーム名を入力してください')
      return
    }

    if (fields.length === 0) {
      alert('最低1つのフィールドを追加してください')
      return
    }

    try {
      const url = '/api/admin/forms'
      const method = editingForm ? 'PUT' : 'POST'
      const body = editingForm
        ? {
            id: editingForm.id,
            ...formData,
            fields,
          }
        : {
            tenantKey: selectedTenantKey,
            ...formData,
            fields,
          }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (response.ok) {
        alert(editingForm ? 'フォームを更新しました' : 'フォームを作成しました')
        setShowBuilder(false)
        fetchForms()
      } else {
        alert('エラーが発生しました')
      }
    } catch (error) {
      console.error('Error saving form:', error)
      alert('エラーが発生しました')
    }
  }

  const handleDeleteForm = async (id: string) => {
    if (!confirm('このフォームを削除しますか？')) return

    try {
      const response = await fetch('/api/admin/forms', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })

      if (response.ok) {
        alert('フォームを削除しました')
        fetchForms()
      } else {
        alert('削除に失敗しました')
      }
    } catch (error) {
      console.error('Error deleting form:', error)
      alert('エラーが発生しました')
    }
  }

  const handleAddField = () => {
    const newField: FormField = {
      id: `field_${Date.now()}`,
      type: 'text',
      label: '',
      required: false,
      order: fields.length + 1,
    }
    setEditingField(newField)
  }

  const handleSaveField = () => {
    if (!editingField || !editingField.label) {
      alert('ラベルを入力してください')
      return
    }

    const existingIndex = fields.findIndex(f => f.id === editingField.id)
    if (existingIndex >= 0) {
      const newFields = [...fields]
      newFields[existingIndex] = editingField
      setFields(newFields)
    } else {
      setFields([...fields, editingField])
    }
    setEditingField(null)
  }

  const handleEditFieldItem = (field: FormField) => {
    setEditingField({ ...field })
  }

  const handleDeleteField = (id: string) => {
    setFields(fields.filter(f => f.id !== id))
  }

  const moveFieldUp = (index: number) => {
    if (index === 0) return
    const newFields = [...fields]
    ;[newFields[index - 1], newFields[index]] = [newFields[index], newFields[index - 1]]
    newFields.forEach((f, i) => (f.order = i + 1))
    setFields(newFields)
  }

  const moveFieldDown = (index: number) => {
    if (index === fields.length - 1) return
    const newFields = [...fields]
    ;[newFields[index], newFields[index + 1]] = [newFields[index + 1], newFields[index]]
    newFields.forEach((f, i) => (f.order = i + 1))
    setFields(newFields)
  }

  return (
    <>
      <Head>
        <title>フォーム管理 - LINE配信システム</title>
      </Head>

      <div style={styles.container}>
        <header style={styles.header}>
          <Link href="/admin" style={styles.backLink}>← 管理画面に戻る</Link>
          <div style={styles.headerTop}>
            <h1 style={styles.title}>フォーム管理</h1>
            {!showBuilder && (
              <button onClick={handleNewForm} style={styles.createButton}>
                + 新規作成
              </button>
            )}
          </div>
        </header>

        {!showBuilder && (
          <>
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
              <div style={styles.formsList}>
                {forms.length === 0 ? (
                  <div style={styles.empty}>
                    フォーム定義がありません。新規作成してください。
                  </div>
                ) : (
                  forms.map(form => (
                    <div key={form.id} style={styles.formCard}>
                      <div style={styles.formHeader}>
                        <div>
                          <h3 style={styles.formName}>{form.name}</h3>
                          <p style={styles.formDesc}>{form.description}</p>
                        </div>
                        <span style={{
                          ...styles.statusBadge,
                          ...(form.is_active ? styles.statusActive : styles.statusInactive)
                        }}>
                          {form.is_active ? 'アクティブ' : '無効'}
                        </span>
                      </div>
                      <div style={styles.formInfo}>
                        <span>フィールド数: {form.fields?.length || 0}</span>
                      </div>
                      <div style={styles.formUrl}>
                        <code style={styles.urlText}>
                          {typeof window !== 'undefined' ? window.location.origin : ''}/form/{selectedTenantKey}/{form.id}
                        </code>
                        <button
                          onClick={() => {
                            const url = `${window.location.origin}/form/${selectedTenantKey}/${form.id}`
                            navigator.clipboard.writeText(url).then(() => alert('URLをコピーしました'))
                          }}
                          style={styles.copyButton}
                        >
                          URLをコピー
                        </button>
                      </div>
                      <div style={styles.formActions}>
                        <button
                          onClick={() => handleEditForm(form)}
                          style={styles.editButton}
                        >
                          編集
                        </button>
                        <button
                          onClick={() => handleDeleteForm(form.id)}
                          style={styles.deleteButton}
                        >
                          削除
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}

        {showBuilder && (
          <div style={styles.builder}>
            <div style={styles.builderHeader}>
              <h2>{editingForm ? 'フォーム編集' : '新規フォーム作成'}</h2>
              <button
                onClick={() => setShowBuilder(false)}
                style={styles.cancelButton}
              >
                キャンセル
              </button>
            </div>

            <div style={styles.builderContent}>
              <div style={styles.formGroup}>
                <label style={styles.label}>フォーム名 *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={styles.input}
                  placeholder="例: 顧客アンケート"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>説明</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  style={styles.textarea}
                  rows={3}
                  placeholder="フォームの説明"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  />
                  このフォームを有効にする
                </label>
              </div>

              <div style={styles.fieldsSection}>
                <div style={styles.fieldsSectionHeader}>
                  <h3>フォームフィールド</h3>
                  <button onClick={handleAddField} style={styles.addFieldButton}>
                    + フィールド追加
                  </button>
                </div>

                <div style={styles.fieldsList}>
                  {fields.map((field, index) => (
                    <div key={field.id} style={styles.fieldItem}>
                      <div style={styles.fieldInfo}>
                        <strong>{field.label}</strong>
                        <span style={styles.fieldType}>({field.type})</span>
                        {field.required && <span style={styles.requiredBadge}>必須</span>}
                      </div>
                      <div style={styles.fieldActions}>
                        <button
                          onClick={() => moveFieldUp(index)}
                          disabled={index === 0}
                          style={styles.moveButton}
                        >
                          ↑
                        </button>
                        <button
                          onClick={() => moveFieldDown(index)}
                          disabled={index === fields.length - 1}
                          style={styles.moveButton}
                        >
                          ↓
                        </button>
                        <button
                          onClick={() => handleEditFieldItem(field)}
                          style={styles.smallButton}
                        >
                          編集
                        </button>
                        <button
                          onClick={() => handleDeleteField(field.id)}
                          style={styles.smallDeleteButton}
                        >
                          削除
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button onClick={handleSaveForm} style={styles.saveButton}>
                {editingForm ? 'フォームを更新' : 'フォームを作成'}
              </button>
            </div>

            {editingField && (
              <div style={styles.modal}>
                <div style={styles.modalContent}>
                  <h3>フィールド設定</h3>
                  
                  <div style={styles.formGroup}>
                    <label style={styles.label}>フィールドタイプ *</label>
                    <select
                      value={editingField.type}
                      onChange={(e) => setEditingField({ ...editingField, type: e.target.value })}
                      style={styles.select}
                    >
                      <option value="text">テキスト</option>
                      <option value="number">数値</option>
                      <option value="email">メールアドレス</option>
                      <option value="tel">電話番号</option>
                      <option value="textarea">複数行テキスト</option>
                      <option value="select">ドロップダウン選択</option>
                      <option value="radio">ラジオボタン</option>
                      <option value="checkbox">チェックボックス</option>
                      <option value="date">日付</option>
                    </select>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>ラベル *</label>
                    <input
                      type="text"
                      value={editingField.label}
                      onChange={(e) => setEditingField({ ...editingField, label: e.target.value })}
                      style={styles.input}
                      placeholder="例: お名前"
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>プレースホルダー</label>
                    <input
                      type="text"
                      value={editingField.placeholder || ''}
                      onChange={(e) => setEditingField({ ...editingField, placeholder: e.target.value })}
                      style={styles.input}
                      placeholder="入力例を表示"
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={editingField.required}
                        onChange={(e) => setEditingField({ ...editingField, required: e.target.checked })}
                      />
                      必須項目にする
                    </label>
                  </div>

                  {['select', 'radio', 'checkbox'].includes(editingField.type) && (
                    <div style={styles.formGroup}>
                      <label style={styles.label}>選択肢（1行に1つ、値:ラベル形式）</label>
                      <textarea
                        value={editingField.options?.map(o => `${o.value}:${o.label}`).join('\n') || ''}
                        onChange={(e) => {
                          const lines = e.target.value.split('\n').filter(l => l.trim())
                          const options = lines.map(line => {
                            const [value, label] = line.split(':').map(s => s.trim())
                            return { value: value || '', label: label || value || '' }
                          })
                          setEditingField({ ...editingField, options })
                        }}
                        style={styles.textarea}
                        rows={5}
                        placeholder="male:男性&#10;female:女性"
                      />
                    </div>
                  )}

                  {editingField.type === 'number' && (
                    <>
                      <div style={styles.formRow}>
                        <div style={styles.formGroup}>
                          <label style={styles.label}>最小値</label>
                          <input
                            type="number"
                            value={editingField.min || ''}
                            onChange={(e) => setEditingField({ ...editingField, min: parseInt(e.target.value) || undefined })}
                            style={styles.input}
                          />
                        </div>
                        <div style={styles.formGroup}>
                          <label style={styles.label}>最大値</label>
                          <input
                            type="number"
                            value={editingField.max || ''}
                            onChange={(e) => setEditingField({ ...editingField, max: parseInt(e.target.value) || undefined })}
                            style={styles.input}
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {editingField.type === 'textarea' && (
                    <div style={styles.formGroup}>
                      <label style={styles.label}>行数</label>
                      <input
                        type="number"
                        value={editingField.rows || 3}
                        onChange={(e) => setEditingField({ ...editingField, rows: parseInt(e.target.value) || 3 })}
                        style={styles.input}
                        min="1"
                        max="20"
                      />
                    </div>
                  )}

                  <div style={styles.modalActions}>
                    <button onClick={handleSaveField} style={styles.saveButton}>
                      保存
                    </button>
                    <button onClick={() => setEditingField(null)} style={styles.cancelButton}>
                      キャンセル
                    </button>
                  </div>
                </div>
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
  tenantSelector: {
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  label: {
    fontSize: '14px',
    fontWeight: 'bold' as const,
    display: 'block',
    marginBottom: '5px',
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
  formsList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '15px',
  },
  formCard: {
    backgroundColor: '#fff',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  formHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '10px',
  },
  formName: {
    fontSize: '18px',
    margin: '0 0 5px 0',
    color: '#333',
  },
  formDesc: {
    fontSize: '14px',
    color: '#666',
    margin: 0,
  },
  statusBadge: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 'bold' as const,
  },
  statusActive: {
    backgroundColor: '#e8f5e9',
    color: '#2e7d32',
  },
  statusInactive: {
    backgroundColor: '#ffebee',
    color: '#c62828',
  },
  formInfo: {
    fontSize: '14px',
    color: '#999',
    marginBottom: '15px',
  },
  formUrl: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '15px',
    padding: '10px',
    backgroundColor: '#f5f5f5',
    borderRadius: '4px',
    flexWrap: 'wrap' as const,
  },
  urlText: {
    fontSize: '12px',
    color: '#555',
    wordBreak: 'break-all' as const,
    flex: 1,
  },
  copyButton: {
    padding: '6px 14px',
    backgroundColor: '#06c755',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '13px',
    whiteSpace: 'nowrap' as const,
    flexShrink: 0,
  },
  formActions: {
    display: 'flex',
    gap: '10px',
  },
  editButton: {
    padding: '8px 16px',
    backgroundColor: '#2196F3',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  deleteButton: {
    padding: '8px 16px',
    backgroundColor: '#f44336',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  builder: {
    backgroundColor: '#fff',
    padding: '30px',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  builderHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
    paddingBottom: '15px',
    borderBottom: '1px solid #eee',
  },
  builderContent: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '5px',
  },
  formRow: {
    display: 'flex',
    gap: '15px',
  },
  input: {
    padding: '10px',
    fontSize: '14px',
    border: '1px solid #ddd',
    borderRadius: '4px',
  },
  textarea: {
    padding: '10px',
    fontSize: '14px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontFamily: 'inherit',
    resize: 'vertical' as const,
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
  },
  fieldsSection: {
    marginTop: '20px',
    padding: '20px',
    backgroundColor: '#f5f5f5',
    borderRadius: '8px',
  },
  fieldsSectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px',
  },
  addFieldButton: {
    padding: '8px 16px',
    backgroundColor: '#06c755',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  fieldsList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
  },
  fieldItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px',
    backgroundColor: '#fff',
    borderRadius: '4px',
  },
  fieldInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  fieldType: {
    fontSize: '12px',
    color: '#999',
  },
  requiredBadge: {
    padding: '2px 8px',
    backgroundColor: '#ff9800',
    color: '#fff',
    fontSize: '11px',
    borderRadius: '10px',
  },
  fieldActions: {
    display: 'flex',
    gap: '8px',
  },
  moveButton: {
    padding: '4px 8px',
    backgroundColor: '#eee',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  smallButton: {
    padding: '6px 12px',
    backgroundColor: '#2196F3',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
  },
  smallDeleteButton: {
    padding: '6px 12px',
    backgroundColor: '#f44336',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
  },
  saveButton: {
    padding: '14px',
    backgroundColor: '#06c755',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 'bold' as const,
  },
  cancelButton: {
    padding: '10px 20px',
    backgroundColor: '#f5f5f5',
    color: '#666',
    border: '1px solid #ddd',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  modal: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: '30px',
    borderRadius: '8px',
    maxWidth: '600px',
    maxHeight: '80vh',
    overflow: 'auto',
    width: '90%',
  },
  modalActions: {
    display: 'flex',
    gap: '10px',
    marginTop: '20px',
    justifyContent: 'flex-end',
  },
}
