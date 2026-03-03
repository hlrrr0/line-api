import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabase-admin'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { id } = req.query

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Response ID is required' })
  }

  try {
    const { data: response, error } = await supabaseAdmin
      .from('form_responses')
      .select('*, users(id, display_name, line_user_id, picture_url)')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Supabase error:', error)
      throw error
    }

    if (!response) {
      return res.status(404).json({ error: 'Response not found' })
    }

    // フォーム定義を取得（ラベル表示用）
    // form_data のキーと fields の id が最も多く一致するフォームを選ぶ
    let formDefinition = null
    const formDataKeys = Object.keys(response.form_data || {})

    if (formDataKeys.length > 0) {
      const query = supabaseAdmin
        .from('form_definitions')
        .select('*')
        .order('created_at', { ascending: false })

      if (response.tenant_id) {
        query.eq('tenant_id', response.tenant_id)
      }

      const { data: allForms } = await query

      if (allForms && allForms.length > 0) {
        const scored = allForms.map(form => {
          const fieldIds = (form.fields || []).map((f: { id: string }) => f.id)
          const matches = formDataKeys.filter(k => fieldIds.includes(k)).length
          return { form, matches }
        })
        scored.sort((a, b) => b.matches - a.matches)
        if (scored[0].matches > 0) {
          formDefinition = scored[0].form
        }
      }
    }

    return res.status(200).json({ 
      response,
      formDefinition 
    })
  } catch (error) {
    console.error('Error fetching response detail:', error)
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    })
  }
}
