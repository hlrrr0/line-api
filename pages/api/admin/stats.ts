import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getTenantByKey } from '@/lib/tenant'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { tenantKey } = req.query
  if (!tenantKey || typeof tenantKey !== 'string') {
    return res.status(400).json({ error: 'tenantKey is required' })
  }

  const tenant = await getTenantByKey(tenantKey)
  if (!tenant) {
    return res.status(404).json({ error: 'Tenant not found' })
  }

  try {
    // 総ユーザー数
    const { count: totalUsers } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenant.id)

    // アクティブユーザー数（ブロックされていない）
    const { count: activeUsers } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenant.id)
      .eq('is_blocked', false)

    // 総回答数
    const { count: totalResponses } = await supabaseAdmin
      .from('form_responses')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenant.id)

    // 本日の回答数
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const { count: todayResponses } = await supabaseAdmin
      .from('form_responses')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenant.id)
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
