import { useState, useEffect } from 'react'
import Head from 'next/head'

declare global {
  interface Window {
    liff: any
  }
}

export default function FormPage() {
  const [liffReady, setLiffReady] = useState(false)
  const [userId, setUserId] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: '',
    interests: [] as string[],
    email: '',
    phone: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  useEffect(() => {
    // LIFF SDK初期化
    const initLiff = async () => {
      const liffId = process.env.NEXT_PUBLIC_LIFF_ID
      if (!liffId) {
        console.error('LIFF ID is not set')
        return
      }

      try {
        await window.liff.init({ liffId })
        
        if (!window.liff.isLoggedIn()) {
          window.liff.login()
          return
        }

        const profile = await window.liff.getProfile()
        setUserId(profile.userId)
        setLiffReady(true)
      } catch (error) {
        console.error('LIFF initialization failed:', error)
      }
    }

    // LIFF SDKスクリプト読み込み
    const script = document.createElement('script')
    script.src = 'https://static.line-scdn.net/liff/edge/2/sdk.js'
    script.onload = () => initLiff()
    document.body.appendChild(script)

    return () => {
      document.body.removeChild(script)
    }
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
  }

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target
    if (checked) {
      setFormData({ ...formData, interests: [...formData.interests, value] })
    } else {
      setFormData({
        ...formData,
        interests: formData.interests.filter(item => item !== value)
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/form/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          formData,
        }),
      })

      if (response.ok) {
        setSubmitSuccess(true)
        setTimeout(() => {
          window.liff.closeWindow()
        }, 2000)
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

  if (!liffReady) {
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
        <title>アンケートフォーム</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div style={styles.container}>
        <h1 style={styles.title}>アンケートフォーム</h1>
        
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>お名前 *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
              style={styles.input}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>年齢 *</label>
            <input
              type="number"
              name="age"
              value={formData.age}
              onChange={handleInputChange}
              required
              style={styles.input}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>性別 *</label>
            <select
              name="gender"
              value={formData.gender}
              onChange={handleInputChange}
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
                    checked={formData.interests.includes(interest)}
                    onChange={handleCheckboxChange}
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
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              style={styles.input}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>電話番号</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              style={styles.input}
            />
          </div>

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
