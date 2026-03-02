import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabase'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    // セグメント一覧取得
    try {
      const { data: segments, error } = await supabaseAdmin
        .from('segments')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        throw error
      }

      return res.status(200).json({ segments })
    } catch (error) {
      console.error('Error fetching segments:', error)
      return res.status(500).json({ error: 'Internal server error' })
    }
  } else if (req.method === 'POST') {
    // セグメント作成
    const { name, description, conditions } = req.body

    if (!name || !conditions) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    try {
      const { data: segment, error } = await supabaseAdmin
        .from('segments')
        .insert({
          name,
          description: description || '',
          conditions,
        })
        .select()
        .single()

      if (error) {
        throw error
      }

      return res.status(201).json({ segment })
    } catch (error) {
      console.error('Error creating segment:', error)
      return res.status(500).json({ error: 'Internal server error' })
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' })
  }
}
