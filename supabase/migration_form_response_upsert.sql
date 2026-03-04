-- フォーム回答を1ユーザー1回答に制限（再回答は上書き）
-- updated_at カラム追加 + ユニーク制約

-- updated_at カラム追加
ALTER TABLE form_responses ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 既存の重複データを整理（同一ユーザー・同一フォームで最新のみ残す）
DELETE FROM form_responses a
USING form_responses b
WHERE a.user_id IS NOT NULL
  AND a.user_id = b.user_id
  AND a.tenant_id = b.tenant_id
  AND COALESCE(a.form_definition_id, '00000000-0000-0000-0000-000000000000') = COALESCE(b.form_definition_id, '00000000-0000-0000-0000-000000000000')
  AND a.created_at < b.created_at;

-- ユニーク制約（user_idがNULLでないレコードのみ）
CREATE UNIQUE INDEX IF NOT EXISTS idx_form_responses_unique_user_form
  ON form_responses(tenant_id, user_id, COALESCE(form_definition_id, '00000000-0000-0000-0000-000000000000'))
  WHERE user_id IS NOT NULL;
