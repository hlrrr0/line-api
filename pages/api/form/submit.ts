import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabase'
import { getLineProfile } from '@/lib/line'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { userId, formData } = req.body

  if (!userId || !formData) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  try {
    // ユーザー情報を取得または作成
    let { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('line_user_id', userId)
      .single()

    if (userError || !user) {
      // 新規ユーザーの場合、LINEプロフィールを取得して登録
      const profile = await getLineProfile(userId)
      
      const { data: newUser, error: insertError } = await supabaseAdmin
        .from('users')
        .insert({
          line_user_id: userId,
          display_name: profile?.displayName || '',
          picture_url: profile?.pictureUrl || '',
          status_message: profile?.statusMessage || '',
        })
        .select()
        .single()

      if (insertError) {
        throw insertError
      }

      user = newUser
    }

    // フォーム回答を保存
    const { error: responseError } = await supabaseAdmin
      .from('form_responses')
      .insert({
        user_id: user.id,
        form_data: formData,
      })

    if (responseError) {
      throw responseError
    }

    // タグの自動付与（興味のあるジャンルをタグとして登録）
    if (formData.interests && Array.isArray(formData.interests)) {
      for (const interest of formData.interests) {
        // タグが存在しない場合は作成
        const { data: tag, error: tagError } = await supabaseAdmin
          .from('tags')
          .upsert({ name: interest }, { onConflict: 'name' })
          .select()
          .single()

        if (!tagError && tag) {
          // ユーザーにタグを紐付け
          await supabaseAdmin
            .from('user_tags')
            .upsert({ user_id: user.id, tag_id: tag.id })
        }
      }
    }

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Form submission error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
