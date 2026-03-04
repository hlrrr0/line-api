-- テナントにウェルカムメッセージカラムを追加（JSON配列で複数吹き出し対応）
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS welcome_messages JSONB DEFAULT '[]';
