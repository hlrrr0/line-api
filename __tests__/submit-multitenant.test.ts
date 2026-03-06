import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockSupabase, mockGetTenantByKey, mockGetLineProfile, mockSendTextMessage, mockNotifyFormSubmission } = vi.hoisted(() => {
  const mockSupabase = {
    from: vi.fn(),
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
    eq: vi.fn(),
    is: vi.fn(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
  }
  return {
    mockSupabase,
    mockGetTenantByKey: vi.fn(),
    mockGetLineProfile: vi.fn(),
    mockSendTextMessage: vi.fn(),
    mockNotifyFormSubmission: vi.fn(),
  }
})

vi.mock('@/lib/supabase-admin', () => ({ supabaseAdmin: mockSupabase }))
vi.mock('@/lib/tenant', () => ({ getTenantByKey: mockGetTenantByKey }))
vi.mock('@/lib/line-multitenant', () => ({
  getLineProfile: mockGetLineProfile,
  sendTextMessage: mockSendTextMessage,
}))
vi.mock('@/lib/slack', () => ({ notifyFormSubmission: mockNotifyFormSubmission }))

import handler from '@/pages/api/form/submit-multitenant'

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
  mockSupabase.single = vi.fn().mockResolvedValue({ data: { id: 'user-uuid-1', display_name: 'テスト', tenant_id: 'tenant-uuid-1' }, error: null })
  mockSupabase.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null })
}

function createMockReq(body: any, method = 'POST') {
  return { method, body, headers: { host: 'localhost:3000' } } as any
}

function createMockRes() {
  return { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() } as any
}

beforeEach(() => {
  vi.clearAllMocks()
  resetSupabaseChain()
  mockNotifyFormSubmission.mockResolvedValue(true)
})

describe('Form Submit Multitenant', () => {
  it('should reject non-POST requests', async () => {
    const res = createMockRes()
    await handler(createMockReq({}, 'GET'), res)
    expect(res.status).toHaveBeenCalledWith(405)
  })

  it('should return 400 if tenantKey or formData is missing', async () => {
    const res = createMockRes()
    await handler(createMockReq({ tenantKey: 'test' }), res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('should return 404 if tenant not found', async () => {
    mockGetTenantByKey.mockResolvedValue(null)
    const res = createMockRes()
    await handler(createMockReq({ tenantKey: 'unknown', formData: { name: 'test' } }), res)
    expect(res.status).toHaveBeenCalledWith(404)
  })

  it('should save form response for authenticated user', async () => {
    mockGetTenantByKey.mockResolvedValue(mockTenant)
    mockSendTextMessage.mockResolvedValue(undefined)

    const res = createMockRes()
    await handler(createMockReq({
      tenantKey: 'test-tenant',
      userId: 'U1234567890',
      formData: { name: '田中太郎', age: '30' },
    }), res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({ success: true })
    expect(mockSupabase.from).toHaveBeenCalledWith('users')
    expect(mockSendTextMessage).toHaveBeenCalled()
  })

  it('should save form response for unauthenticated user', async () => {
    mockGetTenantByKey.mockResolvedValue(mockTenant)

    const res = createMockRes()
    await handler(createMockReq({
      tenantKey: 'test-tenant',
      formData: { name: '匿名' },
    }), res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(mockSendTextMessage).not.toHaveBeenCalled()
  })

  it('should send Slack notification when slack_webhook_url is configured', async () => {
    mockGetTenantByKey.mockResolvedValue({
      ...mockTenant,
      settings: { slack_webhook_url: 'https://hooks.slack.com/test' },
    })

    const res = createMockRes()
    await handler(createMockReq({
      tenantKey: 'test-tenant',
      formData: { name: 'テスト' },
    }), res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(mockNotifyFormSubmission).toHaveBeenCalledWith(
      'https://hooks.slack.com/test',
      expect.objectContaining({
        tenantName: 'テストテナント',
        formData: { name: 'テスト' },
      }),
    )
  })

  it('should NOT send Slack notification when not configured', async () => {
    mockGetTenantByKey.mockResolvedValue(mockTenant)

    const res = createMockRes()
    await handler(createMockReq({
      tenantKey: 'test-tenant',
      formData: { name: 'テスト' },
    }), res)

    expect(mockNotifyFormSubmission).not.toHaveBeenCalled()
  })
})
