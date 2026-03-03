import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabase-admin'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // 総ユーザー数
    const { count: totalUsers } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })

    // アクティブユーザー数（ブロックされていない）
    const { count: activeUsers } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('is_blocked', false)

    // 総回答数
    const { count: totalResponses } = await supabaseAdmin
      .from('form_responses')
      .select('*', { count: 'exact', head: true })

    // 本日の回答数
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const { count: todayResponses } = await supabaseAdmin
      .from('form_responses')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString())

    return res.status(200).json({
      totalUsers: totalUsers || 0,
      activeUsers: activeUsers || 0,
      totalResponses: totalResponses || 0,
      todayResponses: todayResponses || 0,
    })
  } catch (error) {
    console.error('Error fetching stats:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
