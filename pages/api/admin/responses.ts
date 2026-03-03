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
    return res.status(400).json({ error: 'Tenant key is required' })
  }

  const tenant = await getTenantByKey(tenantKey)
  if (!tenant) {
    return res.status(404).json({ error: 'Tenant not found' })
  }

  try {
    // tenant_idがNULLの場合も含めて取得（マルチテナント移行前のデータ対応）
    const { data: responses, error } = await supabaseAdmin
      .from('form_responses')
      .select('*, users(id, display_name, line_user_id)')
      .or(`tenant_id.eq.${tenant.id},tenant_id.is.null`)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Supabase error:', error)
      throw error
    }

    console.log(`Found ${responses?.length || 0} responses for tenant ${tenantKey}`)

    // フォーム定義を取得（一覧表示用）
    const { data: formDefinitions } = await supabaseAdmin
      .from('form_definitions')
      .select('*')
      .eq('tenant_id', tenant.id)
      .order('created_at', { ascending: false })

    return res.status(200).json({ responses: responses || [], formDefinitions: formDefinitions || [] })
  } catch (error) {
    console.error('Error fetching form responses:', error)
    return res.status(500).json({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' })
  }
}
