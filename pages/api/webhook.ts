import type { NextApiRequest, NextApiResponse } from 'next'
import { WebhookEvent, MessageEvent, FollowEvent, UnfollowEvent } from '@line/bot-sdk'
import crypto from 'crypto'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getLineProfile, sendTextMessage } from '@/lib/line'

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
}

// Webhook署名検証
function validateSignature(body: string, signature: string): boolean {
  const channelSecret = process.env.LINE_CHANNEL_SECRET || ''
  const hash = crypto
    .createHmac('SHA256', channelSecret)
    .update(body)
    .digest('base64')
  return hash === signature
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // 署名検証
  const signature = req.headers['x-line-signature'] as string
  const body = JSON.stringify(req.body)
  
  if (!validateSignature(body, signature)) {
    return res.status(401).json({ error: 'Invalid signature' })
  }

  const { events } = req.body

  try {
    await Promise.all(events.map(handleEvent))
    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Webhook handling error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

async function handleEvent(event: WebhookEvent) {
  switch (event.type) {
    case 'follow':
      await handleFollow(event)
      break
    case 'unfollow':
      await handleUnfollow(event)
      break
    case 'message':
      await handleMessage(event)
      break
    default:
      console.log('Unhandled event type:', event.type)
  }
}

// 友だち追加時の処理
async function handleFollow(event: FollowEvent) {
  const userId = event.source.userId
  if (!userId) return

  try {
    // LINEプロフィール取得
    const profile = await getLineProfile(userId)

    // ユーザー情報を保存
    const { data, error } = await supabaseAdmin
      .from('users')
      .upsert({
        line_user_id: userId,
        display_name: profile?.displayName || '',
        picture_url: profile?.pictureUrl || '',
        status_message: profile?.statusMessage || '',
        is_blocked: false,
      }, {
        onConflict: 'line_user_id',
      })
      .select()

    if (error) {
      console.error('Error saving user:', error)
    }

    // ウェルカムメッセージ送信
    await sendTextMessage(
      userId,
      'ご登録ありがとうございます！\n\nアンケートフォームにご協力いただけると幸いです。\n下記のメニューから「アンケート」を選択してください。'
    )
  } catch (error) {
    console.error('Error handling follow event:', error)
  }
}

// ブロック/友だち削除時の処理
async function handleUnfollow(event: UnfollowEvent) {
  const userId = event.source.userId
  if (!userId) return

  try {
    await supabaseAdmin
      .from('users')
      .update({ is_blocked: true })
      .eq('line_user_id', userId)
  } catch (error) {
    console.error('Error handling unfollow event:', error)
  }
}

// メッセージ受信時の処理
async function handleMessage(event: MessageEvent) {
  const userId = event.source.userId
  if (!userId) return

  // テキストメッセージの場合
  if (event.message.type === 'text') {
    const userMessage = event.message.text

    // 簡単な自動応答例
    let replyMessage = 'メッセージを受信しました。'

    if (userMessage.includes('アンケート') || userMessage.includes('フォーム')) {
      replyMessage = 'アンケートフォームは下記のメニューから「アンケート」を選択してください。'
    } else if (userMessage.includes('ヘルプ') || userMessage.includes('使い方')) {
      replyMessage = '使い方:\n1. メニューから「アンケート」を選択\n2. フォームに回答\n3. お得な情報を受け取る'
    }

    await sendTextMessage(userId, replyMessage)
  }
}
