import Head from 'next/head'

export default function Home() {
  return (
    <>
      <Head>
        <title>LINE配信システム</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div style={styles.container}>
        <div style={styles.hero}>
          <h1 style={styles.title}>LINE配信システム</h1>
          <p style={styles.subtitle}>フォーム回答連動配信システム</p>
        </div>

        <div style={styles.linksContainer}>
          <a href="/admin" style={styles.linkCard}>
            <h2 style={styles.linkTitle}>⚙️ 管理画面</h2>
            <p style={styles.linkDescription}>
              ユーザー管理・メッセージ配信・セグメント設定
            </p>
          </a>
        </div>

        <div style={styles.features}>
          <h2 style={styles.featuresTitle}>主な機能</h2>
          <div style={styles.featuresList}>
            <div style={styles.feature}>
              <div style={styles.featureIcon}>✅</div>
              <div>
                <h3 style={styles.featureTitle}>LIFFフォーム</h3>
                <p style={styles.featureText}>LINE内で簡単にアンケート回答</p>
              </div>
            </div>
            <div style={styles.feature}>
              <div style={styles.featureIcon}>🎯</div>
              <div>
                <h3 style={styles.featureTitle}>セグメント配信</h3>
                <p style={styles.featureText}>回答内容に基づいた配信</p>
              </div>
            </div>
            <div style={styles.feature}>
              <div style={styles.featureIcon}>📊</div>
              <div>
                <h3 style={styles.featureTitle}>データ分析</h3>
                <p style={styles.featureText}>ユーザーデータの蓄積と分析</p>
              </div>
            </div>
            <div style={styles.feature}>
              <div style={styles.featureIcon}>🚀</div>
              <div>
                <h3 style={styles.featureTitle}>Vercel + Supabase</h3>
                <p style={styles.featureText}>サーバーレス・低コスト運用</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '40px 20px',
    fontFamily: 'sans-serif',
  },
  hero: {
    textAlign: 'center' as const,
    marginBottom: '60px',
  },
  title: {
    fontSize: '48px',
    color: '#06c755',
    margin: '0 0 10px 0',
  },
  subtitle: {
    fontSize: '20px',
    color: '#666',
    margin: 0,
  },
  linksContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '30px',
    marginBottom: '80px',
  },
  linkCard: {
    backgroundColor: '#fff',
    padding: '40px',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    textDecoration: 'none',
    color: 'inherit',
    transition: 'transform 0.2s, box-shadow 0.2s',
    cursor: 'pointer',
  },
  linkTitle: {
    fontSize: '24px',
    margin: '0 0 15px 0',
    color: '#333',
  },
  linkDescription: {
    fontSize: '16px',
    color: '#666',
    margin: 0,
    lineHeight: 1.6,
  },
  features: {
    marginTop: '60px',
  },
  featuresTitle: {
    fontSize: '32px',
    textAlign: 'center' as const,
    marginBottom: '40px',
    color: '#333',
  },
  featuresList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '30px',
  },
  feature: {
    display: 'flex',
    gap: '15px',
    alignItems: 'flex-start',
  },
  featureIcon: {
    fontSize: '32px',
    flexShrink: 0,
  },
  featureTitle: {
    fontSize: '18px',
    margin: '0 0 8px 0',
    color: '#333',
  },
  featureText: {
    fontSize: '14px',
    color: '#666',
    margin: 0,
    lineHeight: 1.5,
  },
}
