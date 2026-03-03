import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabase-admin'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'User ID is required' })
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', id)
      .single()

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // フォーム回答履歴を取得
    const { data: responses } = await supabaseAdmin
      .from('form_responses')
      .select('*, form_definitions(name)')
      .eq('user_id', id)
      .order('created_at', { ascending: false })

    // メッセージ履歴を取得
    const { data: messages } = await supabaseAdmin
      .from('messages')
      .select('*')
      .eq('user_id', id)
      .order('created_at', { ascending: true })
      .limit(200)

    return res.status(200).json({ user, responses: responses || [], messages: messages || [] })
  } catch (error) {
    console.error('Error fetching user:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
