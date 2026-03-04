import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabase-admin'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'User ID is required' })
  }

  if (req.method === 'GET') {
    return handleGet(id, res)
  } else if (req.method === 'PATCH') {
    return handlePatch(id, req, res)
  } else {
    return res.status(405).json({ error: 'Method not allowed' })
  }
}

async function handleGet(id: string, res: NextApiResponse) {
  try {
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', id)
      .single()

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // フォーム回答履歴を取得（form_definition_idがある場合はJOIN）
    const { data: rawResponses } = await supabaseAdmin
      .from('form_responses')
      .select('*, form_definitions(name, fields)')
      .eq('user_id', id)
      .order('created_at', { ascending: false })

    // form_definition_idが無い旧データ向け: テナントのフォーム定義を取得してマッチング
    const responses = rawResponses || []
    const responsesWithoutDef = responses.filter((r: any) => !r.form_definitions)

    if (responsesWithoutDef.length > 0 && user.tenant_id) {
      const { data: allForms } = await supabaseAdmin
        .from('form_definitions')
        .select('id, name, fields')
        .eq('tenant_id', user.tenant_id)

      if (allForms && allForms.length > 0) {
        for (const resp of responsesWithoutDef) {
          const formDataKeys = Object.keys(resp.form_data || {}).filter(k => !k.startsWith('_'))
          let bestMatch: any = null
          let bestScore = 0

          for (const form of allForms) {
            const fieldIds = (form.fields || []).map((f: any) => f.id)
            const matches = formDataKeys.filter((k: string) => fieldIds.includes(k)).length
            if (matches > bestScore) {
              bestScore = matches
              bestMatch = form
            }
          }

          if (bestMatch && bestScore > 0) {
            resp.form_definitions = { name: bestMatch.name, fields: bestMatch.fields }
          }
        }
      }
    }

    // メッセージ履歴を取得（最新50件、降順で取得して昇順に並び替え）
    const { data: messagesDesc } = await supabaseAdmin
      .from('messages')
      .select('*')
      .or(`user_id.eq.${id},line_user_id.eq.${user.line_user_id}`)
      .order('created_at', { ascending: false })
      .limit(50)
    const messages = (messagesDesc ?? []).reverse()

    // 未読メッセージを既読にする
    const unreadIds = (messages ?? [])
      .filter(m => m.direction === 'received' && m.read_at === null)
      .map(m => m.id)
    if (unreadIds.length > 0) {
      await supabaseAdmin
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .in('id', unreadIds)
    }

    // タグを取得
    const { data: userTags } = await supabaseAdmin
      .from('user_tags')
      .select('tag_id, tags(id, name)')
      .eq('user_id', id)

    // ノートを取得
    const { data: notes } = await supabaseAdmin
      .from('user_notes')
      .select('*')
      .eq('user_id', id)
      .order('created_at', { ascending: false })

    return res.status(200).json({
      user,
      responses: responses || [],
      messages: messages || [],
      tags: userTags?.map((ut: any) => ut.tags).filter(Boolean) || [],
      notes: notes || [],
    })
  } catch (error) {
    console.error('Error fetching user:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

async function handlePatch(id: string, req: NextApiRequest, res: NextApiResponse) {
  try {
    const { support_status, assignee_name, display_name } = req.body
    const updateData: Record<string, any> = {}

    if (support_status !== undefined) updateData.support_status = support_status
    if (assignee_name !== undefined) updateData.assignee_name = assignee_name
    if (display_name !== undefined) updateData.display_name = display_name

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No fields to update' })
    }

    const { data, error } = await supabaseAdmin
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    return res.status(200).json({ user: data })
  } catch (error) {
    console.error('Error updating user:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
