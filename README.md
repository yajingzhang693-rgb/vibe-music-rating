# Vibe Music Rating

基于 PRD 实现的音乐专辑打分网站（Next.js + TypeScript + Tailwind + Spotify API）。

## 本地运行

```bash
npm install
npm run dev
```

打开 `http://localhost:3000`

## 环境变量

在 `.env.local` 中配置：

```env
SPOTIFY_CLIENT_ID=...
SPOTIFY_CLIENT_SECRET=...
CRON_SECRET=... # 可选，生产环境建议必须配置
```

## 首页“编辑精选”预拉取架构

首页不再在用户请求时直连 Spotify，而是只读本地缓存快照：

- 缓存文件：`.cache/curated-albums.json`
- 读取逻辑：`lib/curated-cache.ts`
- 刷新逻辑：`refreshCuratedSnapshot()`
- Cron 刷新接口：`/api/cron/refresh-curated`

### 手动刷新一次缓存（本地）

```bash
curl "http://localhost:3000/api/cron/refresh-curated"
```

若配置了 `CRON_SECRET`：

```bash
curl -H "Authorization: Bearer <CRON_SECRET>" "http://localhost:3000/api/cron/refresh-curated"
```

## Vercel 定时任务

项目已包含 `vercel.json`，每 30 分钟执行一次：

- path: `/api/cron/refresh-curated`
- schedule: `*/30 * * * *`
