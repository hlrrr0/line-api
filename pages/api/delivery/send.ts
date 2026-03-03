import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantByKey } from '@/lib/tenant'
import { sendBulkMessages } from '@/lib/line-multitenant'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { tenantKey, segmentId, messageType, messageContent } = req.body

  if (!tenantKey || !messageType || !messageContent) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  // テナント情報を取得
  const tenant = await getTenantByKey(tenantKey)
  if (!tenant) {
    return res.status(404).json({ error: 'Tenant not found' })
  }

  try {
    // 対象ユーザーを取得
    let targetUsers: any[] = []

    if (segmentId) {
      // セグメント配信
      const { data: segment } = await supabaseAdmin
        .from('segments')
        .select('*')
        .eq('id', segmentId)
        .eq('tenant_id', tenant.id)
        .single()

      if (!segment) {
        return res.status(404).json({ error: 'Segment not found' })
      }

      targetUsers = await getUsersBySegment(segment.conditions, tenant.id)
    } else {
      // 全体配信
      const { data: users } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('tenant_id', tenant.id)
        .eq('is_blocked', false)

      targetUsers = users || []
    }

    if (targetUsers.length === 0) {
      return res.status(400).json({ error: 'No target users found' })
    }

    // 配信履歴登録
    const { data: history, error: historyError } = await supabaseAdmin
      .from('delivery_history')
      .insert({
        tenant_id: tenant.id,
        segment_id: segmentId || null,
        message_type: messageType,
        message_content: messageContent,
        status: 'processing',
        total_recipients: targetUsers.length,
      })
      .select()
      .single()

    if (historyError) {
      throw historyError
    }

    // メッセージ送信
    const userIds = targetUsers.map(user => user.line_user_id)
    const messages = buildMessages(messageType, messageContent)
    
    const { success, failure, results } = await sendBulkMessages(tenant, userIds, messages)

    // 配信結果を記録
    await supabaseAdmin
      .from('delivery_history')
      .update({
        status: 'completed',
        success_count: success,
        failure_count: failure,
        sent_at: new Date().toISOString(),
      })
      .eq('id', history.id)

    // 個別配信ログを記録
    const logs = results.map((result, index) => ({
      tenant_id: tenant.id,
      delivery_history_id: history.id,
      user_id: targetUsers[index].id,
      status: result.status === 'fulfilled' ? 'success' : 'failed',
      error_message: result.status === 'rejected' ? String(result.reason) : null,
    }))

    await supabaseAdmin.from('delivery_logs').insert(logs)

    return res.status(200).json({
      success: true,
      deliveryId: history.id,
      totalRecipients: targetUsers.length,
      successCount: success,
      failureCount: failure,
    })
  } catch (error) {
    console.error('Message delivery error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

// セグメント条件に基づいてユーザーを取得
async function getUsersBySegment(conditions: any, tenantId: string): Promise<any[]> {
  let query = supabaseAdmin
    .from('users')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_blocked', false)

  // タグによる絞り込み
  if (conditions.tags && conditions.tags.length > 0) {
    const { data: userTags } = await supabaseAdmin
      .from('user_tags')
      .select('user_id, tags(name)')
      .eq('tenant_id', tenantId)
      .in('tags.name', conditions.tags)

    if (userTags) {
      const userIds = userTags.map(ut => ut.user_id)
      query = query.in('id', userIds)
    }
  }

  // 回答内容による絞り込み（例：年齢範囲）
  if (conditions.ageMin || conditions.ageMax) {
    const { data: responses } = await supabaseAdmin
      .from('form_responses')
      .select('user_id, form_data')
      .eq('tenant_id', tenantId)

    if (responses) {
      const filteredUserIds = responses
        .filter(r => {
          const age = parseInt(r.form_data.age)
          if (isNaN(age)) return false
          if (conditions.ageMin && age < conditions.ageMin) return false
          if (conditions.ageMax && age > conditions.ageMax) return false
          return true
        })
        .map(r => r.user_id)

      query = query.in('id', filteredUserIds)
    }
  }

  const { data: users } = await query
  return users || []
}

// メッセージオブジェクトを構築
function buildMessages(messageType: string, messageContent: any): any[] {
  switch (messageType) {
    case 'text':
      return [{
        type: 'text',
        text: messageContent.text,
      }]
    
    case 'image':
      return [{
        type: 'image',
        originalContentUrl: messageContent.originalContentUrl,
        previewImageUrl: messageContent.previewImageUrl,
      }]
    
    case 'flex':
      return [{
        type: 'flex',
        altText: messageContent.altText,
        contents: messageContent.contents,
      }]
    
    default:
      return [{
        type: 'text',
        text: messageContent.text || 'メッセージ',
      }]
  }
}
