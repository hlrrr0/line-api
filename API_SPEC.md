# API仕様書

## エンドポイント一覧

### Webhook API

#### POST /api/webhook

LINE Platform からのWebhookイベントを受信

**リクエスト**
- Headers:
  - `x-line-signature`: LINE署名
- Body: LINE Webhook Event

**レスポンス**
```json
{
  "success": true
}
```

---

### フォーム関連

#### POST /api/form/submit

フォーム回答を送信

**リクエスト**
```json
{
  "userId": "U1234567890abcdef",
  "formData": {
    "name": "山田太郎",
    "age": "25",
    "gender": "male",
    "interests": ["スポーツ", "音楽"],
    "email": "test@example.com",
    "phone": "090-1234-5678"
  }
}
```

**レスポンス**
```json
{
  "success": true
}
```

---

### 配信関連

#### POST /api/delivery/send

メッセージを配信

**リクエスト**
```json
{
  "segmentId": "uuid-v4-string", // オプション。指定しない場合は全体配信
  "messageType": "text",
  "messageContent": {
    "text": "配信するメッセージ"
  }
}
```

**レスポンス**
```json
{
  "success": true,
  "deliveryId": "uuid-v4-string",
  "totalRecipients": 100,
  "successCount": 98,
  "failureCount": 2
}
```

#### GET /api/delivery/history

配信履歴一覧を取得

**レスポンス**
```json
{
  "history": [
    {
      "id": "uuid-v4-string",
      "segment_id": "uuid-v4-string",
      "message_type": "text",
      "message_content": { "text": "メッセージ" },
      "status": "completed",
      "total_recipients": 100,
      "success_count": 98,
      "failure_count": 2,
      "created_at": "2026-03-03T00:00:00Z",
      "sent_at": "2026-03-03T00:01:00Z",
      "segments": {
        "name": "セグメント名"
      }
    }
  ]
}
```

#### POST /api/delivery/history

特定の配信履歴詳細を取得

**リクエスト**
```json
{
  "deliveryId": "uuid-v4-string"
}
```

**レスポンス**
```json
{
  "history": {
    "id": "uuid-v4-string",
    "message_type": "text",
    "status": "completed",
    ...
  },
  "logs": [
    {
      "id": "uuid-v4-string",
      "user_id": "uuid-v4-string",
      "status": "success",
      "error_message": null,
      "sent_at": "2026-03-03T00:01:00Z",
      "users": {
        "display_name": "山田太郎",
        "line_user_id": "U1234567890abcdef"
      }
    }
  ]
}
```

---

### セグメント関連

#### GET /api/segments

セグメント一覧を取得

**レスポンス**
```json
{
  "segments": [
    {
      "id": "uuid-v4-string",
      "name": "20代スポーツ好き",
      "description": "20代でスポーツに興味があるユーザー",
      "conditions": {
        "tags": ["スポーツ"],
        "ageMin": 20,
        "ageMax": 29
      },
      "created_at": "2026-03-03T00:00:00Z"
    }
  ]
}
```

#### POST /api/segments

セグメントを作成

**リクエスト**
```json
{
  "name": "20代スポーツ好き",
  "description": "20代でスポーツに興味があるユーザー",
  "conditions": {
    "tags": ["スポーツ"],
    "ageMin": 20,
    "ageMax": 29
  }
}
```

**レスポンス**
```json
{
  "segment": {
    "id": "uuid-v4-string",
    "name": "20代スポーツ好き",
    ...
  }
}
```

---

### 管理画面関連

#### GET /api/admin/stats

ダッシュボード統計情報を取得

**レスポンス**
```json
{
  "totalUsers": 150,
  "activeUsers": 140,
  "totalResponses": 120,
  "todayResponses": 5
}
```

#### GET /api/admin/users

ユーザー一覧を取得

**クエリパラメータ**
- `filter`: `all` | `active` | `blocked`

**レスポンス**
```json
{
  "users": [
    {
      "id": "uuid-v4-string",
      "line_user_id": "U1234567890abcdef",
      "display_name": "山田太郎",
      "is_blocked": false,
      "created_at": "2026-03-01T00:00:00Z"
    }
  ]
}
```

---

## データベーススキーマ

### users テーブル

| カラム名 | 型 | 説明 |
|---------|-----|------|
| id | UUID | 主キー |
| line_user_id | VARCHAR(255) | LINE ユーザーID（ユニーク） |
| display_name | VARCHAR(255) | 表示名 |
| picture_url | TEXT | プロフィール画像URL |
| status_message | TEXT | ステータスメッセージ |
| is_blocked | BOOLEAN | ブロック状態 |
| created_at | TIMESTAMP | 作成日時 |
| updated_at | TIMESTAMP | 更新日時 |

### form_responses テーブル

| カラム名 | 型 | 説明 |
|---------|-----|------|
| id | UUID | 主キー |
| user_id | UUID | ユーザーID（外部キー） |
| form_data | JSONB | フォーム回答データ |
| created_at | TIMESTAMP | 作成日時 |

### segments テーブル

| カラム名 | 型 | 説明 |
|---------|-----|------|
| id | UUID | 主キー |
| name | VARCHAR(255) | セグメント名 |
| description | TEXT | 説明 |
| conditions | JSONB | セグメント条件 |
| created_at | TIMESTAMP | 作成日時 |
| updated_at | TIMESTAMP | 更新日時 |

### delivery_history テーブル

| カラム名 | 型 | 説明 |
|---------|-----|------|
| id | UUID | 主キー |
| segment_id | UUID | セグメントID（外部キー、NULL可） |
| message_type | VARCHAR(50) | メッセージタイプ |
| message_content | JSONB | メッセージ内容 |
| scheduled_at | TIMESTAMP | 配信予定日時 |
| sent_at | TIMESTAMP | 配信実行日時 |
| status | VARCHAR(50) | ステータス |
| total_recipients | INTEGER | 対象ユーザー数 |
| success_count | INTEGER | 成功数 |
| failure_count | INTEGER | 失敗数 |
| created_at | TIMESTAMP | 作成日時 |

### delivery_logs テーブル

| カラム名 | 型 | 説明 |
|---------|-----|------|
| id | UUID | 主キー |
| delivery_history_id | UUID | 配信履歴ID（外部キー） |
| user_id | UUID | ユーザーID（外部キー） |
| status | VARCHAR(50) | 配信ステータス |
| error_message | TEXT | エラーメッセージ |
| sent_at | TIMESTAMP | 送信日時 |

### tags テーブル

| カラム名 | 型 | 説明 |
|---------|-----|------|
| id | UUID | 主キー |
| name | VARCHAR(100) | タグ名（ユニーク） |
| created_at | TIMESTAMP | 作成日時 |

### user_tags テーブル

| カラム名 | 型 | 説明 |
|---------|-----|------|
| user_id | UUID | ユーザーID（外部キー、複合主キー） |
| tag_id | UUID | タグID（外部キー、複合主キー） |
| created_at | TIMESTAMP | 作成日時 |

---

## メッセージタイプ

### text

```json
{
  "type": "text",
  "text": "メッセージテキスト"
}
```

### image

```json
{
  "type": "image",
  "originalContentUrl": "https://example.com/image.jpg",
  "previewImageUrl": "https://example.com/preview.jpg"
}
```

### flex

```json
{
  "type": "flex",
  "altText": "代替テキスト",
  "contents": {
    // Flex Message JSON
  }
}
```
