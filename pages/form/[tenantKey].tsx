import { useState, useEffect } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'

declare global {
  interface Window {
    liff: any
  }
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
  name: string
  description: string
  fields: FormField[]
}

export default function FormPage() {
  const router = useRouter()
  const { tenantKey } = router.query // URLパラメータからテナントキーを取得

  const [ready, setReady] = useState(false)
  const [userId, setUserId] = useState('')
  const [source, setSource] = useState('')
  const [isLiff, setIsLiff] = useState(false)
  const [tenantId, setTenantId] = useState('')
  const [formDefinition, setFormDefinition] = useState<FormDefinition | null>(null)
  const [useDefaultForm, setUseDefaultForm] = useState(false)
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  // フォーム定義を取得
  useEffect(() => {
    if (!tenantKey) return

    const fetchFormDefinition = async () => {
      try {
        const response = await fetch(`/api/forms/${tenantKey}`)
        const data = await response.json()

        if (data.useDefault) {
          // デフォルトフォームを使用
          setUseDefaultForm(true)
          setFormData({
            name: '',
            age: '',
            gender: '',
            interests: [] as string[],
            email: '',
            phone: '',
          })
        } else {
          // カスタムフォーム定義を使用
          setFormDefinition(data.form)
          const initialData: Record<string, any> = {}
          data.form.fields.forEach((field: FormField) => {
            if (field.type === 'checkbox') {
              initialData[field.id] = []
            } else {
              initialData[field.id] = ''
            }
          })
          setFormData(initialData)
        }
      } catch (error) {
        console.error('Error fetching form definition:', error)
        // エラー時はデフォルトフォームを使用
        setUseDefaultForm(true)
      }
    }

    fetchFormDefinition()
  }, [tenantKey])

  // URLのsourceパラメータを取得
  useEffect(() => {
    if (!router.isReady) return
    const s = router.query.source
    if (s && typeof s === 'string') setSource(s)
  }, [router.isReady, router.query.source])

  useEffect(() => {
    if (!tenantKey) return

    const init = async () => {
      try {
        // テナント情報を取得
        const tenantResponse = await fetch(`/api/tenants/${tenantKey}`)
        if (!tenantResponse.ok) {
          console.error('Tenant not found')
          setReady(true) // テナントが見つからなくてもフォームは表示
          return
        }

        const tenantData = await tenantResponse.json()
        setTenantId(tenantData.tenant.id)

        const liffId = tenantData.tenant.liff_id
        if (!liffId) {
          // LIFF IDがない場合は認証なしモード
          setReady(true)
          return
        }

        // LIFF SDKを読み込んで初期化を試行
        const script = document.createElement('script')
        script.src = 'https://static.line-scdn.net/liff/edge/2/sdk.js'
        script.onload = async () => {
          try {
            await window.liff.init({ liffId })

            if (window.liff.isInClient()) {
              // LINE内ブラウザ（LIFF環境）→ 自動認証
              setIsLiff(true)
              const profile = await window.liff.getProfile()
              setUserId(profile.userId)
            } else if (window.liff.isLoggedIn()) {
              // 外部ブラウザだがLIFFログイン済み
              setIsLiff(true)
              const profile = await window.liff.getProfile()
              setUserId(profile.userId)
            }
            // 外部ブラウザ＆未ログイン → 認証なしで回答可能
          } catch (error) {
            console.error('LIFF initialization failed:', error)
          }
          setReady(true)
        }
        script.onerror = () => {
          // LIFF SDK読み込み失敗 → 認証なしモード
          setReady(true)
        }
        document.body.appendChild(script)
        return
      } catch (error) {
        console.error('Init failed:', error)
      }
      setReady(true)
    }

    init()
  }, [tenantKey])

  const handleInputChange = (fieldId: string, value: any) => {
    setFormData({ ...formData, [fieldId]: value })
  }

  const handleCheckboxChange = (fieldId: string, value: string, checked: boolean) => {
    const currentValues = formData[fieldId] || []
    if (checked) {
      setFormData({ ...formData, [fieldId]: [...currentValues, value] })
    } else {
      setFormData({
        ...formData,
        [fieldId]: currentValues.filter((item: string) => item !== value)
      })
    }
  }

  const renderField = (field: FormField) => {
    const value = formData[field.id]

    switch (field.type) {
      case 'text':
      case 'email':
      case 'tel':
        return (
          <div key={field.id} style={styles.formGroup}>
            <label style={styles.label}>
              {field.label} {field.required && '*'}
            </label>
            <input
              type={field.type}
              value={value || ''}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              required={field.required}
              placeholder={field.placeholder}
              style={styles.input}
            />
          </div>
        )

      case 'number':
        return (
          <div key={field.id} style={styles.formGroup}>
            <label style={styles.label}>
              {field.label} {field.required && '*'}
            </label>
            <input
              type="number"
              value={value || ''}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              required={field.required}
              placeholder={field.placeholder}
              min={field.min}
              max={field.max}
              style={styles.input}
            />
          </div>
        )

      case 'textarea':
        return (
          <div key={field.id} style={styles.formGroup}>
            <label style={styles.label}>
              {field.label} {field.required && '*'}
            </label>
            <textarea
              value={value || ''}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              required={field.required}
              placeholder={field.placeholder}
              rows={field.rows || 3}
              style={styles.textarea}
            />
          </div>
        )

      case 'date':
        return (
          <div key={field.id} style={styles.formGroup}>
            <label style={styles.label}>
              {field.label} {field.required && '*'}
            </label>
            <input
              type="date"
              value={value || ''}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              required={field.required}
              style={styles.input}
            />
          </div>
        )

      case 'select':
        return (
          <div key={field.id} style={styles.formGroup}>
            <label style={styles.label}>
              {field.label} {field.required && '*'}
            </label>
            <select
              value={value || ''}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              required={field.required}
              style={styles.select}
            >
              <option value="">選択してください</option>
              {field.options?.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )

      case 'radio':
        return (
          <div key={field.id} style={styles.formGroup}>
            <label style={styles.label}>
              {field.label} {field.required && '*'}
            </label>
            <div style={styles.radioGroup}>
              {field.options?.map(option => (
                <label key={option.value} style={styles.checkboxLabel}>
                  <input
                    type="radio"
                    name={field.id}
                    value={option.value}
                    checked={value === option.value}
                    onChange={(e) => handleInputChange(field.id, e.target.value)}
                    required={field.required}
                    style={styles.radio}
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </div>
        )

      case 'checkbox':
        return (
          <div key={field.id} style={styles.formGroup}>
            <label style={styles.label}>
              {field.label} {field.required && '*'}
            </label>
            <div style={styles.checkboxGroup}>
              {field.options?.map(option => (
                <label key={option.value} style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    value={option.value}
                    checked={(value || []).includes(option.value)}
                    onChange={(e) => handleCheckboxChange(field.id, option.value, e.target.checked)}
                    style={styles.checkbox}
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </div>
        )

      default:
        return null
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/form/submit-multitenant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenantKey,
          userId: userId || null,
          formData,
          source: source || null,
        }),
      })

      if (response.ok) {
        setSubmitSuccess(true)
        if (isLiff && window.liff) {
          setTimeout(() => {
            try { window.liff.closeWindow() } catch { /* */ }
          }, 2000)
        }
      } else {
        alert('送信に失敗しました')
      }
    } catch (error) {
      console.error('Form submission error:', error)
      alert('エラーが発生しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!tenantKey) {
    return (
      <div style={styles.loading}>
        <p>URLが正しくありません</p>
      </div>
    )
  }

  if (!ready) {
    return (
      <div style={styles.loading}>
        <p>読み込み中...</p>
      </div>
    )
  }

  if (submitSuccess) {
    return (
      <div style={styles.success}>
        <h2>✓ 送信完了</h2>
        <p>ご回答ありがとうございました</p>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>{formDefinition?.name || 'アンケートフォーム'}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div style={styles.container}>
        <h1 style={styles.title}>{formDefinition?.name || 'アンケートフォーム'}</h1>
        {formDefinition?.description && (
          <p style={styles.description}>{formDefinition.description}</p>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          {useDefaultForm ? (
            // デフォルトフォーム（既存の6フィールド）
            <>
              <div style={styles.formGroup}>
                <label style={styles.label}>お名前 *</label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  required
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>年齢 *</label>
                <input
                  type="number"
                  value={formData.age || ''}
                  onChange={(e) => handleInputChange('age', e.target.value)}
                  required
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>性別 *</label>
                <select
                  value={formData.gender || ''}
                  onChange={(e) => handleInputChange('gender', e.target.value)}
                  required
                  style={styles.select}
                >
                  <option value="">選択してください</option>
                  <option value="male">男性</option>
                  <option value="female">女性</option>
                  <option value="other">その他</option>
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>興味のあるジャンル（複数選択可）</label>
                <div style={styles.checkboxGroup}>
                  {['スポーツ', '音楽', '映画', '読書', '旅行', '料理'].map(interest => (
                    <label key={interest} style={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        value={interest}
                        checked={(formData.interests || []).includes(interest)}
                        onChange={(e) => handleCheckboxChange('interests', interest, e.target.checked)}
                        style={styles.checkbox}
                      />
                      {interest}
                    </label>
                  ))}
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>メールアドレス</label>
                <input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>電話番号</label>
                <input
                  type="tel"
                  value={formData.phone || ''}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  style={styles.input}
                />
              </div>
            </>
          ) : (
            // カスタムフォーム（動的レンダリング）
            formDefinition?.fields
              .sort((a, b) => a.order - b.order)
              .map(field => renderField(field))
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              ...styles.button,
              ...(isSubmitting ? styles.buttonDisabled : {})
            }}
          >
            {isSubmitting ? '送信中...' : '送信する'}
          </button>
        </form>
      </div>
    </>
  )
}

const styles = {
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    fontFamily: 'sans-serif',
  },
  success: {
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    fontFamily: 'sans-serif',
    textAlign: 'center' as const,
  },
  container: {
    maxWidth: '600px',
    margin: '0 auto',
    padding: '20px',
    fontFamily: 'sans-serif',
  },
  title: {
    textAlign: 'center' as const,
    color: '#06c755',
    marginBottom: '10px',
  },
  description: {
    textAlign: 'center' as const,
    color: '#666',
    marginBottom: '30px',
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
    color: '#333',
  },
  input: {
    padding: '12px',
    fontSize: '16px',
    border: '1px solid #ddd',
    borderRadius: '4px',
  },
  textarea: {
    padding: '12px',
    fontSize: '16px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontFamily: 'inherit',
    resize: 'vertical' as const,
  },
  select: {
    padding: '12px',
    fontSize: '16px',
    border: '1px solid #ddd',
    borderRadius: '4px',
  },
  checkboxGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
  },
  radioGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
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
  radio: {
    width: '18px',
    height: '18px',
  },
  button: {
    padding: '16px',
    fontSize: '18px',
    fontWeight: 'bold' as const,
    color: '#fff',
    backgroundColor: '#06c755',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    marginTop: '10px',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
    cursor: 'not-allowed',
  },
}
