# Deployment Guide (Cloudflare Pages + Workers)

## Prerequisites
- Node.js 20+ and Corepack enabled
- Cloudflare account with Workers, D1, R2, Pages enabled
- `wrangler` authenticated (`wrangler login`)

## 1) Install Dependencies
```bash
corepack pnpm install
```

## 2) Configure Worker Environment
1. Copy `apps/api-worker/.dev.vars.example` to `apps/api-worker/.dev.vars` for local dev.
2. In Cloudflare, set production secrets:
```bash
wrangler secret put JWT_ACCESS_SECRET
wrangler secret put JWT_REFRESH_SECRET
```

## 3) Provision Cloudflare Resources
```bash
wrangler d1 create smart-work-tracker-db
wrangler r2 bucket create smart-work-tracker-files
```
Update `apps/api-worker/wrangler.toml` with the returned `database_id`.

## 4) Apply D1 Migrations
```bash
cd apps/api-worker
wrangler d1 migrations apply smart-work-tracker-db
```

## 5) Deploy API Worker
```bash
cd apps/api-worker
wrangler deploy
```

## 6) Deploy Next.js Frontend to Pages
1. In `apps/web/.env.production`, set:
```env
NEXT_PUBLIC_API_BASE_URL=https://<your-api-domain>
```
2. Build:
```bash
cd apps/web
corepack pnpm build
```
3. Deploy `apps/web` via Cloudflare Pages Git integration.
   - Build command: `corepack pnpm --filter @smart-work-tracker/web build`
   - Output: `.next`

## 7) Production Verification Checklist
- Register/login works and secure cookies are set.
- Dashboard cards/charts return user data.
- Work plans CRUD + import/export work.
- Activity logging with attachment upload succeeds.
- Followup sticky reminders appear for pending items.
- Calendar merges all 3 sources with correct colors.
- Monthly report exports download in all formats.
- File preview uses signed URLs and expires after 5 minutes.
