import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getTenantByKey } from '@/lib/tenant'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    // 配信履歴一覧取得
    const { tenantKey } = req.query

    if (!tenantKey || typeof tenantKey !== 'string') {
      return res.status(400).json({ error: 'Tenant key is required' })
    }

    const tenant = await getTenantByKey(tenantKey)
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' })
    }

    try {
      const { data: history, error } = await supabaseAdmin
        .from('delivery_history')
        .select('*, segments(name)')
        .eq('tenant_id', tenant.id)
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
    const { deliveryId, tenantKey } = req.body

    if (!deliveryId || !tenantKey) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const tenant = await getTenantByKey(tenantKey)
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' })
    }

    try {
      const { data: history, error: historyError } = await supabaseAdmin
        .from('delivery_history')
        .select('*, segments(name)')
        .eq('id', deliveryId)
        .eq('tenant_id', tenant.id)
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
