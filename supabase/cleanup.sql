-- ==========================================
-- クリーンアップスクリプト
-- 既存のテーブルを削除してマルチテナントスキーマを適用する前に実行
-- ==========================================

-- 警告: このスクリプトは全てのデータを削除します
-- 本番環境では使用しないでください

-- テーブルを削除（CASCADE により関連するポリシー、トリガー、制約も自動削除）
DROP TABLE IF EXISTS user_tags CASCADE;
DROP TABLE IF EXISTS tags CASCADE;
DROP TABLE IF EXISTS delivery_logs CASCADE;
DROP TABLE IF EXISTS delivery_history CASCADE;
DROP TABLE IF EXISTS segments CASCADE;
DROP TABLE IF EXISTS form_responses CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS tenants CASCADE;

-- 関数を削除
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
