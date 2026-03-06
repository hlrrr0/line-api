import { describe, it, expect, vi, beforeEach } from 'vitest'

// vi.hoisted でモックオブジェクトを先に定義（vi.mock factory内から参照可能）
const { mockSupabase, mockGetTenantByKey, mockValidateSignature, mockGetLineProfile, mockSendTextMessage, mockSendMultipleTextMessages } = vi.hoisted(() => {
  const mockSupabase = {
    from: vi.fn(),
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
    eq: vi.fn(),
    or: vi.fn(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
    in: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
  }
  return {
    mockSupabase,
    mockGetTenantByKey: vi.fn(),
    mockValidateSignature: vi.fn(),
    mockGetLineProfile: vi.fn(),
    mockSendTextMessage: vi.fn(),
    mockSendMultipleTextMessages: vi.fn(),
  }
})

vi.mock('@/lib/supabase-admin', () => ({ supabaseAdmin: mockSupabase }))
vi.mock('@/lib/tenant', () => ({ getTenantByKey: mockGetTenantByKey }))
vi.mock('@/lib/line-multitenant', () => ({
  validateSignature: mockValidateSignature,
  getLineProfile: mockGetLineProfile,
  sendTextMessage: mockSendTextMessage,
  sendMultipleTextMessages: mockSendMultipleTextMessages,
}))

import handler from '@/pages/api/webhook/[tenantKey]'

const mockTenant = {
  id: 'tenant-uuid-1',
  tenant_key: 'test-tenant',
  name: 'テストテナント',
  line_channel_id: 'ch-id',
  line_channel_secret: 'ch-secret',
  line_channel_access_token: 'ch-token',
  liff_id: 'liff-123',
  is_active: true,
  settings: {},
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
}

function resetSupabaseChain() {
  Object.keys(mockSupabase).forEach(key => {
    (mockSupabase as any)[key] = vi.fn().mockReturnValue(mockSupabase)
  })
  mockSupabase.single = vi.fn().mockResolvedValue({ data: { id: 'user-uuid-1' }, error: null })
  mockSupabase.maybeSingle = vi.fn().mockResolvedValue({ data: { id: 'user-uuid-1' }, error: null })
}

function createMockReq(overrides: any = {}) {
  const body = JSON.stringify(overrides.body || { events: [] })
  const req: any = {
    method: overrides.method || 'POST',
    query: overrides.query || { tenantKey: 'test-tenant' },
    headers: overrides.headers || { 'x-line-signature': 'valid-sig' },
    on: vi.fn((event: string, cb: Function) => {
      if (event === 'data') cb(Buffer.from(body))
      if (event === 'end') cb()
      return req
    }),
  }
  return req
}

function createMockRes() {
  const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() }
  return res
}

beforeEach(() => {
  vi.clearAllMocks()
  resetSupabaseChain()
})

describe('Webhook Handler', () => {
  it('should reject non-POST requests', async () => {
    const req = createMockReq({ method: 'GET' })
    const res = createMockRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(405)
  })

  it('should return 400 if tenantKey is missing', async () => {
    const req = createMockReq({ query: {} })
    const res = createMockRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('should return 404 if tenant is not found', async () => {
    mockGetTenantByKey.mockResolvedValue(null)
    const req = createMockReq()
    const res = createMockRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(404)
  })

  it('should return 401 if signature is invalid', async () => {
    mockGetTenantByKey.mockResolvedValue(mockTenant)
    mockValidateSignature.mockReturnValue(false)
    const req = createMockReq()
    const res = createMockRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(401)
  })

  it('should process follow event successfully', async () => {
    mockGetTenantByKey.mockResolvedValue(mockTenant)
    mockValidateSignature.mockReturnValue(true)
    mockGetLineProfile.mockResolvedValue({
      displayName: 'テストユーザー',
      pictureUrl: 'https://example.com/pic.jpg',
      statusMessage: 'hello',
    })
    mockSendTextMessage.mockResolvedValue(undefined)

    const req = createMockReq({
      body: { events: [{ type: 'follow', source: { userId: 'U1234567890' } }] },
    })
    const res = createMockRes()
    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(mockGetLineProfile).toHaveBeenCalledWith(mockTenant, 'U1234567890')
    expect(mockSupabase.upsert).toHaveBeenCalled()
  })

  it('should process message event and auto-create user if not found', async () => {
    mockGetTenantByKey.mockResolvedValue(mockTenant)
    mockValidateSignature.mockReturnValue(true)
    mockSupabase.maybeSingle = vi.fn()
      .mockResolvedValueOnce({ data: null, error: null })
    mockSupabase.single = vi.fn()
      .mockResolvedValueOnce({ data: { id: 'new-user-uuid' }, error: null })
    mockGetLineProfile.mockResolvedValue({ displayName: '新規ユーザー' })

    const req = createMockReq({
      body: { events: [{ type: 'message', source: { userId: 'U_NEW' }, message: { type: 'text', text: 'こんにちは' } }] },
    })
    const res = createMockRes()
    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(mockSupabase.upsert).toHaveBeenCalled()
    expect(mockGetLineProfile).toHaveBeenCalledWith(mockTenant, 'U_NEW')
  })

  it('should process unfollow event', async () => {
    mockGetTenantByKey.mockResolvedValue(mockTenant)
    mockValidateSignature.mockReturnValue(true)

    const req = createMockReq({
      body: { events: [{ type: 'unfollow', source: { userId: 'U1234567890' } }] },
    })
    const res = createMockRes()
    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(mockSupabase.update).toHaveBeenCalledWith({ is_blocked: true })
  })
})
