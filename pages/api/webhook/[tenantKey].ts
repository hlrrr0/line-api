import type { NextApiRequest, NextApiResponse } from 'next'
import { WebhookEvent, MessageEvent, FollowEvent, UnfollowEvent } from '@line/bot-sdk'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getTenantByKey } from '@/lib/tenant'
import { validateSignature, getLineProfile, sendTextMessage, sendMultipleTextMessages } from '@/lib/line-multitenant'

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
    const { data: upsertedUser, error } = await supabaseAdmin
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
      .select('id')
      .single()

    if (error) {
      console.error('Error saving user:', error)
    }

    const internalUserId = upsertedUser?.id ?? null

    // ウェルカムメッセージ送信
    const formUrl = tenant.liff_id
      ? `https://liff.line.me/${tenant.liff_id}`
      : null

    const customMessages = tenant.welcome_messages && tenant.welcome_messages.length > 0
      ? tenant.welcome_messages
      : null

    let sentMessages: string[] = []

    if (customMessages) {
      // カスタムメッセージ（変数を置換）
      const userName = profile?.displayName || ''
      const resolved = customMessages.map((msg: string) =>
        msg
          .replace(/\{liff_url\}/g, formUrl || '')
          .replace(/\{user_name\}/g, userName)
      )
      await sendMultipleTextMessages(tenant, userId, resolved)
      sentMessages = resolved
    } else {
      // デフォルトメッセージ
      const welcomeText = formUrl
        ? `ご登録ありがとうございます！\n\nアンケートフォームにご協力いただけると幸いです。\n下記のリンクからご回答ください。\n${formUrl}`
        : 'ご登録ありがとうございます！'
      await sendTextMessage(tenant, userId, welcomeText)
      sentMessages = [welcomeText]
    }

    // 送信メッセージをDBに保存（チャット画面に表示するため）
    if (sentMessages.length > 0) {
      const results = await Promise.all(
        sentMessages.map((msg) =>
          supabaseAdmin
            .from('messages')
            .insert({
              tenant_id: tenant.id,
              user_id: internalUserId,
              line_user_id: userId,
              direction: 'sent',
              message_type: 'text',
              content: msg,
            })
        )
      )
      results.forEach((r, i) => {
        if (r.error) console.error(`Error saving welcome message ${i}:`, r.error)
      })
    }
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
  let { data: userRow } = await supabaseAdmin
    .from('users')
    .select('id')
    .or(`tenant_id.eq.${tenant.id},tenant_id.is.null`)
    .eq('line_user_id', lineUserId)
    .maybeSingle()

  // ユーザーが未登録の場合、プロフィールを取得して自動作成
  if (!userRow) {
    try {
      const profile = await getLineProfile(tenant, lineUserId)
      const { data: newUser } = await supabaseAdmin
        .from('users')
        .upsert({
          tenant_id: tenant.id,
          line_user_id: lineUserId,
          display_name: profile?.displayName || '',
          picture_url: profile?.pictureUrl || '',
          status_message: profile?.statusMessage || '',
          is_blocked: false,
        }, {
          onConflict: 'tenant_id,line_user_id',
        })
        .select('id')
        .single()
      if (newUser) userRow = newUser
    } catch (err) {
      console.error('Error auto-creating user on message:', err)
    }
  }

  const internalUserId: string | null = userRow?.id ?? null

  if (event.message.type === 'text') {
    const userMessage = event.message.text

    // 受信メッセージ保存と自動返信を並列実行
    const [saveResult] = await Promise.all([
      supabaseAdmin
        .from('messages')
        .insert({
          tenant_id: tenant.id,
          user_id: internalUserId,
          line_user_id: lineUserId,
          direction: 'received',
          message_type: 'text',
          content: userMessage,
        }),
      checkAutoReply(tenant, lineUserId, userMessage, internalUserId),
    ])
    if (saveResult.error) console.error('Error saving received message:', saveResult.error)
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

// 自動返信ルールキャッシュ（5分TTL）
const rulesCache = new Map<string, { rules: any[]; expiry: number }>()

async function getAutoReplyRules(tenantId: string) {
  const cached = rulesCache.get(tenantId)
  if (cached && cached.expiry > Date.now()) return cached.rules

  const { data: rules } = await supabaseAdmin
    .from('auto_reply_rules')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .order('priority', { ascending: false })

  const result = rules || []
  rulesCache.set(tenantId, { rules: result, expiry: Date.now() + 5 * 60 * 1000 })
  return result
}

// 自動返信チェック
async function checkAutoReply(tenant: any, lineUserId: string, userMessage: string, internalUserId: string | null) {
  try {
    const rules = await getAutoReplyRules(tenant.id)

    if (rules.length === 0) return

    for (const rule of rules) {
      let matched = false
      const msg = userMessage.trim()
      const kw = rule.keyword

      switch (rule.match_type) {
        case 'exact':
          matched = msg === kw
          break
        case 'starts_with':
          matched = msg.startsWith(kw)
          break
        case 'contains':
        default:
          matched = msg.includes(kw)
          break
      }

      if (matched && rule.reply_messages?.length > 0) {
        if (rule.reply_messages.length === 1) {
          await sendTextMessage(tenant, lineUserId, rule.reply_messages[0])
        } else {
          await sendMultipleTextMessages(tenant, lineUserId, rule.reply_messages)
        }

        // 送信メッセージをDBに保存（非同期で実行、返信速度に影響しない）
        Promise.all(
          rule.reply_messages.map((replyMsg: string) =>
            supabaseAdmin
              .from('messages')
              .insert({
                tenant_id: tenant.id,
                user_id: internalUserId,
                line_user_id: lineUserId,
                direction: 'sent',
                message_type: 'text',
                content: replyMsg,
              })
          )
        ).catch(err => console.error('Error saving auto reply messages:', err))

        return // 最初にマッチしたルールのみ返信
      }
    }
  } catch (error) {
    console.error('Error checking auto reply:', error)
  }
}
