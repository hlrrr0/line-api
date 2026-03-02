import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabase'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { filter = 'all' } = req.query

  try {
    let query = supabaseAdmin
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })

    if (filter === 'active') {
      query = query.eq('is_blocked', false)
    } else if (filter === 'blocked') {
      query = query.eq('is_blocked', true)
    }

    const { data: users, error } = await query

    if (error) {
      throw error
    }

    return res.status(200).json({ users })
  } catch (error) {
    console.error('Error fetching users:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
