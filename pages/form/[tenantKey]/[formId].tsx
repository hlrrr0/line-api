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

export default function FormByIdPage() {
  const router = useRouter()
  const { tenantKey, formId } = router.query

  const [liffReady, setLiffReady] = useState(false)
  const [userId, setUserId] = useState('')
  const [formDefinition, setFormDefinition] = useState<FormDefinition | null>(null)
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [error, setError] = useState('')

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

  useEffect(() => {
    if (!tenantKey) return

    const initLiff = async () => {
      try {
        const tenantResponse = await fetch(`/api/tenants/${tenantKey}`)
        if (!tenantResponse.ok) return

        const tenantData = await tenantResponse.json()
        const liffId = tenantData.tenant.liff_id
        if (!liffId) return

        await window.liff.init({ liffId })

        if (!window.liff.isLoggedIn()) {
          window.liff.login()
          return
        }

        const profile = await window.liff.getProfile()
        setUserId(profile.userId)
        setLiffReady(true)
      } catch (err) {
        console.error('LIFF initialization failed:', err)
      }
    }

    const script = document.createElement('script')
    script.src = 'https://static.line-scdn.net/liff/edge/2/sdk.js'
    script.onload = () => initLiff()
    document.body.appendChild(script)

    return () => {
      if (document.body.contains(script)) document.body.removeChild(script)
    }
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
          <div key={field.id} style={styles.formGroup}>
            <label style={styles.label}>{field.label} {field.required && '*'}</label>
            <input type={field.type} value={value || ''} onChange={e => handleInputChange(field.id, e.target.value)} required={field.required} placeholder={field.placeholder} style={styles.input} />
          </div>
        )
      case 'number':
        return (
          <div key={field.id} style={styles.formGroup}>
            <label style={styles.label}>{field.label} {field.required && '*'}</label>
            <input type="number" value={value || ''} onChange={e => handleInputChange(field.id, e.target.value)} required={field.required} placeholder={field.placeholder} min={field.min} max={field.max} style={styles.input} />
          </div>
        )
      case 'textarea':
        return (
          <div key={field.id} style={styles.formGroup}>
            <label style={styles.label}>{field.label} {field.required && '*'}</label>
            <textarea value={value || ''} onChange={e => handleInputChange(field.id, e.target.value)} required={field.required} placeholder={field.placeholder} rows={field.rows || 3} style={styles.textarea} />
          </div>
        )
      case 'date':
        return (
          <div key={field.id} style={styles.formGroup}>
            <label style={styles.label}>{field.label} {field.required && '*'}</label>
            <input type="date" value={value || ''} onChange={e => handleInputChange(field.id, e.target.value)} required={field.required} style={styles.input} />
          </div>
        )
      case 'select':
        return (
          <div key={field.id} style={styles.formGroup}>
            <label style={styles.label}>{field.label} {field.required && '*'}</label>
            <select value={value || ''} onChange={e => handleInputChange(field.id, e.target.value)} required={field.required} style={styles.select}>
              <option value="">選択してください</option>
              {field.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        )
      case 'radio':
        return (
          <div key={field.id} style={styles.formGroup}>
            <label style={styles.label}>{field.label} {field.required && '*'}</label>
            <div style={styles.radioGroup}>
              {field.options?.map(o => (
                <label key={o.value} style={styles.checkboxLabel}>
                  <input type="radio" name={field.id} value={o.value} checked={value === o.value} onChange={e => handleInputChange(field.id, e.target.value)} required={field.required} style={styles.radio} />
                  {o.label}
                </label>
              ))}
            </div>
          </div>
        )
      case 'checkbox':
        return (
          <div key={field.id} style={styles.formGroup}>
            <label style={styles.label}>{field.label} {field.required && '*'}</label>
            <div style={styles.checkboxGroup}>
              {field.options?.map(o => (
                <label key={o.value} style={styles.checkboxLabel}>
                  <input type="checkbox" value={o.value} checked={(value || []).includes(o.value)} onChange={e => handleCheckboxChange(field.id, o.value, e.target.checked)} style={styles.checkbox} />
                  {o.label}
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
        setSubmitSuccess(true)
        setTimeout(() => window.liff.closeWindow(), 2000)
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
    return <div style={styles.loading}><p>{error}</p></div>
  }

  if (!liffReady || !formDefinition) {
    return <div style={styles.loading}><p>読み込み中...</p></div>
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
        <title>{formDefinition.name}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div style={styles.container}>
        <h1 style={styles.title}>{formDefinition.name}</h1>
        {formDefinition.description && <p style={styles.description}>{formDefinition.description}</p>}

        <form onSubmit={handleSubmit} style={styles.form}>
          {formDefinition.fields
            .sort((a, b) => a.order - b.order)
            .map(field => renderField(field))}

          <button type="submit" disabled={isSubmitting} style={{ ...styles.button, ...(isSubmitting ? styles.buttonDisabled : {}) }}>
            {isSubmitting ? '送信中...' : '送信する'}
          </button>
        </form>
      </div>
    </>
  )
}

const styles = {
  loading: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'sans-serif' },
  success: { display: 'flex', flexDirection: 'column' as const, justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'sans-serif', textAlign: 'center' as const },
  container: { maxWidth: '600px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif' },
  title: { textAlign: 'center' as const, color: '#06c755', marginBottom: '10px' },
  description: { textAlign: 'center' as const, color: '#666', marginBottom: '30px' },
  form: { display: 'flex', flexDirection: 'column' as const, gap: '20px' },
  formGroup: { display: 'flex', flexDirection: 'column' as const, gap: '8px' },
  label: { fontWeight: 'bold' as const, color: '#333' },
  input: { padding: '12px', fontSize: '16px', border: '1px solid #ddd', borderRadius: '4px' },
  textarea: { padding: '12px', fontSize: '16px', border: '1px solid #ddd', borderRadius: '4px', fontFamily: 'inherit', resize: 'vertical' as const },
  select: { padding: '12px', fontSize: '16px', border: '1px solid #ddd', borderRadius: '4px' },
  checkboxGroup: { display: 'flex', flexDirection: 'column' as const, gap: '10px' },
  radioGroup: { display: 'flex', flexDirection: 'column' as const, gap: '10px' },
  checkboxLabel: { display: 'flex', alignItems: 'center', gap: '8px' },
  checkbox: { width: '18px', height: '18px' },
  radio: { width: '18px', height: '18px' },
  button: { padding: '16px', fontSize: '18px', fontWeight: 'bold' as const, color: '#fff', backgroundColor: '#06c755', border: 'none', borderRadius: '4px', cursor: 'pointer', marginTop: '10px' },
  buttonDisabled: { backgroundColor: '#ccc', cursor: 'not-allowed' },
}
