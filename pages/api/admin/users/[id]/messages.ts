import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabase-admin'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { id, before } = req.query
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'User ID is required' })
  }

  try {
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('line_user_id, tenant_id')
      .eq('id', id)
      .single()

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    let query = supabaseAdmin
      .from('messages')
      .select('*')
      .eq('tenant_id', user.tenant_id)
      .or(`user_id.eq.${id},line_user_id.eq.${user.line_user_id}`)
      .order('created_at', { ascending: false })
      .limit(50)

    if (before && typeof before === 'string') {
      query = query.lt('created_at', before)
    }

    const { data: messagesDesc } = await query
    const messages = (messagesDesc ?? []).reverse()

    return res.status(200).json({
      messages,
      hasMore: (messagesDesc?.length ?? 0) === 50,
    })
  } catch (error) {
    console.error('Error fetching messages:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
