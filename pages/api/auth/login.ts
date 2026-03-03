import type { NextApiRequest, NextApiResponse } from 'next'
import crypto from 'crypto'

function computeHmac(data: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(data).digest('hex')
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { username, password } = req.body

  const expectedUsername = process.env.ADMIN_USERNAME
  const expectedPassword = process.env.ADMIN_PASSWORD
  const secret = process.env.ADMIN_AUTH_SECRET

  if (!expectedUsername || !expectedPassword || !secret) {
    return res.status(500).json({ error: '認証設定が未完了です' })
  }

  if (username !== expectedUsername || password !== expectedPassword) {
    return res.status(401).json({ error: 'ユーザー名またはパスワードが違います' })
  }

  // 24時間有効なセッショントークンを発行
  const expiry = Date.now() + 24 * 60 * 60 * 1000
  const signature = computeHmac(`${username}:${expiry}`, secret)
  const token = `${username}:${expiry}:${signature}`

  const isProd = process.env.NODE_ENV === 'production'
  res.setHeader(
    'Set-Cookie',
    `admin_session=${token}; HttpOnly; ${isProd ? 'Secure; ' : ''}SameSite=Strict; Path=/; Max-Age=86400`
  )

  return res.status(200).json({ success: true })
}
