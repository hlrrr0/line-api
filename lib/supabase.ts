import { createBrowserClient } from '@supabase/ssr'

// クライアントサイド用（公開キー）
// createBrowserClient はPKCEコードベリファイアをcookiesに保存するため、
// OAuthリダイレクト後も確実に読み取れる
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
