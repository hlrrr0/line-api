// ==========================================
// マルチテナント対応型定義
// ==========================================

export interface Tenant {
  id: string
  tenant_key: string
  name: string
  line_channel_id: string
  line_channel_secret: string
  line_channel_access_token: string
  liff_id?: string
  is_active: boolean
  settings: Record<string, any>
  created_at: string
  updated_at: string
}

export interface User {
  id: string
  tenant_id?: string // マルチテナント対応
  line_user_id: string
  display_name?: string
  picture_url?: string
  status_message?: string
  is_blocked: boolean
  created_at: string
  updated_at: string
}

export interface FormResponse {
  id: string
  tenant_id?: string // マルチテナント対応
  user_id: string
  form_data: Record<string, any>
  created_at: string
}

export interface Segment {
  id: string
  tenant_id?: string // マルチテナント対応
  name: string
  description?: string
  conditions: Record<string, any>
  created_at: string
  updated_at: string
}

export interface DeliveryHistory {
  id: string
  tenant_id?: string // マルチテナント対応
  segment_id?: string
  message_type: string
  message_content: Record<string, any>
  scheduled_at?: string
  sent_at?: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  total_recipients: number
  success_count: number
  failure_count: number
  created_at: string
}

export interface DeliveryLog {
  id: string
  tenant_id?: string // マルチテナント対応
  delivery_history_id: string
  user_id: string
  status: 'success' | 'failed'
  error_message?: string
  sent_at: string
}

export interface Tag {
  id: string
  name: string
  created_at: string
}

export interface UserTag {
  user_id: string
  tag_id: string
  created_at: string
}
