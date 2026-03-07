# External Integrations

**Analysis Date:** 2026-03-06

## APIs & External Services

**Payments:**
- Stripe – payment processing and subscription management
  - SDK/Client: `stripe` npm package (server side) and `@stripe/react-stripe-js` / `@stripe/stripe-js` (client side)
  - Auth: `STRIPE_SECRET_KEY` environment variable (service‑side)

**Backend-as-a-Service:**
- Supabase – database, authentication, and storage
  - SDK/Client: `@supabase/supabase-js` (client) and `npm:@supabase/supabase-js@2` used in Supabase edge functions (`supabase/functions/_shared/supabase-client.ts`)
  - Auth: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` environment variables

## Data Storage

**Databases:**
- PostgreSQL via Supabase platform
  - Connection: Supabase client uses the above env vars
  - Client: `@supabase/supabase-js`

**File Storage:**
- Not detected (no S3, Cloudinary, or similar services referenced)

**Caching:**
- Not detected

## Authentication & Identity

**Auth Provider:**
- Supabase Auth (handled via `supabase-client.ts` wrappers `createAuthClient`, `createAdminClient`)
  - Implementation: Supabase session cookies / JWTs; server‑side functions validate via `supabase.auth.getUser()`

## Monitoring & Observability

**Error Tracking:**
- Not detected (no Sentry, LogRocket, etc.)

**Logs:**
- Console logging (`console.log`, `console.error`) is used throughout edge functions and Next components.

## CI/CD & Deployment

**Hosting:**
- Not explicitly defined in repo; typical deployment target is Vercel for Next.js and Supabase Edge Functions for server‑side code.

**CI Pipeline:**
- Not detected (no GitHub Actions, CircleCI, etc.)

## Environment Configuration

**Required env vars:**
- `STRIPE_SECRET_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- Additional vars referenced in `next.config.mjs` (e.g., `STRIPE_PREMIUM_RECURRING_PRICE_ID`)

**Secrets location:**
- Environment files (`.env*`) – contents not read for security.

## Webhooks & Callbacks

**Incoming:**
- Stripe webhook endpoint (`/supabase/functions/stripe-webhook`) processes payment events.

**Outgoing:**
- None detected beyond Stripe SDK calls.

---

*Integration audit: 2026-03-06*