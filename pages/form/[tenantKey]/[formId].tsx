import { useState, useEffect } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'

declare global {
  interface Window {
    liff: any
    fbq: any
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

function initMetaPixel(pixelId: string) {
  if (window.fbq) return
  const f: any = window
  const n: any = (f.fbq = function (...args: any[]) {
    n.callMethod ? n.callMethod.apply(n, args) : n.queue.push(args)
  })
  if (!f._fbq) f._fbq = n
  n.push = n
  n.loaded = true
  n.version = '2.0'
  n.queue = []
  const script = document.createElement('script')
  script.async = true
  script.src = 'https://connect.facebook.net/en_US/fbevents.js'
  document.head.appendChild(script)
  window.fbq('init', pixelId)
  window.fbq('track', 'PageView')
}

export default function FormByIdPage() {
  const router = useRouter()
  const { tenantKey, formId } = router.query

  const [ready, setReady] = useState(false)
  const [userId, setUserId] = useState('')
  const [isLiff, setIsLiff] = useState(false)
  const [formDefinition, setFormDefinition] = useState<FormDefinition | null>(null)
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [isEdit, setIsEdit] = useState(false)
  const [error, setError] = useState('')
  const [metaPixelId, setMetaPixelId] = useState<string | null>(null)

  useEffect(() => {
    if (!tenantKey || !formId) return

    fetch(`/api/forms/${tenantKey}/${formId}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          setError('フォームが見つかりませんでした')
          return
        }
        setFormDefinition(data.form)
        const initialData: Record<string, any> = {}
        data.form.fields.forEach((field: FormField) => {
          initialData[field.id] = field.type === 'checkbox' ? [] : ''
        })
        setFormData(initialData)
      })
      .catch(() => setError('フォームの読み込みに失敗しました'))
  }, [tenantKey, formId])

  // 既存回答をプリフィル
  useEffect(() => {
    if (!tenantKey || !formId || !userId || !formDefinition) return

    fetch(`/api/form/response?tenantKey=${tenantKey}&userId=${userId}&formId=${formId}`)
      .then(r => r.json())
      .then(data => {
        if (data.formData) {
          setIsEdit(true)
          const prefilled: Record<string, any> = {}
          formDefinition.fields.forEach((field: FormField) => {
            const saved = data.formData[field.id]
            if (saved !== undefined) {
              prefilled[field.id] = saved
            } else {
              prefilled[field.id] = field.type === 'checkbox' ? [] : ''
            }
          })
          setFormData(prefilled)
        }
      })
      .catch(() => { /* ignore */ })
  }, [tenantKey, formId, userId, formDefinition])

  useEffect(() => {
    if (!tenantKey) return

    const init = async () => {
      try {
        const tenantResponse = await fetch(`/api/tenants/${tenantKey}`)
        if (!tenantResponse.ok) {
          setReady(true)
          return
        }

        const tenantData = await tenantResponse.json()

        // Meta Pixel 初期化
        if (tenantData.tenant.meta_pixel_id) {
          setMetaPixelId(tenantData.tenant.meta_pixel_id)
          initMetaPixel(tenantData.tenant.meta_pixel_id)
        }

        const liffId = tenantData.tenant.liff_id
        if (!liffId) {
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
              // LINE内ブラウザ → 自動認証
              setIsLiff(true)
              const profile = await window.liff.getProfile()
              setUserId(profile.userId)
            } else if (window.liff.isLoggedIn()) {
              // 外部ブラウザだがLIFFログイン済み
              setIsLiff(true)
              const profile = await window.liff.getProfile()
              setUserId(profile.userId)
            } else {
              // 外部ブラウザ＆未ログイン → LIFFログインを強制
              window.liff.login()
              return
            }
          } catch (err) {
            console.error('LIFF initialization failed:', err)
          }
          setReady(true)
        }
        script.onerror = () => {
          setReady(true)
        }
        document.body.appendChild(script)
        return
      } catch (err) {
        console.error('Init failed:', err)
      }
      setReady(true)
    }

    init()
  }, [tenantKey])

  const handleInputChange = (fieldId: string, value: any) => {
    setFormData({ ...formData, [fieldId]: value })
  }

  const handleCheckboxChange = (fieldId: string, value: string, checked: boolean) => {
    const current = formData[fieldId] || []
    setFormData({
      ...formData,
      [fieldId]: checked ? [...current, value] : current.filter((v: string) => v !== value),
    })
  }

  const renderField = (field: FormField) => {
    const value = formData[field.id]

    switch (field.type) {
      case 'text':
      case 'email':
      case 'tel':
        return (
          <div key={field.id} style={styles.fieldCard}>
            <label style={styles.label}>{field.label} {field.required && <span style={styles.required}>*</span>}</label>
            <input type={field.type} value={value || ''} onChange={e => handleInputChange(field.id, e.target.value)} required={field.required} placeholder={field.placeholder} style={styles.input} />
          </div>
        )
      case 'number':
        return (
          <div key={field.id} style={styles.fieldCard}>
            <label style={styles.label}>{field.label} {field.required && <span style={styles.required}>*</span>}</label>
            <input type="number" value={value || ''} onChange={e => handleInputChange(field.id, e.target.value)} required={field.required} placeholder={field.placeholder} min={field.min} max={field.max} style={styles.input} />
          </div>
        )
      case 'textarea':
        return (
          <div key={field.id} style={styles.fieldCard}>
            <label style={styles.label}>{field.label} {field.required && <span style={styles.required}>*</span>}</label>
            <textarea value={value || ''} onChange={e => handleInputChange(field.id, e.target.value)} required={field.required} placeholder={field.placeholder} rows={field.rows || 3} style={styles.textarea} />
          </div>
        )
      case 'date':
        return (
          <div key={field.id} style={styles.fieldCard}>
            <label style={styles.label}>{field.label} {field.required && <span style={styles.required}>*</span>}</label>
            <input type="date" value={value || ''} onChange={e => handleInputChange(field.id, e.target.value)} required={field.required} style={styles.input} />
          </div>
        )
      case 'select':
        return (
          <div key={field.id} style={styles.fieldCard}>
            <label style={styles.label}>{field.label} {field.required && <span style={styles.required}>*</span>}</label>
            <select value={value || ''} onChange={e => handleInputChange(field.id, e.target.value)} required={field.required} style={styles.select}>
              <option value="">選択してください</option>
              {field.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        )
      case 'radio':
        return (
          <div key={field.id} style={styles.fieldCard}>
            <label style={styles.label}>{field.label} {field.required && <span style={styles.required}>*</span>}</label>
            <div style={styles.optionList}>
              {field.options?.map(o => (
                <label key={o.value} style={{ ...styles.optionCard, ...(value === o.value ? styles.optionCardSelected : {}) }}>
                  <input type="radio" name={field.id} value={o.value} checked={value === o.value} onChange={e => handleInputChange(field.id, e.target.value)} required={field.required} style={styles.hiddenInput} />
                  <span style={styles.optionText}>{o.label}</span>
                </label>
              ))}
            </div>
          </div>
        )
      case 'checkbox':
        return (
          <div key={field.id} style={styles.fieldCard}>
            <label style={styles.label}>{field.label} {field.required && <span style={styles.required}>*</span>}</label>
            <div style={styles.optionGrid}>
              {field.options?.map(o => (
                <label key={o.value} style={{ ...styles.optionCard, ...((value || []).includes(o.value) ? styles.optionCardSelected : {}) }}>
                  <input type="checkbox" value={o.value} checked={(value || []).includes(o.value)} onChange={e => handleCheckboxChange(field.id, o.value, e.target.checked)} style={styles.hiddenInput} />
                  <span style={styles.optionText}>{o.label}</span>
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantKey, userId, formData, formId }),
      })

      if (response.ok) {
        if (metaPixelId && window.fbq) {
          window.fbq('track', 'Lead')
        }
        setSubmitSuccess(true)
        if (isLiff && window.liff) {
          setTimeout(() => { try { window.liff.closeWindow() } catch { /* */ } }, 2000)
        }
      } else {
        alert('送信に失敗しました')
      }
    } catch {
      alert('エラーが発生しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (error) {
    return (
      <div style={styles.loadingScreen}>
        <p style={styles.loadingText}>{error}</p>
      </div>
    )
  }

  if (!ready || !formDefinition) {
    return (
      <div style={styles.loadingScreen}>
        <div style={styles.loadingSpinner} />
        <p style={styles.loadingText}>読み込み中...</p>
      </div>
    )
  }

  if (submitSuccess) {
    return (
      <>
        <Head><meta name="viewport" content="width=device-width, initial-scale=1" /></Head>
        <div style={styles.successScreen}>
          <div style={styles.successIcon}>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="12" fill="#06c755" />
              <path d="M7 12.5l3 3 7-7" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h2 style={styles.successTitle}>送信完了</h2>
          <p style={styles.successText}>ご回答ありがとうございました</p>
          {isLiff && <p style={styles.successSub}>まもなく画面を閉じます...</p>}
        </div>
      </>
    )
  }

  return (
    <>
      <Head>
        <title>{formDefinition.name}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>{`
          @keyframes spin { to { transform: rotate(360deg) } }
          body { margin: 0; }
          input:focus, textarea:focus, select:focus { border-color: #06c755 !important; background: #fff !important; }
        `}</style>
      </Head>

      <div style={styles.page}>
        <div style={styles.header}>
          <div style={styles.headerIcon}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M9 12h6M12 9v6M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <h1 style={styles.headerTitle}>{formDefinition.name}</h1>
          {formDefinition.description && <p style={styles.headerDesc}>{formDefinition.description}</p>}
        </div>

        <div style={styles.formContainer}>
          <form onSubmit={handleSubmit} style={styles.form}>
            {formDefinition.fields
              .sort((a, b) => a.order - b.order)
              .map(field => renderField(field))}

            <button type="submit" disabled={isSubmitting} style={{ ...styles.submitButton, ...(isSubmitting ? styles.submitButtonDisabled : {}) }}>
              {isSubmitting ? '送信中...' : isEdit ? '回答を更新する' : '送信する'}
            </button>
          </form>
          <p style={styles.footerNote}>ご入力いただいた情報は、サービス向上のために利用いたします。</p>
        </div>
      </div>
    </>
  )
}

const styles = {
  loadingScreen: { display: 'flex', flexDirection: 'column' as const, justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', background: '#f5f5f5' },
  loadingSpinner: { width: '36px', height: '36px', border: '3px solid #e0e0e0', borderTop: '3px solid #06c755', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: '16px' },
  loadingText: { color: '#888', fontSize: '14px' },
  successScreen: { display: 'flex', flexDirection: 'column' as const, justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', background: 'linear-gradient(135deg, #e8f5e9 0%, #f1f8e9 100%)', padding: '20px' },
  successIcon: { marginBottom: '24px' },
  successTitle: { fontSize: '24px', fontWeight: '700' as const, color: '#2e7d32', margin: '0 0 8px 0' },
  successText: { fontSize: '16px', color: '#555', margin: 0 },
  successSub: { fontSize: '13px', color: '#999', marginTop: '16px' },
  page: { minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', background: '#f5f5f5' },
  header: { background: 'linear-gradient(135deg, #06c755 0%, #05b04c 100%)', padding: '32px 20px 40px', textAlign: 'center' as const },
  headerIcon: { width: '48px', height: '48px', background: 'rgba(255,255,255,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' },
  headerTitle: { fontSize: '22px', fontWeight: '700' as const, color: '#fff', margin: '0 0 6px 0' },
  headerDesc: { fontSize: '14px', color: 'rgba(255,255,255,0.85)', margin: 0, lineHeight: '1.5' },
  formContainer: { maxWidth: '540px', margin: '-20px auto 0', padding: '0 16px 32px', position: 'relative' as const },
  form: { display: 'flex', flexDirection: 'column' as const, gap: '12px' },
  fieldCard: { background: '#fff', borderRadius: '12px', padding: '18px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column' as const, gap: '10px' },
  label: { fontSize: '14px', fontWeight: '600' as const, color: '#333', display: 'flex', alignItems: 'center', gap: '6px' },
  required: { color: '#e53935', fontSize: '14px' },
  input: { padding: '14px 16px', fontSize: '16px', border: '1.5px solid #e0e0e0', borderRadius: '10px', outline: 'none', background: '#fafafa', WebkitAppearance: 'none' as const },
  textarea: { padding: '14px 16px', fontSize: '16px', border: '1.5px solid #e0e0e0', borderRadius: '10px', outline: 'none', fontFamily: 'inherit', resize: 'vertical' as const, background: '#fafafa' },
  select: { padding: '14px 16px', fontSize: '16px', border: '1.5px solid #e0e0e0', borderRadius: '10px', outline: 'none', background: '#fafafa', WebkitAppearance: 'none' as const, backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'12\' height=\'8\' viewBox=\'0 0 12 8\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M1 1l5 5 5-5\' stroke=\'%23999\' stroke-width=\'2\' fill=\'none\' stroke-linecap=\'round\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px center', paddingRight: '40px' },
  optionGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' },
  optionList: { display: 'flex', flexDirection: 'column' as const, gap: '8px' },
  optionCard: { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px 14px', border: '1.5px solid #e0e0e0', borderRadius: '10px', cursor: 'pointer', background: '#fafafa' },
  optionCardSelected: { border: '1.5px solid #06c755', background: '#e8f5e9', color: '#2e7d32' },
  optionText: { fontSize: '14px', fontWeight: '500' as const },
  hiddenInput: { position: 'absolute' as const, opacity: 0, width: 0, height: 0 },
  submitButton: { padding: '16px', fontSize: '17px', fontWeight: '700' as const, color: '#fff', background: 'linear-gradient(135deg, #06c755 0%, #05b04c 100%)', border: 'none', borderRadius: '12px', cursor: 'pointer', marginTop: '8px', boxShadow: '0 4px 12px rgba(6,199,85,0.3)', letterSpacing: '0.5px' },
  submitButtonDisabled: { background: '#ccc', boxShadow: 'none', cursor: 'not-allowed' },
  footerNote: { textAlign: 'center' as const, fontSize: '12px', color: '#aaa', marginTop: '20px', lineHeight: '1.6' },
}
