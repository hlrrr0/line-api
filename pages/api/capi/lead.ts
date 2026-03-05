import type { NextApiRequest, NextApiResponse } from 'next'
import { getTenantByKey } from '@/lib/tenant'
import crypto from 'crypto'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { tenantKey, fbc, eventSourceUrl, lineUserId } = req.body

  if (!tenantKey || !fbc) {
    return res.status(400).json({ error: 'Missing required fields (tenantKey, fbc)' })
  }

  try {
    const tenant = await getTenantByKey(tenantKey)
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' })
    }

    const pixelId = tenant.meta_pixel_id
    const accessToken = tenant.settings?.meta_capi_access_token || process.env.META_CAPI_ACCESS_TOKEN

    if (!pixelId || !accessToken) {
      return res.status(400).json({ error: 'Meta Pixel ID or CAPI access token not configured' })
    }

    // ユーザーデータ（外部IDとしてLINE user IDをハッシュ化して送信）
    const userData: Record<string, any> = {
      fbc,
    }

    if (lineUserId) {
      userData.external_id = [crypto.createHash('sha256').update(lineUserId).digest('hex')]
    }

    const eventData = {
      data: [
        {
          event_name: 'Lead',
          event_time: Math.floor(Date.now() / 1000),
          action_source: 'website',
          event_source_url: eventSourceUrl || '',
          user_data: userData,
        },
      ],
    }

    const url = `https://graph.facebook.com/v21.0/${pixelId}/events?access_token=${accessToken}`

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventData),
    })

    const result = await response.json()

    if (!response.ok) {
      console.error('Meta CAPI error:', result)
      return res.status(500).json({ error: 'CAPI request failed', detail: result })
    }

    return res.status(200).json({ success: true, result })
  } catch (error) {
    console.error('CAPI lead event error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
