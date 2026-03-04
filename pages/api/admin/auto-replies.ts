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
    .select('id')
    .eq('tenant_key', tenantKey)
    .eq('is_active', true)
    .single()

  if (tenantError || !tenant) {
    return res.status(404).json({ error: 'Tenant not found' })
  }

  if (req.method === 'GET') {
    const { data: rules, error } = await supabaseAdmin
      .from('auto_reply_rules')
      .select('*')
      .eq('tenant_id', tenant.id)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      return res.status(500).json({ error: 'Internal server error' })
    }

    return res.status(200).json({ rules: rules || [] })
  }

  if (req.method === 'POST') {
    const { keyword, match_type, reply_messages } = req.body

    if (!keyword || typeof keyword !== 'string' || !keyword.trim()) {
      return res.status(400).json({ error: 'keyword is required' })
    }

    if (!Array.isArray(reply_messages) || reply_messages.length === 0) {
      return res.status(400).json({ error: 'reply_messages is required' })
    }

    const filtered = reply_messages
      .filter((m: string) => typeof m === 'string' && m.trim() !== '')
      .slice(0, 5)

    if (filtered.length === 0) {
      return res.status(400).json({ error: 'At least one message is required' })
    }

    const { data, error } = await supabaseAdmin
      .from('auto_reply_rules')
      .insert({
        tenant_id: tenant.id,
        keyword: keyword.trim(),
        match_type: match_type || 'contains',
        reply_messages: filtered,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating auto reply rule:', error)
      return res.status(500).json({ error: 'Internal server error' })
    }

    return res.status(201).json({ rule: data })
  }

  if (req.method === 'PUT') {
    const { id, keyword, match_type, reply_messages, is_active, priority } = req.body

    if (!id) {
      return res.status(400).json({ error: 'id is required' })
    }

    const updateData: Record<string, any> = { updated_at: new Date().toISOString() }

    if (keyword !== undefined) updateData.keyword = keyword.trim()
    if (match_type !== undefined) updateData.match_type = match_type
    if (is_active !== undefined) updateData.is_active = is_active
    if (priority !== undefined) updateData.priority = priority

    if (reply_messages !== undefined) {
      const filtered = reply_messages
        .filter((m: string) => typeof m === 'string' && m.trim() !== '')
        .slice(0, 5)
      updateData.reply_messages = filtered
    }

    const { data, error } = await supabaseAdmin
      .from('auto_reply_rules')
      .update(updateData)
      .eq('id', id)
      .eq('tenant_id', tenant.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating auto reply rule:', error)
      return res.status(500).json({ error: 'Internal server error' })
    }

    return res.status(200).json({ rule: data })
  }

  if (req.method === 'DELETE') {
    const { id } = req.body

    if (!id) {
      return res.status(400).json({ error: 'id is required' })
    }

    const { error } = await supabaseAdmin
      .from('auto_reply_rules')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenant.id)

    if (error) {
      console.error('Error deleting auto reply rule:', error)
      return res.status(500).json({ error: 'Internal server error' })
    }

    return res.status(200).json({ success: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
