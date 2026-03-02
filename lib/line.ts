import { Client, middleware, WebhookEvent, TextMessage, ClientConfig } from '@line/bot-sdk'

const config: ClientConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
  channelSecret: process.env.LINE_CHANNEL_SECRET || '',
}

export const lineClient = new Client(config)

export const lineMiddleware = middleware(config)

// メッセージ送信ヘルパー
export async function sendTextMessage(userId: string, text: string) {
  const message: TextMessage = {
    type: 'text',
    text: text,
  }
  return await lineClient.pushMessage(userId, message)
}

// 複数ユーザーに送信
export async function sendBulkMessages(userIds: string[], messages: any[]) {
  const results = await Promise.allSettled(
    userIds.map(userId => lineClient.pushMessage(userId, messages))
  )
  
  const success = results.filter(r => r.status === 'fulfilled').length
  const failure = results.filter(r => r.status === 'rejected').length
  
  return { success, failure, results }
}

// プロフィール取得
export async function getLineProfile(userId: string) {
  try {
    return await lineClient.getProfile(userId)
  } catch (error) {
    console.error('Error getting LINE profile:', error)
    return null
  }
}
