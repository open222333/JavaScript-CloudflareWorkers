# JavaScript-CloudflareWorkers

Cloudflare Workers 練習專案，包含多個實用 Worker 範例，涵蓋 HMAC 簽名 URL 驗證、SHA-1 簽名生成、以及 zip 下載簽名測試等情境。

官方文件：[Cloudflare Workers Docs](https://developers.cloudflare.com/workers)
社群：[Discord](https://discord.cloudflare.com)

---

## 目錄結構

```
JavaScript-CloudflareWorkers/
├── js-worker-1/
│   ├── src/index.js          # HMAC-SHA256 簽名 URL 驗證 Worker
│   ├── wrangler.toml         # Workers 部署設定
│   ├── package.json
│   └── test/index.spec.js
├── js-worker-sha1-1/
│   ├── src/index.js          # SHA-1 簽名 URL 生成 Worker
│   ├── wrangler.toml
│   ├── package.json
│   └── test/index.spec.js
└── worker-test-zip-download-1/
    ├── src/index.js          # zip 下載簽名測試 Worker
    ├── wrangler.toml
    ├── package.json
    └── test/index.spec.js
```

---

## Worker 說明

### js-worker-1 — HMAC-SHA256 簽名 URL 驗證

提供 URL 生成與驗證兩個端點，適用於需要防止未授權存取的 API 場景。

**路由說明：**

| 路由 | 說明 |
|------|------|
| `GET /g/<path>` | 生成帶有 HMAC-SHA256 簽名的 URL，簽名包含時間戳 |
| `GET /<path>?verify=<timestamp>-<hmac>` | 驗證請求是否合法，預設有效期 60 秒 |

**執行流程：**

```
[生成] GET /g/<path>
  └── 取得當前時間戳
        └── HMAC-SHA256(SECRET_KEY, timestamp + path)
              └── 回傳簽名 URL: /<path>?verify=<timestamp>-<hmac>

[驗證] GET /<path>?verify=<timestamp>-<hmac>
  └── 解析 timestamp 與 hmac
        ├── 比對時間戳是否在 60 秒內
        └── 重新計算 HMAC 並比對
              ├── [合法] 允許存取
              └── [不合法] 回傳 403
```

**環境變數：**

| 變數 | 說明 |
|------|------|
| `SECRET_KEY` | HMAC 簽名密鑰 |

---

### js-worker-sha1-1 — SHA-1 簽名 URL 生成

根據傳入的參數生成 SHA-1 簽名，適用於相容舊系統的簽名驗證情境。

**路由說明：**

| 參數 | 說明 |
|------|------|
| `sid` | Session ID |
| `t` | 時間戳 |
| `k` | 資源路徑（key） |

**簽名規則：**

```
SHA-1("{t}{SECRET_KEY}{uri}{t}")
```

**環境變數：**

| 變數 | 說明 |
|------|------|
| `SECRET_KEY` | SHA-1 簽名密鑰 |
| `ZIP_HOST` | zip 資源主機位址 |

---

### worker-test-zip-download-1 — zip 下載簽名測試

用於測試 zip 檔下載的簽名流程，作為驗證機制的測試用途。

---

## 使用方法

### 前置需求

- Node.js 16.x 以上
- wrangler CLI

```bash
npm install -g wrangler
```

### 初始化新 Worker

```bash
wrangler init $dir
cd $dir
```

### 本地開發

```bash
npm run dev
# 或
npm run start
```

### 設定密鑰（Secret）

```bash
# 互動式輸入，不會出現在指令歷史
wrangler secret put SECRET_KEY
```

### 設定本地開發環境變數

在 Worker 目錄下建立 `.dev.vars`（僅用於本地開發，勿提交）：

```ini
SECRET_KEY=your_secret_key
ZIP_HOST=https://example.com
```

### 部署

```bash
# 部署到 production
npm run deploy

# 使用 dotenv 載入 .env 並部署到指定環境
dotenv -- wrangler deploy --env dev
```

---

## 執行流程（以 js-worker-1 為例）

```
Request -> Cloudflare Edge
  └── Worker (src/index.js)
        ├── 路由判斷
        │     ├── /g/<path>  -> 生成簽名 URL
        │     └── /<path>    -> 驗證簽名
        └── 回傳 Response
```

---

## 注意事項

- `.dev.vars` 僅用於本地開發，請勿提交至版本控制；生產環境密鑰應使用 `wrangler secret put` 設定。
- 每個 Worker 的 `wrangler.toml` 需單獨設定 `name`、`account_id` 等欄位，部署前請確認設定正確。
- SHA-1 已不被視為安全的雜湊演算法，`js-worker-sha1-1` 僅用於相容舊系統，新系統請使用 HMAC-SHA256（`js-worker-1`）。
- HMAC 有效期預設 60 秒，可根據需求在 `src/index.js` 中調整。
- 使用 `dotenv -- wrangler deploy` 前需先安裝 `dotenv-cli`：`npm install -g dotenv-cli`。
- 本地開發使用 `npm run dev` 時，Worker 預設監聽 `http://localhost:8787`。
