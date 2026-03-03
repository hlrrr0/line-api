-- ==========================================
-- フォームビルダー用テーブル
-- ==========================================

-- フォーム定義テーブル
CREATE TABLE IF NOT EXISTS form_definitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  fields JSONB NOT NULL DEFAULT '[]', -- フォームフィールド定義（配列）
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id, name)
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_form_definitions_tenant_id ON form_definitions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_form_definitions_is_active ON form_definitions(is_active);

-- 更新日時自動更新トリガー
DROP TRIGGER IF EXISTS update_form_definitions_updated_at ON form_definitions;
CREATE TRIGGER update_form_definitions_updated_at
  BEFORE UPDATE ON form_definitions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS有効化
ALTER TABLE form_definitions ENABLE ROW LEVEL SECURITY;

-- RLSポリシー
DROP POLICY IF EXISTS "form_definitions_all_access" ON form_definitions;
CREATE POLICY "form_definitions_all_access" ON form_definitions FOR ALL USING (true);

-- サンプルフォーム定義（参考用コメント）
/*
fields JSONB 構造例:
[
  {
    "id": "name",
    "type": "text",
    "label": "お名前",
    "placeholder": "山田太郎",
    "required": true,
    "order": 1
  },
  {
    "id": "age",
    "type": "number",
    "label": "年齢",
    "placeholder": "",
    "required": true,
    "min": 0,
    "max": 150,
    "order": 2
  },
  {
    "id": "gender",
    "type": "select",
    "label": "性別",
    "required": true,
    "options": [
      {"value": "male", "label": "男性"},
      {"value": "female", "label": "女性"},
      {"value": "other", "label": "その他"}
    ],
    "order": 3
  },
  {
    "id": "interests",
    "type": "checkbox",
    "label": "興味のあるジャンル",
    "required": false,
    "options": [
      {"value": "sports", "label": "スポーツ"},
      {"value": "music", "label": "音楽"},
      {"value": "movie", "label": "映画"}
    ],
    "order": 4
  },
  {
    "id": "email",
    "type": "email",
    "label": "メールアドレス",
    "placeholder": "example@email.com",
    "required": false,
    "order": 5
  }
]

サポートされるフィールドタイプ:
- text: テキスト入力
- number: 数値入力
- email: メール入力
- tel: 電話番号入力
- textarea: 複数行テキスト
- select: ドロップダウン選択
- radio: ラジオボタン
- checkbox: チェックボックス（複数選択）
- date: 日付選択
*/
