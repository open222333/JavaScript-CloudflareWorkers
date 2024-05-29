# JavaScript-CloudflareWorkers

CloudflareWorkers 練習

[文檔](https://developers.cloudflare.com/workers)

[discord](https://discord.cloudflare.com)

# 安裝

wrangler (cloudflare workers cli工具)

```bash
# 安裝 wrangler, (Node.js 版本至少 16.x
npm install -g wrangler
```

# 配置文檔

```ini
# .dev.vars
SECRET_KEY=value
API_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9
```

# 用法

```bash
wrangler init $dir
cd $dir
npm run start
npm run deploy
```
