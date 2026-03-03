-- ==========================================
-- 既存データにtenant_idを設定するマイグレーション
-- マルチテナント化前に作成されたデータを修正
-- ==========================================

-- 既存のusersデータにtenant_idを設定
-- 注意: 最初のテナントのIDを使用します。複数テナントがある場合は手動で調整してください。
DO $$
DECLARE
  first_tenant_id UUID;
BEGIN
  -- 最初のテナントIDを取得
  SELECT id INTO first_tenant_id FROM tenants ORDER BY created_at ASC LIMIT 1;
  
  IF first_tenant_id IS NOT NULL THEN
    -- tenant_idがNULLのusersを更新
    UPDATE users
    SET tenant_id = first_tenant_id
    WHERE tenant_id IS NULL;
    
    RAISE NOTICE 'Updated % users with tenant_id: %', 
      (SELECT COUNT(*) FROM users WHERE tenant_id = first_tenant_id), 
      first_tenant_id;
  ELSE
    RAISE NOTICE 'No tenants found. Please create a tenant first.';
  END IF;
END $$;

-- 既存のform_responsesデータにtenant_idを設定
DO $$
DECLARE
  first_tenant_id UUID;
BEGIN
  -- 最初のテナントIDを取得
  SELECT id INTO first_tenant_id FROM tenants ORDER BY created_at ASC LIMIT 1;
  
  IF first_tenant_id IS NOT NULL THEN
    -- tenant_idがNULLのform_responsesを更新
    UPDATE form_responses
    SET tenant_id = first_tenant_id
    WHERE tenant_id IS NULL;
    
    RAISE NOTICE 'Updated % form_responses with tenant_id: %', 
      (SELECT COUNT(*) FROM form_responses WHERE tenant_id = first_tenant_id), 
      first_tenant_id;
  END IF;
END $$;

-- 既存のtagsデータにtenant_idを設定
DO $$
DECLARE
  first_tenant_id UUID;
BEGIN
  SELECT id INTO first_tenant_id FROM tenants ORDER BY created_at ASC LIMIT 1;
  
  IF first_tenant_id IS NOT NULL THEN
    UPDATE tags
    SET tenant_id = first_tenant_id
    WHERE tenant_id IS NULL;
    
    RAISE NOTICE 'Updated % tags with tenant_id: %', 
      (SELECT COUNT(*) FROM tags WHERE tenant_id = first_tenant_id), 
      first_tenant_id;
  END IF;
END $$;

-- 既存のuser_tagsデータにtenant_idを設定
DO $$
DECLARE
  first_tenant_id UUID;
BEGIN
  SELECT id INTO first_tenant_id FROM tenants ORDER BY created_at ASC LIMIT 1;
  
  IF first_tenant_id IS NOT NULL THEN
    UPDATE user_tags
    SET tenant_id = first_tenant_id
    WHERE tenant_id IS NULL;
    
    RAISE NOTICE 'Updated % user_tags with tenant_id: %', 
      (SELECT COUNT(*) FROM user_tags WHERE tenant_id = first_tenant_id), 
      first_tenant_id;
  END IF;
END $$;

-- 既存のsegmentsデータにtenant_idを設定
DO $$
DECLARE
  first_tenant_id UUID;
BEGIN
  SELECT id INTO first_tenant_id FROM tenants ORDER BY created_at ASC LIMIT 1;
  
  IF first_tenant_id IS NOT NULL THEN
    UPDATE segments
    SET tenant_id = first_tenant_id
    WHERE tenant_id IS NULL;
    
    RAISE NOTICE 'Updated % segments with tenant_id: %', 
      (SELECT COUNT(*) FROM segments WHERE tenant_id = first_tenant_id), 
      first_tenant_id;
  END IF;
END $$;

-- 既存のdelivery_historyデータにtenant_idを設定
DO $$
DECLARE
  first_tenant_id UUID;
BEGIN
  SELECT id INTO first_tenant_id FROM tenants ORDER BY created_at ASC LIMIT 1;
  
  IF first_tenant_id IS NOT NULL THEN
    UPDATE delivery_history
    SET tenant_id = first_tenant_id
    WHERE tenant_id IS NULL;
    
    RAISE NOTICE 'Updated % delivery_history with tenant_id: %', 
      (SELECT COUNT(*) FROM delivery_history WHERE tenant_id = first_tenant_id), 
      first_tenant_id;
  END IF;
END $$;

-- 既存のdelivery_logsデータにtenant_idを設定
DO $$
DECLARE
  first_tenant_id UUID;
BEGIN
  SELECT id INTO first_tenant_id FROM tenants ORDER BY created_at ASC LIMIT 1;
  
  IF first_tenant_id IS NOT NULL THEN
    UPDATE delivery_logs
    SET tenant_id = first_tenant_id
    WHERE tenant_id IS NULL;
    
    RAISE NOTICE 'Updated % delivery_logs with tenant_id: %', 
      (SELECT COUNT(*) FROM delivery_logs WHERE tenant_id = first_tenant_id), 
      first_tenant_id;
  END IF;
END $$;

-- 完了メッセージ
DO $$
BEGIN
  RAISE NOTICE '✅ tenant_id migration completed!';
  RAISE NOTICE 'All existing data has been assigned to the first tenant.';
END $$;
