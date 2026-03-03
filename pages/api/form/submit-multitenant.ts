import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getTenantByKey } from '@/lib/tenant'
import { getLineProfile } from '@/lib/line-multitenant'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { tenantKey, userId, formData } = req.body

  if (!tenantKey || !userId || !formData) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  try {
    // テナント情報を取得
    const tenant = await getTenantByKey(tenantKey)
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' })
    }

    // ユーザー情報を取得または作成
    let { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('tenant_id', tenant.id)
      .eq('line_user_id', userId)
      .single()

    if (userError || !user) {
      // 新規ユーザーの場合、LINEプロフィールを取得して登録
      const profile = await getLineProfile(tenant, userId)

      const { data: newUser, error: insertError } = await supabaseAdmin
        .from('users')
        .insert({
          tenant_id: tenant.id,
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
        tenant_id: tenant.id,
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
          .upsert(
            { tenant_id: tenant.id, name: interest },
            { onConflict: 'tenant_id,name' }
          )
          .select()
          .single()

        if (!tagError && tag) {
          // ユーザーにタグを紐付け
          await supabaseAdmin
            .from('user_tags')
            .upsert({
              tenant_id: tenant.id,
              user_id: user.id,
              tag_id: tag.id
            })
        }
      }
    }

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Form submission error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
