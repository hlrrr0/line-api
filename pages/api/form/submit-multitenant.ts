import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getTenantByKey } from '@/lib/tenant'
import { getLineProfile, sendTextMessage } from '@/lib/line-multitenant'
import { notifyFormSubmission } from '@/lib/slack'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { tenantKey, userId, formData, source, formId } = req.body

  if (!tenantKey || !formData) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  try {
    // テナント情報を取得
    const tenant = await getTenantByKey(tenantKey)
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' })
    }

    let user: any = null

    if (userId) {
      // LINE認証済み: ユーザー情報を取得または作成
      const { data: existingUser } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('tenant_id', tenant.id)
        .eq('line_user_id', userId)
        .single()

      if (existingUser) {
        user = existingUser
      } else {
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

        if (insertError) throw insertError
        user = newUser
      }
    }

    // フォーム回答を保存（source付き、user_idは任意）
    // LINE認証済みユーザーは1フォーム1回答（再回答は上書き）
    const formDataToSave = source ? { ...formData, _source: source } : formData
    const formDefId = formId || null

    if (user) {
      // 既存の回答があるか確認
      let existingQuery = supabaseAdmin
        .from('form_responses')
        .select('id')
        .eq('tenant_id', tenant.id)
        .eq('user_id', user.id)

      if (formDefId) {
        existingQuery = existingQuery.eq('form_definition_id', formDefId)
      } else {
        existingQuery = existingQuery.is('form_definition_id', null)
      }

      const { data: existing } = await existingQuery.maybeSingle()

      if (existing) {
        // 既存回答を上書き
        const { error: updateError } = await supabaseAdmin
          .from('form_responses')
          .update({
            form_data: formDataToSave,
          })
          .eq('id', existing.id)
        if (updateError) throw updateError
      } else {
        // 新規回答
        const responseData: Record<string, any> = {
          tenant_id: tenant.id,
          user_id: user.id,
          form_data: formDataToSave,
        }
        if (formDefId) responseData.form_definition_id = formDefId

        const { error: insertError } = await supabaseAdmin
          .from('form_responses')
          .insert(responseData)
        if (insertError) throw insertError
      }
    } else {
      // 未認証ユーザーは常に新規作成
      const responseData: Record<string, any> = {
        tenant_id: tenant.id,
        form_data: formDataToSave,
      }
      if (formDefId) responseData.form_definition_id = formDefId

      const { error: insertError } = await supabaseAdmin
        .from('form_responses')
        .insert(responseData)
      if (insertError) throw insertError
    }

    // タグの自動付与（LINE認証済みユーザーのみ）
    if (user && formData.interests && Array.isArray(formData.interests)) {
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

    // LINE認証済みユーザーに完了メッセージを送信
    if (userId) {
      try {
        await sendTextMessage(tenant, userId, 'アンケートにご回答いただきありがとうございます。\nあなたに合った求人情報をお届けしますので、お楽しみに！')
      } catch (e) {
        console.error('Error sending completion message:', e)
      }
    }

    // Slack通知（テナントにwebhook URLが設定されている場合）
    const slackWebhookUrl = tenant.settings?.slack_webhook_url
    if (slackWebhookUrl) {
      // フォーム定義（名前 + フィールド情報）を取得
      let formName: string | null = null
      let formFields: any[] | null = null
      if (formDefId) {
        const { data: formDef } = await supabaseAdmin
          .from('form_definitions')
          .select('name, fields')
          .eq('id', formDefId)
          .single()
        formName = formDef?.name || null
        formFields = formDef?.fields || null
      }

      const host = req.headers.host || 'localhost:3000'
      const protocol = host.includes('localhost') ? 'http' : 'https'
      const adminUrl = `${protocol}://${host}/admin/${tenantKey}/responses`

      notifyFormSubmission(slackWebhookUrl, {
        tenantName: tenant.name,
        userName: user?.display_name || null,
        formName,
        formData,
        formFields,
        adminUrl,
      }).catch(err => console.error('Slack notification error:', err))
    }

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Form submission error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
