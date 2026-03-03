-- ==========================================
-- マルチテナント対応スキーマ
-- ==========================================

-- テナント（LINE公式アカウント）テーブル
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_key VARCHAR(100) UNIQUE NOT NULL, -- URLパス用の識別子（例: 'account-a'）
  name VARCHAR(255) NOT NULL, -- テナント名（表示用）
  line_channel_id VARCHAR(255) NOT NULL,
  line_channel_secret VARCHAR(255) NOT NULL,
  line_channel_access_token TEXT NOT NULL,
  liff_id VARCHAR(255), -- LIFF ID
  is_active BOOLEAN DEFAULT true,
  settings JSONB DEFAULT '{}', -- その他の設定を格納
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ユーザーテーブル（tenant_id追加）
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
  UNIQUE(tenant_id, line_user_id) -- テナント内でユニーク
);

-- フォーム回答テーブル（tenant_id追加）
CREATE TABLE IF NOT EXISTS form_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  form_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- セグメントテーブル（tenant_id追加）
CREATE TABLE IF NOT EXISTS segments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  conditions JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 配信履歴テーブル（tenant_id追加）
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

-- 個別配信ログテーブル（tenant_id追加）
CREATE TABLE IF NOT EXISTS delivery_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  delivery_history_id UUID REFERENCES delivery_history(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL,
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- タグテーブル（tenant_id追加）
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id, name) -- テナント内でユニーク
);

-- ユーザータグ関連テーブル（tenant_id追加）
CREATE TABLE IF NOT EXISTS user_tags (
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (tenant_id, user_id, tag_id)
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_tenants_tenant_key ON tenants(tenant_key);
CREATE INDEX IF NOT EXISTS idx_tenants_is_active ON tenants(is_active);

CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_line_user_id ON users(line_user_id);
CREATE INDEX IF NOT EXISTS idx_users_tenant_line_user ON users(tenant_id, line_user_id);

CREATE INDEX IF NOT EXISTS idx_form_responses_tenant_id ON form_responses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_form_responses_user_id ON form_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_form_responses_created_at ON form_responses(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_segments_tenant_id ON segments(tenant_id);

CREATE INDEX IF NOT EXISTS idx_delivery_history_tenant_id ON delivery_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_delivery_history_status ON delivery_history(status);
CREATE INDEX IF NOT EXISTS idx_delivery_history_scheduled_at ON delivery_history(scheduled_at);

CREATE INDEX IF NOT EXISTS idx_delivery_logs_tenant_id ON delivery_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_delivery_logs_delivery_history_id ON delivery_logs(delivery_history_id);

CREATE INDEX IF NOT EXISTS idx_tags_tenant_id ON tags(tenant_id);

CREATE INDEX IF NOT EXISTS idx_user_tags_tenant_id ON user_tags(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_tags_user_id ON user_tags(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tags_tag_id ON user_tags(tag_id);

-- 更新日時自動更新関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガー設定
DROP TRIGGER IF EXISTS update_tenants_updated_at ON tenants;
CREATE TRIGGER update_tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_segments_updated_at ON segments;
CREATE TRIGGER update_segments_updated_at
  BEFORE UPDATE ON segments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) 有効化
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tags ENABLE ROW LEVEL SECURITY;

-- RLSポリシー（サービスロール・管理者は全アクセス可能）
DROP POLICY IF EXISTS "tenants_all_access" ON tenants;
CREATE POLICY "tenants_all_access" ON tenants FOR ALL USING (true);

DROP POLICY IF EXISTS "users_all_access" ON users;
CREATE POLICY "users_all_access" ON users FOR ALL USING (true);

DROP POLICY IF EXISTS "form_responses_all_access" ON form_responses;
CREATE POLICY "form_responses_all_access" ON form_responses FOR ALL USING (true);

DROP POLICY IF EXISTS "segments_all_access" ON segments;
CREATE POLICY "segments_all_access" ON segments FOR ALL USING (true);

DROP POLICY IF EXISTS "delivery_history_all_access" ON delivery_history;
CREATE POLICY "delivery_history_all_access" ON delivery_history FOR ALL USING (true);

DROP POLICY IF EXISTS "delivery_logs_all_access" ON delivery_logs;
CREATE POLICY "delivery_logs_all_access" ON delivery_logs FOR ALL USING (true);

DROP POLICY IF EXISTS "tags_all_access" ON tags;
CREATE POLICY "tags_all_access" ON tags FOR ALL USING (true);

DROP POLICY IF EXISTS "user_tags_all_access" ON user_tags;
CREATE POLICY "user_tags_all_access" ON user_tags FOR ALL USING (true);

-- テナント分離用RLSポリシー（将来的にanon keyでのアクセスを許可する場合に使用）
-- 例: CREATE POLICY "Tenant isolation" ON users FOR SELECT 
--     USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
