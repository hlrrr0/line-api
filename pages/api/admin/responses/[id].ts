import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabase'

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

    return res.status(200).json({ response })
  } catch (error) {
    console.error('Error fetching response detail:', error)
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    })
  }
}
