import { useState, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'

interface Tenant {
  id: string
  tenant_key: string
  name: string
  line_channel_id: string
  liff_id?: string
  is_active: boolean
  has_credentials: boolean
  created_at: string
}

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null)
  const [formData, setFormData] = useState({
    tenant_key: '',
    name: '',
    line_channel_id: '',
    line_channel_secret: '',
    line_channel_access_token: '',
    liff_id: '',
  })

  useEffect(() => {
    fetchTenants()
  }, [])

  const fetchTenants = async () => {
    try {
      const response = await fetch('/api/admin/tenants')
      const data = await response.json()
      setTenants(data.tenants || [])
    } catch (error) {
      console.error('Error fetching tenants:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const url = '/api/admin/tenants'
      const method = editingTenant ? 'PUT' : 'POST'
      const body = editingTenant
        ? { id: editingTenant.id, ...formData }
        : formData

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      if (response.ok) {
        setFormData({
          tenant_key: '',
          name: '',
          line_channel_id: '',
          line_channel_secret: '',
          line_channel_access_token: '',
          liff_id: '',
        })
        setShowForm(false)
        setEditingTenant(null)
        fetchTenants()
        alert(editingTenant ? 'テナントを更新しました' : 'テナントを作成しました')
      } else {
        const error = await response.json()
        alert(`エラー: ${error.error}`)
      }
    } catch (error) {
      console.error('Error saving tenant:', error)
      alert('エラーが発生しました')
    }
  }

  const handleEdit = (tenant: Tenant) => {
    setEditingTenant(tenant)
    setFormData({
      tenant_key: tenant.tenant_key,
      name: tenant.name,
      line_channel_id: tenant.line_channel_id,
      line_channel_secret: '',
      line_channel_access_token: '',
      liff_id: tenant.liff_id || '',
    })
    setShowForm(true)
  }

  const handleCancelEdit = () => {
    setEditingTenant(null)
    setFormData({
      tenant_key: '',
      name: '',
      line_channel_id: '',
      line_channel_secret: '',
      line_channel_access_token: '',
      liff_id: '',
    })
    setShowForm(false)
  }

  const copyWebhookUrl = (tenantKey: string) => {
    const url = `${window.location.origin}/api/webhook/${tenantKey}`
    navigator.clipboard.writeText(url)
    alert('Webhook URLをコピーしました')
  }

  const copyLiffUrl = (tenantKey: string) => {
    const url = `${window.location.origin}/form/${tenantKey}`
    navigator.clipboard.writeText(url)
    alert('LIFF URLをコピーしました')
  }

  return (
    <>
      <Head>
        <title>テナント管理 - LINE配信システム</title>
      </Head>

      <div style={styles.container}>
        <header style={styles.header}>
          <Link href="/admin" style={styles.backLink}>← 管理画面に戻る</Link>
          <div style={styles.headerTop}>
            <h1 style={styles.title}>テナント管理</h1>
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
            <h2 style={styles.cardTitle}>{editingTenant ? 'テナント編集' : '新規テナント作成'}</h2>
            {editingTenant && (
              <div style={styles.credentialNotice}>
                <span style={editingTenant.has_credentials ? styles.credentialSet : styles.credentialUnset}>
                  {editingTenant.has_credentials ? '✓ LINE認証情報は設定済みです' : '⚠ LINE認証情報が未設定です'}
                </span>
                <span style={styles.credentialHint}>（セキュリティのため値は表示されません。変更する場合のみ入力してください）</span>
              </div>
            )}
            <form onSubmit={handleSubmit} style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>テナントキー（URL用） *</label>
                <input
                  type="text"
                  value={formData.tenant_key}
                  onChange={(e) => setFormData({ ...formData, tenant_key: e.target.value })}
                  required
                  disabled={!!editingTenant}
                  placeholder="例: account-a"
                  pattern="[a-z0-9\-]+"
                  style={editingTenant ? {...styles.input, ...styles.inputDisabled} : styles.input}
                />
                <small style={styles.helpText}>半角英小文字・数字・ハイフンのみ{editingTenant && ' (変更不可)'}</small>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>テナント名 *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="例: ○○株式会社"
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>LINE Channel ID *</label>
                <input
                  type="text"
                  value={formData.line_channel_id}
                  onChange={(e) => setFormData({ ...formData, line_channel_id: e.target.value })}
                  required
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>LINE Channel Secret {editingTenant ? '' : '*'}</label>
                <input
                  type="text"
                  value={formData.line_channel_secret}
                  onChange={(e) => setFormData({ ...formData, line_channel_secret: e.target.value })}
                  required={!editingTenant}
                  placeholder={editingTenant ? '変更しない場合は空欄' : ''}
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>LINE Channel Access Token {editingTenant ? '' : '*'}</label>
                <textarea
                  value={formData.line_channel_access_token}
                  onChange={(e) => setFormData({ ...formData, line_channel_access_token: e.target.value })}
                  required={!editingTenant}
                  placeholder={editingTenant ? '変更しない場合は空欄' : ''}
                  rows={3}
                  style={styles.textarea}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>LIFF ID</label>
                <input
                  type="text"
                  value={formData.liff_id}
                  onChange={(e) => setFormData({ ...formData, liff_id: e.target.value })}
                  placeholder="後で設定可能"
                  style={styles.input}
                />
              </div>

              <div style={{display: 'flex', gap: '10px'}}>
                <button type="submit" style={styles.button}>
                  {editingTenant ? '更新する' : '作成する'}
                </button>
                {editingTenant && (
                  <button type="button" onClick={handleCancelEdit} style={styles.cancelButton}>
                    キャンセル
                  </button>
                )}
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div style={styles.loading}>読み込み中...</div>
        ) : (
          <div style={styles.tenantsList}>
            {tenants.length === 0 ? (
              <div style={styles.empty}>
                テナントがありません。新規作成してください。
              </div>
            ) : (
              tenants.map(tenant => (
                <div key={tenant.id} style={styles.tenantCard}>
                  <div style={styles.tenantHeader}>
                    <h3 style={styles.tenantName}>{tenant.name}</h3>
                    <span style={{
                      ...styles.statusBadge,
                      ...(tenant.is_active ? styles.statusActive : styles.statusInactive)
                    }}>
                      {tenant.is_active ? 'アクティブ' : '無効'}
                    </span>
                  </div>

                  <div style={styles.tenantInfo}>
                    <div style={styles.infoRow}>
                      <strong>テナントキー:</strong> {tenant.tenant_key}
                    </div>
                    <div style={styles.infoRow}>
                      <strong>Channel ID:</strong> {tenant.line_channel_id}
                    </div>
                    {tenant.liff_id && (
                      <div style={styles.infoRow}>
                        <strong>LIFF ID:</strong> {tenant.liff_id}
                      </div>
                    )}
                  </div>

                  <div style={styles.tenantActions}>
                    <button
                      onClick={() => handleEdit(tenant)}
                      style={styles.editButton}
                    >
                      ✏️ 編集
                    </button>
                  </div>

                  <div style={styles.urlSection}>
                    <div style={styles.urlRow}>
                      <span style={styles.urlLabel}>Webhook URL:</span>
                      <button
                        onClick={() => copyWebhookUrl(tenant.tenant_key)}
                        style={styles.copyButton}
                      >
                        📋 コピー
                      </button>
                    </div>
                    <code style={styles.urlCode}>
                      /api/webhook/{tenant.tenant_key}
                    </code>

                    <div style={styles.urlRow}>
                      <span style={styles.urlLabel}>LIFF URL:</span>
                      <button
                        onClick={() => copyLiffUrl(tenant.tenant_key)}
                        style={styles.copyButton}
                      >
                        📋 コピー
                      </button>
                    </div>
                    <code style={styles.urlCode}>
                      /form/{tenant.tenant_key}
                    </code>
                  </div>

                  <div style={styles.tenantDate}>
                    作成日: {new Date(tenant.created_at).toLocaleDateString('ja-JP')}
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
    fontFamily: 'monospace',
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
  tenantsList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px',
  },
  tenantCard: {
    backgroundColor: '#fff',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  tenantHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px',
  },
  tenantName: {
    fontSize: '20px',
    margin: 0,
    color: '#333',
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
  tenantInfo: {
    marginBottom: '15px',
    fontSize: '14px',
  },
  infoRow: {
    marginBottom: '8px',
  },
  tenantActions: {
    marginBottom: '15px',
  },
  editButton: {
    padding: '8px 16px',
    fontSize: '14px',
    backgroundColor: '#2196F3',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  cancelButton: {
    padding: '16px',
    fontSize: '16px',
    fontWeight: 'bold' as const,
    color: '#666',
    backgroundColor: '#f5f5f5',
    border: '1px solid #ddd',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  inputDisabled: {
    backgroundColor: '#f5f5f5',
    color: '#999',
    cursor: 'not-allowed',
  },
  urlSection: {
    backgroundColor: '#f5f5f5',
    padding: '15px',
    borderRadius: '4px',
    marginBottom: '15px',
  },
  urlRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '5px',
  },
  urlLabel: {
    fontSize: '12px',
    fontWeight: 'bold' as const,
    color: '#666',
  },
  copyButton: {
    padding: '4px 12px',
    fontSize: '12px',
    backgroundColor: '#fff',
    border: '1px solid #ddd',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  urlCode: {
    display: 'block',
    padding: '8px',
    backgroundColor: '#fff',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '12px',
    fontFamily: 'monospace',
    marginBottom: '15px',
    wordBreak: 'break-all' as const,
  },
  tenantDate: {
    fontSize: '12px',
    color: '#999',
  },
  credentialNotice: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 14px',
    backgroundColor: '#f5f5f5',
    borderRadius: '6px',
    marginBottom: '20px',
    flexWrap: 'wrap' as const,
  },
  credentialSet: {
    fontSize: '14px',
    fontWeight: 'bold' as const,
    color: '#2e7d32',
  },
  credentialUnset: {
    fontSize: '14px',
    fontWeight: 'bold' as const,
    color: '#c62828',
  },
  credentialHint: {
    fontSize: '12px',
    color: '#888',
  },
}
