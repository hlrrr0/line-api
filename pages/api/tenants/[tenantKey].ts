import type { NextApiRequest, NextApiResponse } from 'next'
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

  // セキュリティのため、トークンは返さない
  return res.status(200).json({
    tenant: {
      id: tenant.id,
      tenant_key: tenant.tenant_key,
      name: tenant.name,
      liff_id: tenant.liff_id,
      is_active: tenant.is_active,
    }
  })
}
