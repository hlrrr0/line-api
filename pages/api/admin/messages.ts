import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getTenantByKey } from '@/lib/tenant'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    return handleGet(req, res)
  }
  return res.status(405).json({ error: 'Method not allowed' })
}

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  const { tenantKey, userId } = req.query

  if (!tenantKey || typeof tenantKey !== 'string') {
    return res.status(400).json({ error: 'tenantKey is required' })
  }

  const tenant = await getTenantByKey(tenantKey)
  if (!tenant) {
    return res.status(404).json({ error: 'Tenant not found' })
  }

  try {
    if (userId && typeof userId === 'string') {
      // 特定ユーザーとの会話一覧（昇順）
      const { data: messages, error } = await supabaseAdmin
        .from('messages')
        .select('*')
        .eq('tenant_id', tenant.id)
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
        .limit(200)

      if (error) throw error

      // 未読の受信メッセージを既読にする
      const unreadIds = (messages ?? [])
        .filter(m => m.direction === 'received' && m.read_at === null)
        .map(m => m.id)
      if (unreadIds.length > 0) {
        await supabaseAdmin
          .from('messages')
          .update({ read_at: new Date().toISOString() })
          .in('id', unreadIds)
      }

      return res.status(200).json({ messages: messages ?? [] })
    }

    // インボックス一覧: テナントの全メッセージを降順取得してユーザーごとに集計
    const { data: allMessages, error } = await supabaseAdmin
      .from('messages')
      .select('*, users(id, display_name, picture_url)')
      .eq('tenant_id', tenant.id)
      .order('created_at', { ascending: false })
      .limit(2000)

    if (error) throw error

    // ユーザーごとに最新メッセージ + 未読数を集計
    const byUser = new Map<string, {
      user_id: string
      line_user_id: string
      display_name: string | null
      picture_url: string | null
      latest_message_content: string
      latest_message_at: string
      latest_direction: 'received' | 'sent'
      unread_count: number
    }>()

    for (const msg of allMessages ?? []) {
      const key = msg.user_id ?? msg.line_user_id
      if (!byUser.has(key)) {
        byUser.set(key, {
          user_id: msg.user_id ?? msg.line_user_id,
          line_user_id: msg.line_user_id,
          display_name: (msg.users as any)?.display_name ?? null,
          picture_url: (msg.users as any)?.picture_url ?? null,
          latest_message_content: msg.content,
          latest_message_at: msg.created_at,
          latest_direction: msg.direction,
          unread_count: 0,
        })
      }
      if (msg.direction === 'received' && msg.read_at === null) {
        byUser.get(key)!.unread_count++
      }
    }

    const inbox = Array.from(byUser.values())
      .sort((a, b) => new Date(b.latest_message_at).getTime() - new Date(a.latest_message_at).getTime())

    return res.status(200).json({ inbox })
  } catch (error) {
    console.error('Error fetching messages:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
