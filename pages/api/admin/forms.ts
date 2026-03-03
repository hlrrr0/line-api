import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantByKey } from '@/lib/tenant'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    // フォーム定義一覧取得
    const { tenantKey } = req.query

    if (!tenantKey || typeof tenantKey !== 'string') {
      return res.status(400).json({ error: 'Tenant key is required' })
    }

    const tenant = await getTenantByKey(tenantKey)
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' })
    }

    try {
      const { data: forms, error } = await supabaseAdmin
        .from('form_definitions')
        .select('*')
        .eq('tenant_id', tenant.id)
        .order('created_at', { ascending: false })

      if (error) {
        throw error
      }

      return res.status(200).json({ forms })
    } catch (error) {
      console.error('Error fetching forms:', error)
      return res.status(500).json({ error: 'Internal server error' })
    }
  } else if (req.method === 'POST') {
    // フォーム定義作成
    const { tenantKey, name, description, fields, is_active } = req.body

    if (!tenantKey || !name || !fields) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const tenant = await getTenantByKey(tenantKey)
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' })
    }

    try {
      const { data: form, error } = await supabaseAdmin
        .from('form_definitions')
        .insert({
          tenant_id: tenant.id,
          name,
          description: description || '',
          fields,
          is_active: is_active !== undefined ? is_active : true,
        })
        .select()
        .single()

      if (error) {
        throw error
      }

      return res.status(201).json({ form })
    } catch (error) {
      console.error('Error creating form:', error)
      return res.status(500).json({ error: 'Internal server error' })
    }
  } else if (req.method === 'PUT') {
    // フォーム定義更新
    const { id, name, description, fields, is_active } = req.body

    if (!id) {
      return res.status(400).json({ error: 'Form ID is required' })
    }

    try {
      const updateData: any = {}
      if (name !== undefined) updateData.name = name
      if (description !== undefined) updateData.description = description
      if (fields !== undefined) updateData.fields = fields
      if (is_active !== undefined) updateData.is_active = is_active

      const { data: form, error } = await supabaseAdmin
        .from('form_definitions')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        throw error
      }

      return res.status(200).json({ form })
    } catch (error) {
      console.error('Error updating form:', error)
      return res.status(500).json({ error: 'Internal server error' })
    }
  } else if (req.method === 'DELETE') {
    // フォーム定義削除
    const { id } = req.body

    if (!id) {
      return res.status(400).json({ error: 'Form ID is required' })
    }

    try {
      const { error } = await supabaseAdmin
        .from('form_definitions')
        .delete()
        .eq('id', id)

      if (error) {
        throw error
      }

      return res.status(200).json({ success: true })
    } catch (error) {
      console.error('Error deleting form:', error)
      return res.status(500).json({ error: 'Internal server error' })
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' })
  }
}
