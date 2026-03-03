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

  const { tenantKey, filter = 'all' } = req.query

  if (!tenantKey || typeof tenantKey !== 'string') {
    return res.status(400).json({ error: 'Tenant key is required' })
  }

  const tenant = await getTenantByKey(tenantKey)
  if (!tenant) {
    return res.status(404).json({ error: 'Tenant not found' })
  }

  try {
    let query = supabaseAdmin
      .from('users')
      .select('*')
      .eq('tenant_id', tenant.id)
      .order('created_at', { ascending: false })

    if (filter === 'active') {
      query = query.eq('is_blocked', false)
    } else if (filter === 'blocked') {
      query = query.eq('is_blocked', true)
    }

    const { data: users, error } = await query

    if (error) {
      throw error
    }

    return res.status(200).json({ users })
  } catch (error) {
    console.error('Error fetching users:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
