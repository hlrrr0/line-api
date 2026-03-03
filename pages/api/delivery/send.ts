import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getTenantByKey } from '@/lib/tenant'
import { sendBulkMessages, createLineClient } from '@/lib/line-multitenant'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { tenantKey, segmentId, lineUserId, messageType, messageContent } = req.body

  if (!tenantKey || !messageType || !messageContent) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  // テナント情報を取得
  const tenant = await getTenantByKey(tenantKey)
  if (!tenant) {
    return res.status(404).json({ error: 'Tenant not found' })
  }

  // 個人宛て送信
  if (lineUserId) {
    try {
      const client = createLineClient(tenant)
      const messages = buildMessages(messageType, messageContent)
      await client.pushMessage(lineUserId, messages)

      // 送信メッセージを DB に保存
      const { data: userRow } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('tenant_id', tenant.id)
        .eq('line_user_id', lineUserId)
        .single()
      let savedContent = ''
      if (messageType === 'text') {
        savedContent = messageContent.text ?? ''
      } else if (messageType === 'image') {
        savedContent = '[画像]'
      } else if (messageType === 'flex') {
        savedContent = messageContent.altText ?? '[Flexメッセージ]'
      } else {
        savedContent = `[${messageType}]`
      }
      await supabaseAdmin.from('messages').insert({
        tenant_id: tenant.id,
        user_id: userRow?.id ?? null,
        line_user_id: lineUserId,
        direction: 'sent',
        message_type: messageType,
        content: savedContent,
      })

      return res.status(200).json({ success: true, totalRecipients: 1, successCount: 1, failureCount: 0 })
    } catch (error) {
      console.error('Individual message error:', error)
      return res.status(500).json({ error: 'Failed to send message' })
    }
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
      // 全体配信（tenant_id が null の旧データも含む）
      const { data: users } = await supabaseAdmin
        .from('users')
        .select('*')
        .or(`tenant_id.eq.${tenant.id},tenant_id.is.null`)
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
    .or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
    .eq('is_blocked', false)

  // フォーム回答フィールドによる絞り込み
  if (conditions.formFields && conditions.formFields.length > 0) {
    const { data: responses } = await supabaseAdmin
      .from('form_responses')
      .select('user_id, form_data')
      .or(`tenant_id.eq.${tenantId},tenant_id.is.null`)

    if (responses) {
      const matchingUserIds = responses
        .filter(r =>
          conditions.formFields.every((fc: any) => {
            const val = r.form_data?.[fc.fieldId]
            if (val === undefined || val === null) return false
            switch (fc.operator) {
              case 'eq':       return String(val) === String(fc.value)
              case 'neq':      return String(val) !== String(fc.value)
              case 'includes': return Array.isArray(val) && val.includes(fc.value)
              case 'gte':      return Number(val) >= Number(fc.value)
              case 'lte':      return Number(val) <= Number(fc.value)
              case 'contains': return String(val).includes(String(fc.value))
              default:         return true
            }
          })
        )
        .map(r => r.user_id)

      query = query.in('id', matchingUserIds)
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
