import type { NextApiRequest, NextApiResponse } from 'next'
import { getAllTenants, createTenant, updateTenant } from '@/lib/tenant'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    // テナント一覧取得
    try {
      const tenants = await getAllTenants()

      // セキュリティのため、トークンとシークレットは返さない
      const safeTenants = tenants.map(t => ({
        id: t.id,
        tenant_key: t.tenant_key,
        name: t.name,
        line_channel_id: t.line_channel_id,
        liff_id: t.liff_id,
        is_active: t.is_active,
        created_at: t.created_at,
        updated_at: t.updated_at,
      }))

      return res.status(200).json({ tenants: safeTenants })
    } catch (error) {
      console.error('Error fetching tenants:', error)
      return res.status(500).json({ error: 'Internal server error' })
    }
  } else if (req.method === 'POST') {
    // テナント作成
    const {
      tenant_key,
      name,
      line_channel_id,
      line_channel_secret,
      line_channel_access_token,
      liff_id,
      settings,
    } = req.body

    if (!tenant_key || !name || !line_channel_id || !line_channel_secret || !line_channel_access_token) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    try {
      const tenant = await createTenant({
        tenant_key,
        name,
        line_channel_id,
        line_channel_secret,
        line_channel_access_token,
        liff_id,
        settings,
      })

      if (!tenant) {
        return res.status(500).json({ error: 'Failed to create tenant' })
      }

      return res.status(201).json({ tenant })
    } catch (error) {
      console.error('Error creating tenant:', error)
      return res.status(500).json({ error: 'Internal server error' })
    }
  } else if (req.method === 'PUT') {
    // テナント更新
    const { id, ...updateData } = req.body

    if (!id) {
      return res.status(400).json({ error: 'Tenant ID is required' })
    }

    // 空の値を除外（secretとtokenは空の場合は更新しない）
    const filteredData: any = {}
    Object.keys(updateData).forEach(key => {
      const value = updateData[key]
      if (value !== '' && value !== null && value !== undefined) {
        filteredData[key] = value
      }
    })

    try {
      const tenant = await updateTenant(id, filteredData)
      if (!tenant) {
        return res.status(404).json({ error: 'Tenant not found' })
      }
      return res.status(200).json({ tenant })
    } catch (error) {
      console.error('Error updating tenant:', error)
      return res.status(500).json({ error: 'Internal server error' })
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' })
  }
}
