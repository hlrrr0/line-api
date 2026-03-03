import { Client, ClientConfig } from '@line/bot-sdk'
import { Tenant } from './tenant'

/**
 * テナントごとのLINE Clientインスタンスを作成
 */
export function createLineClient(tenant: Tenant): Client {
  const config: ClientConfig = {
    channelAccessToken: tenant.line_channel_access_token,
    channelSecret: tenant.line_channel_secret,
  }

  return new Client(config)
}

/**
 * メッセージ送信ヘルパー
 */
export async function sendTextMessage(
  tenant: Tenant,
  userId: string,
  text: string
) {
  const client = createLineClient(tenant)
  const message = {
    type: 'text' as const,
    text: text,
  }
  return await client.pushMessage(userId, message)
}

/**
 * 複数ユーザーに送信
 */
export async function sendBulkMessages(
  tenant: Tenant,
  userIds: string[],
  messages: any[]
) {
  const client = createLineClient(tenant)
  const results = await Promise.allSettled(
    userIds.map(userId => client.pushMessage(userId, messages))
  )

  const success = results.filter(r => r.status === 'fulfilled').length
  const failure = results.filter(r => r.status === 'rejected').length

  return { success, failure, results }
}

/**
 * プロフィール取得
 */
export async function getLineProfile(tenant: Tenant, userId: string) {
  const client = createLineClient(tenant)
  try {
    return await client.getProfile(userId)
  } catch (error) {
    console.error('Error getting LINE profile:', error)
    return null
  }
}

/**
 * Webhook署名検証
 */
export function validateSignature(
  body: string,
  signature: string,
  channelSecret: string
): boolean {
  const crypto = require('crypto')
  const hash = crypto
    .createHmac('SHA256', channelSecret)
    .update(body)
    .digest('base64')
  return hash === signature
}
