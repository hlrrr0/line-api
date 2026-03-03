import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabase'
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
    return res.status(400).json({ error: 'Tenant key is required' })
  }

  const tenant = await getTenantByKey(tenantKey)
  if (!tenant) {
    return res.status(404).json({ error: 'Tenant not found' })
  }

  try {
    const { data: responses, error } = await supabaseAdmin
      .from('form_responses')
      .select('*, users(id, display_name, line_user_id)')
      .eq('tenant_id', tenant.id)
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    return res.status(200).json({ responses })
  } catch (error) {
    console.error('Error fetching form responses:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
