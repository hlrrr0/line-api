import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabase-admin'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { tenantKey } = req.query

  if (!tenantKey || typeof tenantKey !== 'string') {
    return res.status(400).json({ error: 'tenantKey is required' })
  }

  // テナント取得
  const { data: tenant, error: tenantError } = await supabaseAdmin
    .from('tenants')
    .select('id, welcome_messages')
    .eq('tenant_key', tenantKey)
    .eq('is_active', true)
    .single()

  if (tenantError || !tenant) {
    return res.status(404).json({ error: 'Tenant not found' })
  }

  if (req.method === 'GET') {
    return res.status(200).json({
      messages: tenant.welcome_messages || [],
    })
  }

  if (req.method === 'PUT') {
    const { messages } = req.body

    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages must be an array' })
    }

    // 最大5件、空文字除外
    const filtered = messages
      .filter((m: string) => typeof m === 'string' && m.trim() !== '')
      .slice(0, 5)

    const { error } = await supabaseAdmin
      .from('tenants')
      .update({ welcome_messages: filtered })
      .eq('id', tenant.id)

    if (error) {
      console.error('Error updating welcome messages:', error)
      return res.status(500).json({ error: 'Internal server error' })
    }

    return res.status(200).json({ messages: filtered })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
