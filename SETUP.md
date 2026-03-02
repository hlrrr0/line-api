# セットアップガイド

## 事前準備

### 1. Supabaseプロジェクトの作成

1. [Supabase](https://supabase.com)にアクセスしてアカウント作成
2. 新しいプロジェクトを作成
3. プロジェクトの設定から以下の情報を取得:
   - Project URL
   - anon/public key
   - service_role key

### 2. LINE公式アカウントとMessaging APIの設定

#### 2-1. LINE公式アカウントの作成

1. [LINE Developers Console](https://developers.line.biz/console/)にアクセス
2. 新しいプロバイダーを作成（または既存のものを選択）
3. 「LINE公式アカウントを作成」ボタンをクリック
   - ※ 現在、Messaging APIチャネルを直接作成することはできません
4. LINE Official Account Managerに遷移するので、以下の情報を入力:
   - アカウント名
   - 業種
   - その他必要な情報

#### 2-2. Messaging APIの有効化

1. [LINE Official Account Manager](https://manager.line.biz/)にアクセス
2. 作成したアカウントを選択
3. 「設定」→「Messaging API」を選択
4. 「Messaging APIを利用する」ボタンをクリック
5. Developer同意画面で「同意する」をクリック

#### 2-3. LINE Developersでの設定

1. [LINE Developers Console](https://developers.line.biz/console/)に戻る
2. プロバイダー配下に作成されたMessaging APIチャネルを開く
3. 以下の設定を行う:
   - **チャネル基本設定タブ**:
     - Channel Secret をコピー（後で使用）
   - **Messaging API設定タブ**:
     - Channel access token (long-lived) を発行
     - Webhook URLを設定（後で設定）
     - Webhook の「利用する」を ON にする
     - 「応答メッセージ」を OFF にする（重要：二重送信防止）
     - 「あいさつメッセージ」を OFF にする（プログラムで制御するため）

## インストール手順

### 1. 依存関係のインストール

```bash
cd /Users/hiroki/git/Line-api
npm install
```

### 2. 環境変数の設定

`.env.local`ファイルを作成（`.env.local.example`を参考に）:

```bash
cp .env.local.example .env.local
```

`.env.local`を編集して、実際の値を設定:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

LINE_CHANNEL_ACCESS_TOKEN=your_line_channel_access_token
LINE_CHANNEL_SECRET=your_line_channel_secret
NEXT_PUBLIC_LIFF_ID=your_liff_id
```

### 3. データベースのセットアップ

1. Supabaseのダッシュボードを開く
2. 左メニューから「SQL Editor」を選択
3. `supabase/schema.sql`の内容をコピー&ペーストして実行

### 4. LIFFアプリの作成

1. LINE Developers Consoleでチャネルを開く
2. 「LIFF」タブを選択
3. 「追加」ボタンをクリック
4. 以下を設定:
   - LIFF app name: `アンケートフォーム`
   - Size: `Full`
   - Endpoint URL: `https://your-domain.vercel.app/form`（後で更新）
   - Scope: `profile openid`
5. 作成後、LIFF IDをコピーして`.env.local`に設定

### 5. ローカル開発サーバーの起動

```bash
npm run dev
```

ブラウザで `http://localhost:3000` を開いて動作確認

## Vercelへのデプロイ

### 1. Vercelアカウントの準備

[Vercel](https://vercel.com)でアカウントを作成

### 2. プロジェクトのデプロイ

```bash
# Vercel CLIをインストール（初回のみ）
npm install -g vercel

# デプロイ
vercel
```

または、GitHubリポジトリと連携してデプロイ:

1. GitHubにプッシュ
2. Vercelダッシュボードで「New Project」
3. GitHubリポジトリを選択
4. 環境変数を設定
5. デプロイ

### 3. 環境変数の設定（Vercel）

Vercelのダッシュボードで:

1. プロジェクトを選択
2. Settings → Environment Variables
3. `.env.local`の内容を全て追加

### 4. LINEの設定を更新

デプロイ後、実際のURLを使用して:

1. **Webhook URL**を更新:
   - LINE Developers Console → Messaging API設定
   - Webhook URL: `https://your-domain.vercel.app/api/webhook`
   - 「検証」ボタンで接続確認

2. **LIFF Endpoint URL**を更新:
   - LINE Developers Console → LIFF
   - Endpoint URL: `https://your-domain.vercel.app/form`

## 動作確認

### 1. LINE友だち追加

1. LINE Developers ConsoleでQRコードを表示
2. スマートフォンのLINEアプリでスキャン
3. 友だち追加
4. ウェルカムメッセージが届くことを確認

### 2. フォーム動作確認

1. LINEトーク画面のメニューから「アンケート」を選択
2. フォームが表示されることを確認
3. 回答を送信
4. Supabaseでデータが保存されているか確認

### 3. 配信機能の確認

1. `https://your-domain.vercel.app/admin`にアクセス
2. 「メッセージ配信」を選択
3. テストメッセージを送信
4. LINEでメッセージが届くことを確認

## トラブルシューティング

### Webhookが反応しない場合

- Webhook URLが正しく設定されているか確認
- Vercelのログを確認: `vercel logs`
- LINE Developers ConsoleでWebhook設定が「利用する」になっているか確認

### LIFFが開かない場合

- LIFF IDが正しく設定されているか確認
- Endpoint URLが正しいか確認
- LIFFのScope設定を確認

### データベース接続エラー

- Supabaseの環境変数が正しいか確認
- Supabaseプロジェクトが起動しているか確認
- Row Level Security (RLS)のポリシーを確認

## 管理画面アクセス

本番環境では、管理画面へのアクセスに認証を追加することを推奨します。

簡易的な方法:
- Vercel環境変数で`ADMIN_PASSWORD`を設定
- ミドルウェアで認証チェックを実装

## 本番運用時の注意事項

1. **セキュリティ**
   - 管理画面に認証を追加
   - CORS設定の確認
   - Supabase RLSポリシーの見直し

2. **パフォーマンス**
   - 大量配信時のレート制限に注意
   - データベースインデックスの最適化

3. **コスト管理**
   - Supabaseの無料枠: 500MB DB、2GB帯域
   - Vercelの無料枠: 100GB帯域
   - LINE Messaging API: 月1,000通まで無料

4. **バックアップ**
   - 定期的なデータベースバックアップ
   - 環境変数のバックアップ
