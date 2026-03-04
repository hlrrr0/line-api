-- メッセージテーブルのパフォーマンス最適化
-- インデックス追加 + インボックス集計用RPC関数

-- ===========================================
-- 1. インデックス追加
-- ===========================================

-- インボックス用（tenant_id + created_at降順）
CREATE INDEX IF NOT EXISTS idx_messages_tenant_created
  ON messages(tenant_id, created_at DESC);

-- ユーザー会話取得用
CREATE INDEX IF NOT EXISTS idx_messages_user_created
  ON messages(user_id, created_at DESC);

-- line_user_id検索用
CREATE INDEX IF NOT EXISTS idx_messages_line_user_created
  ON messages(line_user_id, created_at DESC);

-- 未読メッセージ用（部分インデックス）
CREATE INDEX IF NOT EXISTS idx_messages_unread
  ON messages(tenant_id, user_id, direction)
  WHERE read_at IS NULL;

-- ===========================================
-- 2. インボックス集計用RPC関数
-- ===========================================

-- ユーザーごとの最新メッセージ + 未読数を1クエリで取得
CREATE OR REPLACE FUNCTION get_inbox(p_tenant_id UUID)
RETURNS TABLE (
  user_id UUID,
  line_user_id VARCHAR,
  display_name VARCHAR,
  picture_url TEXT,
  latest_message_content TEXT,
  latest_message_at TIMESTAMPTZ,
  latest_direction VARCHAR,
  unread_count BIGINT
) AS $$
  SELECT DISTINCT ON (COALESCE(m.user_id::text, m.line_user_id))
    m.user_id,
    m.line_user_id,
    u.display_name,
    u.picture_url,
    m.content AS latest_message_content,
    m.created_at AS latest_message_at,
    m.direction AS latest_direction,
    (SELECT COUNT(*) FROM messages m2
     WHERE m2.tenant_id = p_tenant_id
     AND COALESCE(m2.user_id::text, m2.line_user_id) = COALESCE(m.user_id::text, m.line_user_id)
     AND m2.direction = 'received'
     AND m2.read_at IS NULL
    ) AS unread_count
  FROM messages m
  LEFT JOIN users u ON u.id = m.user_id
  WHERE m.tenant_id = p_tenant_id
  ORDER BY COALESCE(m.user_id::text, m.line_user_id), m.created_at DESC
$$ LANGUAGE sql STABLE;
