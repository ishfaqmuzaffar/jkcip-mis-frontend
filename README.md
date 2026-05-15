# JKCIP MIS Frontend

Management Information System for the **Competitiveness Improvement of Agriculture and Allied Sectors Project** (JKCIP) — Jammu & Kashmir.

**Stack:** Next.js 14 · TypeScript · Tailwind CSS · TanStack Query · Recharts

---

## Deployment on Coolify

### 1. Push to Git
```bash
git init
git add .
git commit -m "Initial commit — JKCIP MIS Frontend"
git remote add origin <your-git-repo-url>
git push -u origin main
```

### 2. Create App in Coolify
- Source: your Git repo
- Build Pack: **Dockerfile**
- Port: `3000`

### 3. Set Environment Variables in Coolify
| Variable | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://your-backend.domain.com` |
| `NEXT_PUBLIC_APP_NAME` | `JKCIP MIS` |

> These are build-time variables — set them as **Build Args** in Coolify so they are baked into the standalone build.

### 4. Deploy
Click Deploy. Coolify will build the Docker image and start the container on port 3000.

---

## Local Development

```bash
cp .env.example .env.local
# Edit .env.local — set NEXT_PUBLIC_API_URL to your backend
npm install
npm run dev
```

App runs at http://localhost:3000

---

## Architecture

```
src/
  app/
    login/          — Authentication page
    (dashboard)/    — Protected app shell
      dashboard/    — KPI overview + logframe summary
      logframe/     — Tree view, indicator monitoring, data entry
      analytics/    — Charts, radar, targets vs results
      schemes/      — Scheme CRUD
      projects/     — Project CRUD + status management
      beneficiaries/— Beneficiary records + disaggregation
      approvals/    — Approval workflow queue
      users/        — User management (Admin only)
  components/
    layout/         — Sidebar + Header
    providers.tsx   — React Query + Auth + Toast
  lib/
    api.ts          — All backend API calls (axios)
    auth.ts         — Auth context + hooks
    utils.ts        — Formatters, helpers
  types/index.ts    — All TypeScript types
```

## Backend API
Expects a NestJS backend with these base routes:
- `/auth/login` `/auth/me`
- `/dashboard/stats` `/dashboard/overview`
- `/schemes` `/projects` `/beneficiaries` `/approvals` `/users`
- `/logframe/tree` `/logframe/indicators` `/logframe/indicators/:id/progress`
- `/logframe/dashboard` `/logframe/outcomes`
