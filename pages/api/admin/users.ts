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
    // tenant_idがNULLの場合も含めて取得（マルチテナント移行前のデータ対応）
    let query = supabaseAdmin
      .from('users')
      .select('*')
      .or(`tenant_id.eq.${tenant.id},tenant_id.is.null`)
      .order('created_at', { ascending: false })

    if (filter === 'active') {
      query = query.eq('is_blocked', false)
    } else if (filter === 'blocked') {
      query = query.eq('is_blocked', true)
    }

    const { data: users, error } = await query

    if (error) {
      console.error('Supabase error:', error)
      throw error
    }

    console.log(`Found ${users?.length || 0} users for tenant ${tenantKey}`)

    return res.status(200).json({ users: users || [] })
  } catch (error) {
    console.error('Error fetching users:', error)
    return res.status(500).json({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' })
  }
}
