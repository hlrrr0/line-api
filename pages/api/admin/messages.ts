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

    // インボックス: RPC関数でDB側で集計
    const { data: rpcInbox, error } = await supabaseAdmin
      .rpc('get_inbox', { p_tenant_id: tenant.id })

    if (error) throw error

    // latest_message_at降順でソート（RPC結果はDISTINCT ON順）
    const inbox = (rpcInbox ?? [])
      .sort((a: any, b: any) => new Date(b.latest_message_at).getTime() - new Date(a.latest_message_at).getTime())

    return res.status(200).json({ inbox })
  } catch (error) {
    console.error('Error fetching messages:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
