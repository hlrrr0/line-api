import type { NextApiRequest, NextApiResponse } from 'next'
import { WebhookEvent, MessageEvent, FollowEvent, UnfollowEvent } from '@line/bot-sdk'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getTenantByKey } from '@/lib/tenant'
import { validateSignature, getLineProfile, sendTextMessage } from '@/lib/line-multitenant'

export const config = {
  api: {
    bodyParser: false,
  },
}

// raw body を読み取るヘルパー
function getRawBody(req: NextApiRequest): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')))
    req.on('error', reject)
  })
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // URLパスからテナントキーを取得 (/api/webhook/[tenantKey])
  const { tenantKey } = req.query

  if (!tenantKey || typeof tenantKey !== 'string') {
    return res.status(400).json({ error: 'Tenant key is required' })
  }

  // テナント情報を取得
  const tenant = await getTenantByKey(tenantKey)
  if (!tenant) {
    return res.status(404).json({ error: 'Tenant not found' })
  }

  // raw body を取得して署名検証
  const rawBody = await getRawBody(req)
  const signature = req.headers['x-line-signature'] as string

  if (!validateSignature(rawBody, signature, tenant.line_channel_secret)) {
    return res.status(401).json({ error: 'Invalid signature' })
  }

  const { events } = JSON.parse(rawBody)

  try {
    await Promise.all(events.map((event: WebhookEvent) => handleEvent(event, tenant)))
    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Webhook handling error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

async function handleEvent(event: WebhookEvent, tenant: any) {
  switch (event.type) {
    case 'follow':
      await handleFollow(event, tenant)
      break
    case 'unfollow':
      await handleUnfollow(event, tenant)
      break
    case 'message':
      await handleMessage(event, tenant)
      break
    default:
      console.log('Unhandled event type:', event.type)
  }
}

// 友だち追加時の処理
async function handleFollow(event: FollowEvent, tenant: any) {
  const userId = event.source.userId
  if (!userId) return

  try {
    // LINEプロフィール取得
    const profile = await getLineProfile(tenant, userId)

    // ユーザー情報を保存（テナントIDを含める）
    const { error } = await supabaseAdmin
      .from('users')
      .upsert({
        tenant_id: tenant.id,
        line_user_id: userId,
        display_name: profile?.displayName || '',
        picture_url: profile?.pictureUrl || '',
        status_message: profile?.statusMessage || '',
        is_blocked: false,
      }, {
        onConflict: 'tenant_id,line_user_id',
      })

    if (error) {
      console.error('Error saving user:', error)
    }

    // ウェルカムメッセージ送信
    await sendTextMessage(
      tenant,
      userId,
      'ご登録ありがとうございます！\n\nアンケートフォームにご協力いただけると幸いです。\n下記のメニューから「アンケート」を選択してください。'
    )
  } catch (error) {
    console.error('Error handling follow event:', error)
  }
}

// ブロック/友だち削除時の処理
async function handleUnfollow(event: UnfollowEvent, tenant: any) {
  const userId = event.source.userId
  if (!userId) return

  try {
    await supabaseAdmin
      .from('users')
      .update({ is_blocked: true })
      .eq('tenant_id', tenant.id)
      .eq('line_user_id', userId)
  } catch (error) {
    console.error('Error handling unfollow event:', error)
  }
}

// メッセージ受信時の処理
async function handleMessage(event: MessageEvent, tenant: any) {
  const lineUserId = event.source.userId
  if (!lineUserId) return

  // users テーブルから内部 user_id を取得（tenant_id が null の旧データも対象）
  const { data: userRow } = await supabaseAdmin
    .from('users')
    .select('id')
    .or(`tenant_id.eq.${tenant.id},tenant_id.is.null`)
    .eq('line_user_id', lineUserId)
    .maybeSingle()
  const internalUserId: string | null = userRow?.id ?? null

  if (event.message.type === 'text') {
    const userMessage = event.message.text

    // 受信メッセージを DB に保存
    const { error: msgError } = await supabaseAdmin
      .from('messages')
      .insert({
        tenant_id: tenant.id,
        user_id: internalUserId,
        line_user_id: lineUserId,
        direction: 'received',
        message_type: 'text',
        content: userMessage,
      })
    if (msgError) console.error('Error saving received message:', msgError)
  } else {
    // テキスト以外（画像・スタンプ等）はプレースホルダーで保存
    const placeholders: Record<string, string> = {
      image: '[画像]',
      video: '[動画]',
      audio: '[音声]',
      file: '[ファイル]',
      location: '[位置情報]',
      sticker: '[スタンプ]',
    }
    const content = placeholders[event.message.type] ?? `[${event.message.type}]`
    const { error: msgError } = await supabaseAdmin
      .from('messages')
      .insert({
        tenant_id: tenant.id,
        user_id: internalUserId,
        line_user_id: lineUserId,
        direction: 'received',
        message_type: event.message.type,
        content,
      })
    if (msgError) console.error('Error saving received message:', msgError)
  }
}
