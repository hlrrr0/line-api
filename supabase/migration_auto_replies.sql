-- テナント別自動返信ルールテーブル
CREATE TABLE IF NOT EXISTS auto_reply_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  keyword VARCHAR(255) NOT NULL,
  match_type VARCHAR(20) NOT NULL DEFAULT 'contains',  -- 'exact', 'contains', 'starts_with'
  reply_messages JSONB NOT NULL DEFAULT '[]',           -- 複数吹き出し対応（最大5件）
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,                           -- 優先度（高い方が先にマッチ）
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auto_reply_rules_tenant ON auto_reply_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_auto_reply_rules_active ON auto_reply_rules(tenant_id, is_active);
