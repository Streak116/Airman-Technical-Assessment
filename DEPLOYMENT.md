# Deployment & Release Discipline

This guide details the recommended cloud deployment strategy for the Airman Assessment application, utilizing **Vercel** for the frontend and **Railway** for the backend infrastructure.

## Infrastructure Architecture

- **Frontend (`apps/web`)**: Deployed to [Vercel](https://vercel.com) for native Next.js support, edge caching, and global CDN distribution.
- **Backend API (`apps/api`)**: Deployed as a containerized Docker service on [Railway](https://railway.app).
- **Database (PostgreSQL)**: Managed PostgreSQL service provisioned on Railway.
- **Cache / Message Queue (Redis)**: Managed Redis service provisioned on Railway.

---

## 1. Environment Separation (Dev / Staging / Prod)

To ensure strict quality gates, developers do not push directly to Production. Both Vercel and Railway support robust environment separation.

### Frontend (Vercel)
- **Production Environment**: The `main` branch is automatically built and deployed as the Production environment.
- **Staging/Preview Environments**: Every Pull Request triggers a unique Vercel Preview Deployment. This URL is used for QA before merging into `main`. The Preview environment is configured to point its API calls to the Railway Staging backend.

### Backend (Railway)
- **Environments**: Within the Railway project, establish two environments: `Staging` and `Production`.
- **Branch Triggers**: 
  - The `Staging` environment automatically deploys the `development` branch (or specific PR tags).
  - The `Production` environment automatically deploys the `main` branch.
- **Data Isolation**: Railway provisions completely separate PostgreSQL and Redis instances for `Staging` vs `Production`, preventing test data from bleeding into live data.

---

## 2. Secrets Management Approach

Secrets (e.g., API keys, database URLs, JWT encryption salts) are **never** committed to version control. They are managed securely via the cloud providers' environment variables dashboards.

### Frontend Secrets (Vercel)
1. Navigate to Project Settings -> Environment Variables in Vercel.
2. Define variables and select which environments they apply to (Production, Preview, Development).
   - `NEXT_PUBLIC_API_URL` -> Points to `https://api.domain.com` (Production) vs `https://api-staging.domain.com` (Preview).
   - `PAYLOAD_SECRET` (If any edge-middleware decryption is moved here).

### Backend Secrets (Railway)
1. Within the Railway Environment (e.g., `Production`), navigate to the "Variables" tab.
2. Railway's "Shared Variables" feature automatically injects connections strings across services.
   - `DATABASE_URL`: Automatically populated by the managed Postgres service.
   - `REDIS_URL`: Automatically populated by the managed Redis service.
   - `JWT_SECRET`: Manually generated strong string.
   - `PAYLOAD_SECRET`: Manually generated strong string matching the encryption standard.
   - `PORT`: Automatically managed by Railway routing (default fallback 4000).

---

## 3. Basic Rollback Strategy

Mistakes happen. A disciplined release strategy requires the ability to quickly revert a faulty deployment.

### Frontend Rollbacks (Vercel)
Vercel supports **Instant Rollbacks** directly from the dashboard or CLI.
If a critical UI bug is deployed on `main`:
1. Navigate to the "Deployments" tab in Vercel.
2. Find the last known-good production deployment.
3. Click "Promote to Production" (or "Instant Rollback").
*Because Vercel retains immutable build artifacts, the router switches traffic to the old hash instantly without waiting for a new code compilation.*

### Backend Rollbacks (Railway)
Backend rollbacks are trickier because they often involve database state.
1. **Application Code Rollback**: In the Railway dashboard, you can right-click a previous successful deployment and click **"Revert to this deployment"**. This spins down the faulty container and resurrects the old container image.
2. **Database Migration Standard (Append-Only)**: The strict rule for our continuous deployment is that **database migrations must be forward-only (append-only)**. Do not write migrations that drop columns or alter data types destructively. If you add a column, the old backend code must still be able to function with that column existing (via Prisma's generated client). This guarantees that if you click "Revert" on Railway, the old backend container will still boot up and query the new database schema without throwing fatal SQL errors.

---

## Deployment Walkthrough

### Step 1: Provision Railway
1. Connect Railway to your GitHub repo.
2. Add a **PostgreSQL** plugin and a **Redis** plugin.
3. Deploy the `apps/api` folder by specifying the Root Directory in Railway settings.
4. Railway will automatically detect the Dockerfile in `apps/api` and build the Node environment.

### Step 2: Database Migrations
In your Railway backend service settings, set the **Start Command** to run migrations before booting the server:
`npx prisma migrate deploy && node dist/main.js`

### Step 3: Provision Vercel
1. Connect Vercel to your GitHub repo.
2. Set the Root Directory to `apps/web`.
3. Vercel automatically detects Next.js and configures the build steps (`npm run build`).
4. Set the `NEXT_PUBLIC_API_URL` environment variable to point to the public domain Railway assigned your API.
