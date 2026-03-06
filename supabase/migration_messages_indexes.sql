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

-- インボックス集計用（tenant_id + user_id + created_at降順）
CREATE INDEX IF NOT EXISTS idx_messages_inbox
  ON messages(tenant_id, user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

-- ===========================================
-- 2. インボックス集計用RPC関数
-- ===========================================

-- ユーザーごとの最新メッセージ + 未読数を1クエリで取得
-- user_idベースで集計（user_idがNULLのメッセージは除外）
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
  WITH unread AS (
    SELECT m2.user_id, COUNT(*) AS cnt
    FROM messages m2
    WHERE m2.tenant_id = p_tenant_id
      AND m2.direction = 'received'
      AND m2.read_at IS NULL
      AND m2.user_id IS NOT NULL
    GROUP BY m2.user_id
  ),
  latest AS (
    SELECT DISTINCT ON (m.user_id)
      m.user_id,
      m.line_user_id,
      m.content,
      m.created_at,
      m.direction
    FROM messages m
    WHERE m.tenant_id = p_tenant_id
      AND m.user_id IS NOT NULL
    ORDER BY m.user_id, m.created_at DESC
  )
  SELECT
    l.user_id,
    COALESCE(l.line_user_id, u.line_user_id) AS line_user_id,
    u.display_name,
    u.picture_url,
    l.content AS latest_message_content,
    l.created_at AS latest_message_at,
    l.direction AS latest_direction,
    COALESCE(ur.cnt, 0) AS unread_count
  FROM latest l
  LEFT JOIN users u ON u.id = l.user_id
  LEFT JOIN unread ur ON ur.user_id = l.user_id
  ORDER BY l.created_at DESC
$$ LANGUAGE sql STABLE;
