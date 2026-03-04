-- ==========================================
-- Chat UI redesign - DB schema additions
-- ==========================================

-- 1. users テーブルに support_status, assignee_name カラム追加
ALTER TABLE users ADD COLUMN IF NOT EXISTS support_status VARCHAR(20) DEFAULT 'none';
-- Values: 'none' (default), 'action_required' (要対応), 'resolved' (対応済み)

ALTER TABLE users ADD COLUMN IF NOT EXISTS assignee_name VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_users_support_status ON users(support_status);

-- 2. user_notes テーブル新規作成
CREATE TABLE IF NOT EXISTS user_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_by VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_notes_tenant_id ON user_notes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_notes_user_id ON user_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notes_created_at ON user_notes(created_at DESC);

-- RLS
ALTER TABLE user_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_notes_all_access" ON user_notes;
CREATE POLICY "user_notes_all_access" ON user_notes FOR ALL USING (true);
