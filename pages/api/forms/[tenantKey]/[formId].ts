import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getTenantByKey } from '@/lib/tenant'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { tenantKey, formId } = req.query

  if (!tenantKey || typeof tenantKey !== 'string' || !formId || typeof formId !== 'string') {
    return res.status(400).json({ error: 'Invalid parameters' })
  }

  try {
    const tenant = await getTenantByKey(tenantKey)
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' })
    }

    const { data: form, error } = await supabaseAdmin
      .from('form_definitions')
      .select('*')
      .eq('id', formId)
      .eq('tenant_id', tenant.id)
      .single()

    if (error || !form) {
      return res.status(404).json({ error: 'Form not found' })
    }

    return res.status(200).json({ form, tenant: { id: tenant.id, liff_id: tenant.liff_id } })
  } catch (error) {
    console.error('Error fetching form:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
