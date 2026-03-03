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

  try {
    const tenant = await getTenantByKey(tenantKey)
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' })
    }

    // アクティブなフォーム定義を取得（最新のものを1つ）
    const { data: forms, error } = await supabaseAdmin
      .from('form_definitions')
      .select('*')
      .eq('tenant_id', tenant.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)

    // テーブルが存在しない、またはフォームがない場合はデフォルトを返す
    if (error || !forms || forms.length === 0) {
      console.log('No form definition found, using default:', error?.message)
      return res.status(200).json({
        form: null,
        useDefault: true
      })
    }

    return res.status(200).json({ form: forms[0] })
  } catch (error) {
    console.error('Error fetching form definition:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
