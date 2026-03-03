import { supabaseAdmin } from './supabase'

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

// テナント情報をキャッシュ（メモリキャッシュ）
const tenantCache = new Map<string, { tenant: Tenant; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5分

/**
 * テナントキーからテナント情報を取得
 */
export async function getTenantByKey(tenantKey: string): Promise<Tenant | null> {
  // キャッシュチェック
  const cached = tenantCache.get(tenantKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.tenant
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('tenants')
      .select('*')
      .eq('tenant_key', tenantKey)
      .eq('is_active', true)
      .single()

    if (error || !data) {
      console.error('Tenant not found:', tenantKey, error)
      return null
    }

    // キャッシュに保存
    tenantCache.set(tenantKey, { tenant: data, timestamp: Date.now() })

    return data
  } catch (error) {
    console.error('Error fetching tenant:', error)
    return null
  }
}

/**
 * テナントIDからテナント情報を取得
 */
export async function getTenantById(tenantId: string): Promise<Tenant | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('tenants')
      .select('*')
      .eq('id', tenantId)
      .eq('is_active', true)
      .single()

    if (error || !data) {
      return null
    }

    return data
  } catch (error) {
    console.error('Error fetching tenant by ID:', error)
    return null
  }
}

/**
 * 全テナント一覧を取得
 */
export async function getAllTenants(): Promise<Tenant[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('tenants')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching tenants:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error fetching all tenants:', error)
    return []
  }
}

/**
 * テナントを作成
 */
export async function createTenant(params: {
  tenant_key: string
  name: string
  line_channel_id: string
  line_channel_secret: string
  line_channel_access_token: string
  liff_id?: string
  settings?: Record<string, any>
}): Promise<Tenant | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('tenants')
      .insert({
        tenant_key: params.tenant_key,
        name: params.name,
        line_channel_id: params.line_channel_id,
        line_channel_secret: params.line_channel_secret,
        line_channel_access_token: params.line_channel_access_token,
        liff_id: params.liff_id,
        settings: params.settings || {},
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating tenant:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error creating tenant:', error)
    return null
  }
}

/**
 * テナント情報を更新
 */
export async function updateTenant(
  tenantId: string,
  params: Partial<Omit<Tenant, 'id' | 'created_at' | 'updated_at'>>
): Promise<Tenant | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('tenants')
      .update(params)
      .eq('id', tenantId)
      .select()
      .single()

    if (error) {
      console.error('Error updating tenant:', error)
      return null
    }

    // キャッシュをクリア
    if (data && data.tenant_key) {
      tenantCache.delete(data.tenant_key)
    }

    return data
  } catch (error) {
    console.error('Error updating tenant:', error)
    return null
  }
}

/**
 * テナントを削除（論理削除: is_active = false）
 */
export async function deactivateTenant(tenantId: string): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from('tenants')
      .update({ is_active: false })
      .eq('id', tenantId)

    if (error) {
      console.error('Error deactivating tenant:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error deactivating tenant:', error)
    return false
  }
}

/**
 * キャッシュをクリア
 */
export function clearTenantCache(tenantKey?: string) {
  if (tenantKey) {
    tenantCache.delete(tenantKey)
  } else {
    tenantCache.clear()
  }
}
