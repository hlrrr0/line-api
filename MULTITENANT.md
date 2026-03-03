# マルチテナント対応ガイド

## 概要

このシステムは、複数のLINE公式アカウント（テナント）を1つのシステムで管理できるマルチテナント構成に対応しています。

### メリット

- **コスト削減**: 1つのシステムで複数アカウントを管理
- **管理の効率化**: 修正や機能追加が全アカウントに自動反映
- **簡単な追加**: 新規アカウントはDB登録のみで対応可能

### 構成図

```
システム（Vercel + Supabase）
  ├── テナントA（LINE公式アカウントA）
  │   ├── Webhook URL: /api/webhook/tenant-a
  │   ├── LIFF URL: /form/tenant-a
  │   └── 専用のユーザー・回答データ
  │
  ├── テナントB（LINE公式アカウントB）
  │   ├── Webhook URL: /api/webhook/tenant-b
  │   ├── LIFF URL: /form/tenant-b
  │   └── 専用のユーザー・回答データ
  │
  └── テナントC（LINE公式アカウントC）
      ├── Webhook URL: /api/webhook/tenant-c
      ├── LIFF URL: /form/tenant-c
      └── 専用のユーザー・回答データ
```

---

## セットアップ手順

### 1. データベースのセットアップ

マルチテナント対応のスキーマを実行します。

1. Supabaseダッシュボードを開く
2. SQL Editorを選択
3. `supabase/schema_multitenant.sql` の内容を実行

### 2. 最初のテナントを作成

#### 方法1: 管理画面から作成（推奨）

1. `http://localhost:3000/admin/tenants` にアクセス
2. 「新規作成」ボタンをクリック
3. 以下の情報を入力:
   - **テナントキー**: URL用の識別子（例: `my-company`）
   - **テナント名**: 表示用の名前（例: `株式会社〇〇`）
   - **LINE Channel ID**: LINE Developersから取得
   - **LINE Channel Secret**: LINE Developersから取得
   - **LINE Channel Access Token**: LINE Developersから取得
   - **LIFF ID**: 後で設定可能
4. 「作成する」をクリック

#### 方法2: APIから作成

```bash
curl -X POST http://localhost:3000/api/admin/tenants \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_key": "my-company",
    "name": "株式会社〇〇",
    "line_channel_id": "1234567890",
    "line_channel_secret": "your_secret",
    "line_channel_access_token": "your_token"
  }'
```

### 3. LINE Developersでの設定

各テナントごとに以下の設定が必要です。

#### Webhook URL

```
https://your-domain.vercel.app/api/webhook/[テナントキー]
```

例: `https://your-domain.vercel.app/api/webhook/my-company`

#### LIFF Endpoint URL

```
https://your-domain.vercel.app/form/[テナントキー]
```

例: `https://your-domain.vercel.app/form/my-company`

### 4. LIFF IDの設定

1. LINE Developers Consoleで各テナントのチャネルを開く
2. LIFF タブで新規LIFFアプリを作成
3. Endpoint URLに上記のLIFF URLを設定
4. 取得したLIFF IDを管理画面またはAPIで更新

```bash
curl -X PUT http://localhost:3000/api/admin/tenants/[テナントID] \
  -H "Content-Type: application/json" \
  -d '{
    "liff_id": "1234567890-abcdefgh"
  }'
```

---

## データベース設計

### テナント分離の仕組み

すべてのテーブルに `tenant_id` カラムが追加されており、データはテナントごとに完全に分離されています。

| テーブル | tenant_id | 説明 |
|---------|-----------|------|
| tenants | - | テナント情報（認証情報含む） |
| users | ✓ | ユーザーはテナントごとに管理 |
| form_responses | ✓ | 回答データはテナントごとに管理 |
| segments | ✓ | セグメントはテナントごとに管理 |
| delivery_history | ✓ | 配信履歴はテナントごとに管理 |
| delivery_logs | ✓ | 配信ログはテナントごとに管理 |
| tags | ✓ | タグはテナントごとに管理 |
| user_tags | ✓ | ユーザータグはテナントごとに管理 |

### ユニーク制約

- `users`: `(tenant_id, line_user_id)` がユニーク
- `tags`: `(tenant_id, name)` がユニーク

同じLINE UserIDでも、異なるテナントでは別のユーザーとして管理されます。

---

## API仕様

### 動的ルーティング

#### Webhook API

```
POST /api/webhook/[tenantKey]
```

- URLパスから`tenantKey`を取得
- DBからテナント情報を取得
- そのテナントの認証情報で署名検証とAPI呼び出し

#### フォームページ

```
GET /form/[tenantKey]
```

- URLパスから`tenantKey`を取得
- そのテナントのLIFF IDでLIFF SDK初期化

#### フォーム送信API

```
POST /api/form/submit-multitenant
Body: {
  "tenantKey": "my-company",
  "userId": "U1234567890abcdef",
  "formData": { ... }
}
```

---

## セキュリティ

### Row Level Security (RLS)

Supabaseの RLS により、テナント間のデータアクセスを防止しています。

現在の設定:
- サービスロールキーからは全テナントのデータにアクセス可能
- 将来的に、anon keyでのアクセスを許可する場合は、テナント分離ポリシーを追加

### 認証情報の管理

- Channel Secret と Access Token はデータベースに保存
- 管理画面APIでは、これらの情報は返却されない
- 今後、Supabase Vault等での暗号化を検討

---

## 新規テナントの追加手順

### 1. LINE公式アカウントの作成

[SETUP.md](SETUP.md) の手順に従って、新しいLINE公式アカウントとMessaging APIを作成します。

### 2. テナント情報の登録

管理画面 (`/admin/tenants`) から新規テナントを作成します。

### 3. Webhook URLとLIFF URLの設定

作成したテナントの詳細画面に表示されるURLを、LINE Developers Consoleに設定します。

### 4. 動作確認

1. 友だち追加してウェルカムメッセージを確認
2. フォームを開いて回答を送信
3. 管理画面でデータが正しく保存されているか確認

---

## トラブルシューティング

### Webhookが動作しない

- テナントキーが正しいか確認
- Webhook URLが `https://your-domain.vercel.app/api/webhook/[テナントキー]` 形式になっているか確認
- LINE Developers ConsoleでWebhook検証を実行

### LIFFが開かない

- LIFF Endpoint URLが `https://your-domain.vercel.app/form/[テナントキー]` 形式になっているか確認
- テナントにLIFF IDが設定されているか確認
- ブラウザのコンソールでエラーを確認

### データが表示されない

- 管理画面で正しいテナントを選択しているか確認（将来的にテナント切り替え機能を実装予定）
- データベースで `tenant_id` が正しく設定されているか確認

---

## 既存の単一テナントシステムからの移行

既に単一テナント版のシステムを運用している場合:

### 1. データベースの移行

```sql
-- 既存データにデフォルトのテナントIDを設定
-- ※ 事前にバックアップを取得してください

-- テナントを作成（既存の認証情報を使用）
INSERT INTO tenants (tenant_key, name, line_channel_id, line_channel_secret, line_channel_access_token)
VALUES ('default', 'デフォルトテナント', 'your_channel_id', 'your_secret', 'your_token');

-- 作成したテナントのIDを取得
-- 以下のクエリで tenant_id を確認
SELECT id FROM tenants WHERE tenant_key = 'default';

-- 既存のユーザーにテナントIDを設定
UPDATE users SET tenant_id = '[取得したID]' WHERE tenant_id IS NULL;

-- 同様に他のテーブルも更新
UPDATE form_responses SET tenant_id = '[取得したID]' WHERE tenant_id IS NULL;
UPDATE segments SET tenant_id = '[取得したID]' WHERE tenant_id IS NULL;
-- ...
```

### 2. Webhook URLの更新

LINE Developers ConsoleでWebhook URLを更新:

```
変更前: https://your-domain.vercel.app/api/webhook
変更後: https://your-domain.vercel.app/api/webhook/default
```

### 3. LIFF URLの更新

LINE Developers ConsoleでLIFF Endpoint URLを更新:

```
変更前: https://your-domain.vercel.app/form
変更後: https://your-domain.vercel.app/form/default
```

---

## パフォーマンス最適化

### キャッシュ

テナント情報は5分間メモリにキャッシュされます。
頻繁にテナント情報が変更される場合は、`lib/tenant.ts` の `CACHE_TTL` を調整してください。

### インデックス

すべてのテーブルに `tenant_id` のインデックスが設定されており、テナントごとのクエリは高速です。

---

## 料金プラン

### Supabase

- 無料プラン: 500MB DB、2GB帯域/月
- Pro プラン（$25/月）: 8GB DB、50GB帯域/月

テナント数が増えても、データベース容量が許容範囲内であれば追加コストは不要です。

### Vercel

- Hobby プラン（無料）: 100GB帯域/月
- Pro プラン（$20/月）: 1TB帯域/月

テナント数とトラフィックに応じてプランを選択してください。

### LINE Messaging API

- 無料メッセージ: 月1,000通/アカウント
- 追加メッセージ: ~3円/通（従量課金）

各テナントごとに無料枠が適用されます。

---

## まとめ

マルチテナント構成により:
- ✅ 複数のLINE公式アカウントを効率的に管理
- ✅ 開発・保守コストを削減
- ✅ 新規アカウントの追加が簡単
- ✅ インフラコストを最小化

単一のシステムで複数のアカウントを運用できるため、ビジネスの拡大に柔軟に対応できます。
