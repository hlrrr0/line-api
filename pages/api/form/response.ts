import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getTenantByKey } from '@/lib/tenant'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { tenantKey, userId, formId } = req.query

  if (!tenantKey || typeof tenantKey !== 'string' || !userId || typeof userId !== 'string') {
    return res.status(400).json({ error: 'tenantKey and userId are required' })
  }

  try {
    const tenant = await getTenantByKey(tenantKey)
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' })
    }

    // LINE user IDから内部user_idを取得
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('tenant_id', tenant.id)
      .eq('line_user_id', userId)
      .single()

    if (!user) {
      return res.status(200).json({ formData: null })
    }

    // 既存回答を取得
    let query = supabaseAdmin
      .from('form_responses')
      .select('form_data')
      .eq('tenant_id', tenant.id)
      .eq('user_id', user.id)

    if (formId && typeof formId === 'string') {
      query = query.eq('form_definition_id', formId)
    } else {
      query = query.is('form_definition_id', null)
    }

    const { data } = await query.maybeSingle()

    return res.status(200).json({ formData: data?.form_data ?? null })
  } catch (error) {
    console.error('Error fetching form response:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
