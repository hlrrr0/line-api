import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabase-admin'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'User ID is required' })
  }

  if (req.method === 'POST') {
    return handleCreate(id, req, res)
  } else if (req.method === 'DELETE') {
    return handleDelete(req, res)
  } else {
    return res.status(405).json({ error: 'Method not allowed' })
  }
}

async function handleCreate(userId: string, req: NextApiRequest, res: NextApiResponse) {
  const { content, tenantId, createdBy } = req.body
  if (!content || !tenantId) {
    return res.status(400).json({ error: 'content and tenantId are required' })
  }

  try {
    const { data: note, error } = await supabaseAdmin
      .from('user_notes')
      .insert({
        tenant_id: tenantId,
        user_id: userId,
        content,
        created_by: createdBy || null,
      })
      .select()
      .single()

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    return res.status(200).json({ note })
  } catch (error) {
    console.error('Error creating note:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

async function handleDelete(req: NextApiRequest, res: NextApiResponse) {
  const { noteId } = req.body
  if (!noteId) {
    return res.status(400).json({ error: 'noteId is required' })
  }

  try {
    const { error } = await supabaseAdmin
      .from('user_notes')
      .delete()
      .eq('id', noteId)

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Error deleting note:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
