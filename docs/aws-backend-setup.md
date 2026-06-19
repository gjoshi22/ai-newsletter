# AWS Backend + Editorial Admin

This project now uses a real API + PostgreSQL + admin app instead of Decap CMS for article publishing.

## Architecture

| Piece | Path | Purpose |
|-------|------|---------|
| API | `backend/api` | Auth, users, articles, image uploads |
| Admin UI | `frontend/admin` | Superadmin/editor article creation with live preview |
| Public site | `frontend/xd-journal` | Reads published articles from the API |
| Shared content model | `lib/content` | Block types + markdown serialization (1:1 with site) |

## Roles

- **superadmin** — create users, edit all articles
- **editor** — create and edit articles

## Local development

### 1. Start Postgres

```bash
docker compose up -d
```

### 2. Configure API

```bash
cp backend/api/.env.example backend/api/.env
```

### 3. Install + migrate + seed

```bash
pnpm install
pnpm --filter @workspace/api db:migrate
pnpm --filter @workspace/api db:seed
```

Default superadmin (change immediately):

- Email: `admin@xdai.journal`
- Password: `ChangeMeNow1!`

### 4. Run everything

```bash
pnpm --filter @workspace/api dev
pnpm --filter @workspace/admin dev
pnpm --filter @workspace/xd-journal dev
```

| Service | URL |
|---------|-----|
| Public site | http://localhost:5173 |
| Admin | http://localhost:5174 |
| API | http://localhost:4000 |

The journal dev server proxies `/api` and `/uploads` to the API.

Set in `frontend/xd-journal/.env.local` when not using the proxy:

```env
VITE_API_BASE_URL=http://localhost:4000
```

## Article editor (1:1 with site)

The admin block editor maps directly to the public article renderer:

| Block | Site rendering |
|-------|----------------|
| Paragraph | `.article-prose p` |
| Section header (H2) | Numbered uppercase H2 with neon prefix |
| Subsection (H3) | Neon H3 |
| Quote | Left-border blockquote |
| Extra spacing | Additional vertical rhythm |
| Bullet list | Neon `>` bullets |
| Code block | Monospace pre block |
| Inline image | Full-width figure in body |
| Hero image | Top article image stage |

Metadata fields: News/Resources, Design/Development, tags, featured, draft/published, ASCII type, source URL.

## AWS deployment (recommended)

### Core services

1. **Amazon RDS PostgreSQL** — article + user data
2. **Amazon ECS Fargate** or **App Runner** — run `backend/api` container
3. **Amazon S3** — uploaded images (`S3_BUCKET`, `S3_REGION`, `S3_PUBLIC_BASE_URL`)
4. **Amazon CloudFront** — public site + admin static assets + image CDN
5. **AWS Secrets Manager** — `DATABASE_URL`, `JWT_SECRET`

### Environment variables (production API)

```env
PORT=4000
DATABASE_URL=postgresql://...
JWT_SECRET=long-random-secret
CORS_ORIGIN=https://your-site.example,https://admin.your-site.example
S3_BUCKET=xd-journal-uploads
S3_REGION=us-east-1
S3_PUBLIC_BASE_URL=https://cdn.your-site.example
```

### Frontend build

```env
VITE_API_BASE_URL=https://api.your-site.example
```

Build and deploy:

```bash
pnpm --filter @workspace/xd-journal build
pnpm --filter @workspace/admin build
```

Host `xd-journal/dist/public` and `admin/dist` on S3/CloudFront (or separate origins).

### First production user

Run seed once against RDS (from CI or a one-off task):

```bash
SEED_SUPERADMIN_EMAIL=you@company.com SEED_SUPERADMIN_PASSWORD=... pnpm --filter @workspace/api db:seed
```

Then invite editors from **Admin → Users**.

## Migrating off markdown files

Existing content in `backend/content/**/*.md` still works as a fallback until the API has published articles. New content should be created in the admin app.

## Security checklist

- [ ] Rotate default superadmin password
- [ ] Use strong `JWT_SECRET` in Secrets Manager
- [ ] Restrict admin origin in `CORS_ORIGIN`
- [ ] Put admin behind VPN or IP allowlist if internal-only
- [ ] Enable RDS encryption + automated backups
- [ ] Use IAM role for S3 uploads (no long-lived keys on the container)
