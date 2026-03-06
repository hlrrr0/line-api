import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockSupabase, mockGetTenantByKey } = vi.hoisted(() => {
  const mockSupabase = {
    from: vi.fn(),
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    eq: vi.fn(),
    or: vi.fn(),
    order: vi.fn(),
    single: vi.fn(),
  }
  return {
    mockSupabase,
    mockGetTenantByKey: vi.fn(),
  }
})

vi.mock('@/lib/supabase-admin', () => ({ supabaseAdmin: mockSupabase }))
vi.mock('@/lib/tenant', () => ({ getTenantByKey: mockGetTenantByKey }))

import handler from '@/pages/api/admin/users'

const mockTenant = { id: 'tenant-uuid-1', tenant_key: 'test-tenant', name: 'テストテナント' }

// Supabase queryはチェイン可能かつthenableなオブジェクトを返す
function createQueryChain(resolveValue: any = { data: [], error: null }) {
  const chain: any = {
    eq: vi.fn().mockReturnThis(),
    then: vi.fn((resolve: Function) => resolve(resolveValue)),
  }
  return chain
}

function resetSupabaseChain(queryResult?: any) {
  const chain = createQueryChain(queryResult)
  Object.keys(mockSupabase).forEach(key => {
    (mockSupabase as any)[key] = vi.fn().mockReturnValue(mockSupabase)
  })
  // orderの後にeqやawaitが来るので、thenableなチェインを返す
  mockSupabase.order = vi.fn().mockReturnValue(chain)
}

function createMockReq(overrides: any = {}) {
  return {
    method: overrides.method || 'GET',
    query: overrides.query || { tenantKey: 'test-tenant' },
  } as any
}

function createMockRes() {
  return { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() } as any
}

beforeEach(() => {
  vi.clearAllMocks()
  resetSupabaseChain()
})

describe('Admin Users API', () => {
  it('should reject non-GET requests', async () => {
    const res = createMockRes()
    await handler(createMockReq({ method: 'POST' }), res)
    expect(res.status).toHaveBeenCalledWith(405)
  })

  it('should return 400 if tenantKey is missing', async () => {
    const res = createMockRes()
    await handler(createMockReq({ query: {} }), res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('should return 404 if tenant not found', async () => {
    mockGetTenantByKey.mockResolvedValue(null)
    const res = createMockRes()
    await handler(createMockReq(), res)
    expect(res.status).toHaveBeenCalledWith(404)
  })

  it('should return users list for valid tenant', async () => {
    mockGetTenantByKey.mockResolvedValue(mockTenant)
    const mockUsers = [
      { id: '1', line_user_id: 'U001', display_name: 'ユーザー1', is_blocked: false },
      { id: '2', line_user_id: 'U002', display_name: 'ユーザー2', is_blocked: true },
    ]
    resetSupabaseChain({ data: mockUsers, error: null })

    const res = createMockRes()
    await handler(createMockReq(), res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({ users: mockUsers })
  })

  it('should filter active users when filter=active', async () => {
    mockGetTenantByKey.mockResolvedValue(mockTenant)
    resetSupabaseChain({ data: [], error: null })

    const res = createMockRes()
    await handler(createMockReq({ query: { tenantKey: 'test-tenant', filter: 'active' } }), res)

    expect(res.status).toHaveBeenCalledWith(200)
    // order()が返すchainオブジェクトのeqが呼ばれることを確認
    const orderResult = mockSupabase.order.mock.results[0].value
    expect(orderResult.eq).toHaveBeenCalledWith('is_blocked', false)
  })

  it('should filter blocked users when filter=blocked', async () => {
    mockGetTenantByKey.mockResolvedValue(mockTenant)
    resetSupabaseChain({ data: [], error: null })

    const res = createMockRes()
    await handler(createMockReq({ query: { tenantKey: 'test-tenant', filter: 'blocked' } }), res)

    const orderResult = mockSupabase.order.mock.results[0].value
    expect(orderResult.eq).toHaveBeenCalledWith('is_blocked', true)
  })

  it('should handle supabase errors gracefully', async () => {
    mockGetTenantByKey.mockResolvedValue(mockTenant)
    resetSupabaseChain({ data: null, error: new Error('DB error') })

    const res = createMockRes()
    await handler(createMockReq(), res)

    expect(res.status).toHaveBeenCalledWith(500)
  })
})
