/**
 * Slack通知ヘルパー
 */
export async function sendSlackNotification(
  webhookUrl: string,
  message: {
    text: string
    blocks?: any[]
  }
): Promise<boolean> {
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    })
    if (!res.ok) {
      console.error('Slack notification failed:', res.status, await res.text())
      return false
    }
    return true
  } catch (error) {
    console.error('Slack notification error:', error)
    return false
  }
}

/**
 * フォーム送信時のSlack通知
 */
export async function notifyFormSubmission(
  webhookUrl: string,
  params: {
    tenantName: string
    userName: string | null
    formName: string | null
    formData: Record<string, any>
    adminUrl: string
  }
) {
  const { tenantName, userName, formName, formData, adminUrl } = params

  // _source などの内部フィールドを除外
  const displayData = Object.entries(formData)
    .filter(([key]) => !key.startsWith('_'))
    .map(([key, value]) => {
      const displayValue = Array.isArray(value) ? value.join(', ') : String(value ?? '')
      return `*${key}:* ${displayValue}`
    })
    .join('\n')

  const text = `${tenantName}にフォーム回答がありました`

  return sendSlackNotification(webhookUrl, {
    text,
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: 'フォーム回答通知' },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*テナント:*\n${tenantName}` },
          { type: 'mrkdwn', text: `*回答者:*\n${userName || '未認証ユーザー'}` },
          ...(formName ? [{ type: 'mrkdwn', text: `*フォーム:*\n${formName}` }] : []),
        ],
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: displayData || '(回答データなし)' },
      },
      ...(adminUrl ? [{
        type: 'actions',
        elements: [{
          type: 'button',
          text: { type: 'plain_text', text: '管理画面で確認' },
          url: adminUrl,
        }],
      }] : []),
    ],
  })
}
