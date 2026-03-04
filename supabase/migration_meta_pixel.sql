-- Meta Pixel ID カラムを tenants テーブルに追加
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS meta_pixel_id VARCHAR(255);
