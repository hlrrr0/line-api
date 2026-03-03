# クイックスタート - マルチテナント版

## 🚀 5分で始める

### 1. データベース初期化

Supabase SQL Editorで以下を実行:

```sql
-- supabase/schema_multitenant.sql の内容をコピー&ペースト
```

### 2. 最初のテナントを作成

開発サーバーを起動:

```bash
npm run dev
```

ブラウザで管理画面を開く:

```
http://localhost:3000/admin/tenants
```

「新規作成」から以下を入力:

```
テナントキー: my-first-account
テナント名: テストアカウント
LINE Channel ID: [LINE Developersから取得]
LINE Channel Secret: [LINE Developersから取得]
LINE Channel Access Token: [LINE Developersから取得]
```

### 3. LINE Developersで設定

#### Webhook URL

```
http://localhost:3000/api/webhook/my-first-account
```

※ ローカル開発の場合は、ngrokなどのトンネルサービスを使用

```bash
ngrok http 3000
# 表示されたURLを使用: https://xxxxx.ngrok.io/api/webhook/my-first-account
```

#### LIFF アプリ

Endpoint URL:
```
http://localhost:3000/form/my-first-account
```

作成後、LIFF IDを管理画面で更新

### 4. 動作確認

1. LINE公式アカウントを友だち追加
2. ウェルカムメッセージが届く ✅
3. Supabaseでユーザーが登録されているか確認 ✅

### 5. フォームを試す

1. ブラウザで開く:
   ```
   http://localhost:3000/form/my-first-account
   ```

2. LIFFログインしてフォームに回答

3. Supabaseで回答データが保存されているか確認 ✅

---

## 📦 本番環境へのデプロイ

### Vercelへデプロイ

```bash
vercel
```

デプロイ後、LINE DevelopersのURLを更新:

```
Webhook: https://your-domain.vercel.app/api/webhook/my-first-account
LIFF: https://your-domain.vercel.app/form/my-first-account
```

---

## ➕ 2つ目のテナントを追加

1. 管理画面で「新規作成」
2. テナントキー: `second-account`
3. 別のLINE公式アカウントの認証情報を入力
4. LINE Developersで以下を設定:
   - Webhook: `/api/webhook/second-account`
   - LIFF: `/form/second-account`

完了！1つのシステムで2つのアカウントを管理できます 🎉

---

## 🔧 トラブルシューティング

### Webhookが動作しない

```bash
# Vercelのログを確認
vercel logs

# ローカルの場合は、コンソールでエラーを確認
```

### LIFFが開かない

- ブラウザの開発者コンソールでエラーを確認
- LIFF IDが正しく設定されているか確認
- テナントキーがURLに含まれているか確認

### データが保存されない

- Supabase RLSポリシーを確認
- サービスロールキーが正しく設定されているか確認

---

## 📚 次のステップ

- [MULTITENANT.md](MULTITENANT.md) - 詳細なマルチテナント設計
- [SETUP.md](SETUP.md) - 完全なセットアップガイド
- [API_SPEC.md](API_SPEC.md) - API仕様

---

## 💡 ヒント

### テナントキーの命名規則

良い例:
- `company-a`
- `tokyo-branch`
- `campaign-2024`

悪い例:
- `テストアカウント` (日本語不可)
- `Account A` (スペース不可)
- `test_account` (アンダースコアは避ける)

### 複数環境の管理

開発・本番で異なるテナントを作成:

```
開発: dev-account-a
本番: prod-account-a
```

### Webhook URLのテスト

LINE Developers Consoleの「検証」ボタンで接続確認ができます。
