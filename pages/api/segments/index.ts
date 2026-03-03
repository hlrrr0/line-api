import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantByKey } from '@/lib/tenant'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    // セグメント一覧取得
    const { tenantKey } = req.query

    if (!tenantKey || typeof tenantKey !== 'string') {
      return res.status(400).json({ error: 'Tenant key is required' })
    }

    const tenant = await getTenantByKey(tenantKey)
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' })
    }

    try {
      const { data: segments, error } = await supabaseAdmin
        .from('segments')
        .select('*')
        .eq('tenant_id', tenant.id)
        .order('created_at', { ascending: false })

      if (error) {
        throw error
      }

      return res.status(200).json({ segments })
    } catch (error) {
      console.error('Error fetching segments:', error)
      return res.status(500).json({ error: 'Internal server error' })
    }
  } else if (req.method === 'POST') {
    // セグメント作成
    const { tenantKey, name, description, conditions } = req.body

    if (!tenantKey || !name || !conditions) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const tenant = await getTenantByKey(tenantKey)
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' })
    }

    try {
      const { data: segment, error } = await supabaseAdmin
        .from('segments')
        .insert({
          tenant_id: tenant.id,
          name,
          description: description || '',
          conditions,
        })
        .select()
        .single()

      if (error) {
        throw error
      }

      return res.status(201).json({ segment })
    } catch (error) {
      console.error('Error creating segment:', error)
      return res.status(500).json({ error: 'Internal server error' })
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' })
  }
}
