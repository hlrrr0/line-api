-- ==========================================
-- LINE配信システム - 完全マイグレーションSQL
-- 本番環境（Supabase）で1度だけ実行してください
-- ==========================================

-- 更新日時自動更新関数（最初に作成）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 1. テナント（LINE公式アカウント）テーブル
-- ==========================================
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_key VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  line_channel_id VARCHAR(255) NOT NULL,
  line_channel_secret VARCHAR(255) NOT NULL,
  line_channel_access_token TEXT NOT NULL,
  liff_id VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenants_tenant_key ON tenants(tenant_key);
CREATE INDEX IF NOT EXISTS idx_tenants_is_active ON tenants(is_active);

DROP TRIGGER IF EXISTS update_tenants_updated_at ON tenants;
CREATE TRIGGER update_tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenants_all_access" ON tenants;
CREATE POLICY "tenants_all_access" ON tenants FOR ALL USING (true);

-- ==========================================
-- 2. ユーザーテーブル
-- ==========================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  line_user_id VARCHAR(255) NOT NULL,
  display_name VARCHAR(255),
  picture_url TEXT,
  status_message TEXT,
  is_blocked BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id, line_user_id)
);

CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_line_user_id ON users(line_user_id);
CREATE INDEX IF NOT EXISTS idx_users_tenant_line_user ON users(tenant_id, line_user_id);

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_all_access" ON users;
CREATE POLICY "users_all_access" ON users FOR ALL USING (true);

-- ==========================================
-- 3. タグテーブル
-- ==========================================
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id, name)
);

CREATE INDEX IF NOT EXISTS idx_tags_tenant_id ON tags(tenant_id);

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tags_all_access" ON tags;
CREATE POLICY "tags_all_access" ON tags FOR ALL USING (true);

-- ==========================================
-- 4. ユーザータグ関連テーブル
-- ==========================================
CREATE TABLE IF NOT EXISTS user_tags (
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (tenant_id, user_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_user_tags_tenant_id ON user_tags(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_tags_user_id ON user_tags(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tags_tag_id ON user_tags(tag_id);

ALTER TABLE user_tags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_tags_all_access" ON user_tags;
CREATE POLICY "user_tags_all_access" ON user_tags FOR ALL USING (true);

-- ==========================================
-- 5. フォーム回答テーブル
-- ==========================================
CREATE TABLE IF NOT EXISTS form_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  form_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_form_responses_tenant_id ON form_responses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_form_responses_user_id ON form_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_form_responses_created_at ON form_responses(created_at DESC);

ALTER TABLE form_responses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "form_responses_all_access" ON form_responses;
CREATE POLICY "form_responses_all_access" ON form_responses FOR ALL USING (true);

-- ==========================================
-- 6. フォーム定義テーブル（新規）
-- ==========================================
CREATE TABLE IF NOT EXISTS form_definitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  fields JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id, name)
);

CREATE INDEX IF NOT EXISTS idx_form_definitions_tenant_id ON form_definitions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_form_definitions_is_active ON form_definitions(is_active);

DROP TRIGGER IF EXISTS update_form_definitions_updated_at ON form_definitions;
CREATE TRIGGER update_form_definitions_updated_at
  BEFORE UPDATE ON form_definitions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE form_definitions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "form_definitions_all_access" ON form_definitions;
CREATE POLICY "form_definitions_all_access" ON form_definitions FOR ALL USING (true);

-- ==========================================
-- 7. セグメントテーブル
-- ==========================================
CREATE TABLE IF NOT EXISTS segments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  conditions JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_segments_tenant_id ON segments(tenant_id);

DROP TRIGGER IF EXISTS update_segments_updated_at ON segments;
CREATE TRIGGER update_segments_updated_at
  BEFORE UPDATE ON segments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE segments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "segments_all_access" ON segments;
CREATE POLICY "segments_all_access" ON segments FOR ALL USING (true);

-- ==========================================
-- 8. 配信履歴テーブル
-- ==========================================
CREATE TABLE IF NOT EXISTS delivery_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  segment_id UUID REFERENCES segments(id) ON DELETE SET NULL,
  message_type VARCHAR(50) NOT NULL,
  message_content JSONB NOT NULL,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(50) DEFAULT 'pending',
  total_recipients INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_delivery_history_tenant_id ON delivery_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_delivery_history_status ON delivery_history(status);
CREATE INDEX IF NOT EXISTS idx_delivery_history_scheduled_at ON delivery_history(scheduled_at);

ALTER TABLE delivery_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "delivery_history_all_access" ON delivery_history;
CREATE POLICY "delivery_history_all_access" ON delivery_history FOR ALL USING (true);

-- ==========================================
-- 9. 個別配信ログテーブル
-- ==========================================
CREATE TABLE IF NOT EXISTS delivery_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  delivery_history_id UUID REFERENCES delivery_history(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL,
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_delivery_logs_tenant_id ON delivery_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_delivery_logs_delivery_history_id ON delivery_logs(delivery_history_id);

ALTER TABLE delivery_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "delivery_logs_all_access" ON delivery_logs;
CREATE POLICY "delivery_logs_all_access" ON delivery_logs FOR ALL USING (true);

-- ==========================================
-- 完了メッセージ
-- ==========================================
DO $$
BEGIN
  RAISE NOTICE '✅ マイグレーション完了！';
  RAISE NOTICE '必要なテーブル:';
  RAISE NOTICE '1. tenants';
  RAISE NOTICE '2. users';
  RAISE NOTICE '3. tags';
  RAISE NOTICE '4. user_tags';
  RAISE NOTICE '5. form_responses';
  RAISE NOTICE '6. form_definitions';
  RAISE NOTICE '7. segments';
  RAISE NOTICE '8. delivery_history';
  RAISE NOTICE '9. delivery_logs';
END $$;
