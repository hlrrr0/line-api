# LINE配信システム（フォーム回答連動）

LINE公式アカウントを統合した、フォームからの回答データ蓄積とセグメント配信が可能なシステム

## システム構成

- **フロントエンド**: Next.js + LIFF SDK
- **バックエンド**: Vercel Serverless Functions
- **データベース**: Supabase (PostgreSQL)
- **LINE連携**: LINE Messaging API

## 機能

1. LIFFフォーム（ユーザー入力）
2. Webhook受信（友だち追加、メッセージ受信）
3. セグメント配信
4. 配信履歴管理
5. 管理画面

## セットアップ

### 1. 環境変数の設定

`.env.local`ファイルを作成し、以下を設定：

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# LINE
LINE_CHANNEL_ACCESS_TOKEN=your_channel_access_token
LINE_CHANNEL_SECRET=your_channel_secret
NEXT_PUBLIC_LIFF_ID=your_liff_id
```

### 2. データベースのセットアップ

Supabaseのダッシュボードで`supabase/schema.sql`を実行

### 3. 依存関係のインストール

```bash
npm install
```

### 4. 開発サーバー起動

```bash
npm run dev
```

### 5. デプロイ

```bash
vercel
```

## ディレクトリ構造

```
/
├── pages/              # Next.jsページ
│   ├── api/           # APIエンドポイント
│   ├── admin/         # 管理画面
│   └── form/          # LIFFフォーム
├── components/        # Reactコンポーネント
├── lib/              # ユーティリティ
├── supabase/         # DBスキーマ
└── public/           # 静的ファイル
```

## LINE設定

1. LINE Developersコンソールでチャネル作成
2. Messaging API有効化
3. Webhook URLを設定: `https://your-domain.vercel.app/api/webhook`
4. LIFF アプリ追加: Endpoint URL `https://your-domain.vercel.app/form`
