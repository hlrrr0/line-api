import { describe, it, expect, vi, beforeEach } from 'vitest'
import { sendSlackNotification, notifyFormSubmission } from '@/lib/slack'

// global fetch をモック
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

beforeEach(() => {
  mockFetch.mockReset()
})

describe('sendSlackNotification', () => {
  it('should send a POST request with the correct payload', async () => {
    mockFetch.mockResolvedValue({ ok: true })

    const result = await sendSlackNotification('https://hooks.slack.com/test', {
      text: 'テスト通知',
    })

    expect(result).toBe(true)
    expect(mockFetch).toHaveBeenCalledWith('https://hooks.slack.com/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'テスト通知' }),
    })
  })

  it('should return false when the response is not ok', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500, text: () => Promise.resolve('error') })

    const result = await sendSlackNotification('https://hooks.slack.com/test', {
      text: 'テスト',
    })

    expect(result).toBe(false)
  })

  it('should return false when fetch throws an error', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'))

    const result = await sendSlackNotification('https://hooks.slack.com/test', {
      text: 'テスト',
    })

    expect(result).toBe(false)
  })
})

describe('notifyFormSubmission', () => {
  it('should send a formatted Slack notification with form data', async () => {
    mockFetch.mockResolvedValue({ ok: true })

    await notifyFormSubmission('https://hooks.slack.com/test', {
      tenantName: 'テストテナント',
      userName: '田中太郎',
      formName: 'アンケート',
      formData: { name: '田中太郎', age: '30' },
      adminUrl: 'https://example.com/admin/test/responses',
    })

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.text).toContain('テストテナント')
    expect(body.blocks).toBeDefined()
    expect(body.blocks.length).toBeGreaterThan(0)
  })

  it('should exclude internal fields starting with _', async () => {
    mockFetch.mockResolvedValue({ ok: true })

    await notifyFormSubmission('https://hooks.slack.com/test', {
      tenantName: 'テスト',
      userName: null,
      formName: null,
      formData: { name: 'テスト', _source: 'liff' },
      adminUrl: '',
    })

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    const sectionBlock = body.blocks.find((b: any) => b.type === 'section' && b.text)
    expect(sectionBlock.text.text).toContain('name')
    expect(sectionBlock.text.text).not.toContain('_source')
  })

  it('should handle array values in form data', async () => {
    mockFetch.mockResolvedValue({ ok: true })

    await notifyFormSubmission('https://hooks.slack.com/test', {
      tenantName: 'テスト',
      userName: null,
      formName: null,
      formData: { interests: ['料理', 'スポーツ'] },
      adminUrl: '',
    })

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    const sectionBlock = body.blocks.find((b: any) => b.type === 'section' && b.text)
    expect(sectionBlock.text.text).toContain('料理, スポーツ')
  })
})
