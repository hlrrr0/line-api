import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabase-admin'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'User ID is required' })
  }

  if (req.method === 'POST') {
    return handleAddTag(id, req, res)
  } else if (req.method === 'DELETE') {
    return handleRemoveTag(id, req, res)
  } else {
    return res.status(405).json({ error: 'Method not allowed' })
  }
}

async function handleAddTag(userId: string, req: NextApiRequest, res: NextApiResponse) {
  const { tagName, tenantId } = req.body
  if (!tagName || !tenantId) {
    return res.status(400).json({ error: 'tagName and tenantId are required' })
  }

  try {
    // タグを upsert（既存ならそのまま、なければ作成）
    const { data: tag, error: tagError } = await supabaseAdmin
      .from('tags')
      .upsert({ tenant_id: tenantId, name: tagName }, { onConflict: 'tenant_id,name' })
      .select()
      .single()

    if (tagError || !tag) {
      return res.status(500).json({ error: tagError?.message || 'Failed to create tag' })
    }

    // user_tags に追加
    const { error: linkError } = await supabaseAdmin
      .from('user_tags')
      .upsert(
        { tenant_id: tenantId, user_id: userId, tag_id: tag.id },
        { onConflict: 'tenant_id,user_id,tag_id' }
      )

    if (linkError) {
      return res.status(500).json({ error: linkError.message })
    }

    return res.status(200).json({ tag })
  } catch (error) {
    console.error('Error adding tag:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

async function handleRemoveTag(userId: string, req: NextApiRequest, res: NextApiResponse) {
  const { tagId, tenantId } = req.body
  if (!tagId || !tenantId) {
    return res.status(400).json({ error: 'tagId and tenantId are required' })
  }

  try {
    const { error } = await supabaseAdmin
      .from('user_tags')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)
      .eq('tag_id', tagId)

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Error removing tag:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
