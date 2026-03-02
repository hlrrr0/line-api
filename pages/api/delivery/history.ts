import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabase'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    // 配信履歴一覧取得
    try {
      const { data: history, error } = await supabaseAdmin
        .from('delivery_history')
        .select('*, segments(name)')
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) {
        throw error
      }

      return res.status(200).json({ history })
    } catch (error) {
      console.error('Error fetching delivery history:', error)
      return res.status(500).json({ error: 'Internal server error' })
    }
  } else if (req.method === 'POST') {
    // 特定の配信履歴詳細取得
    const { deliveryId } = req.body

    if (!deliveryId) {
      return res.status(400).json({ error: 'Missing deliveryId' })
    }

    try {
      const { data: history, error: historyError } = await supabaseAdmin
        .from('delivery_history')
        .select('*, segments(name)')
        .eq('id', deliveryId)
        .single()

      if (historyError) {
        throw historyError
      }

      const { data: logs, error: logsError } = await supabaseAdmin
        .from('delivery_logs')
        .select('*, users(display_name, line_user_id)')
        .eq('delivery_history_id', deliveryId)
        .order('sent_at', { ascending: false })

      if (logsError) {
        throw logsError
      }

      return res.status(200).json({ history, logs })
    } catch (error) {
      console.error('Error fetching delivery details:', error)
      return res.status(500).json({ error: 'Internal server error' })
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' })
  }
}
