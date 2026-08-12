# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Git workflow — STAGING ONLY

**`staging` is the only branch Claude may commit to or push to. No exceptions.**

- Never `git commit` while `HEAD` is on `main` (or any other branch). Check the current branch before every commit; if it isn't `staging`, stop and tell the user rather than switching or committing.
- Never `git push` to any ref other than `origin staging`. Do not push `main`, do not push feature branches, do not use `--force` on any branch.
- Never merge into `main`, never open or merge a PR into `main`, and never `git checkout main` as a step toward committing. Promotion from `staging` to `main` is the user's decision and the user's action.
- `main` serves production on Vercel. Treat it as read-only.
- If work seems to require another branch, say so and wait for explicit instruction.

## What this is

Kane's Komet Book Reader — a "cosmic-themed" digital bookstore + book club platform. Next.js App Router frontend (deployed on Vercel) backed by Supabase (Postgres + Auth + Storage + Edge Functions), Stripe for payments, and GoHighLevel (GHL) for email/CRM. Users buy books (ebook / paper_book / komet_card formats), read ebooks in a custom page-image reader, and premium (book club) members get access to discussions and events.

## Commands

```bash
npm run dev      # start dev server (localhost:5050)
npm run build    # next build
npm run start    # serve production build
npm run lint     # eslint .
```

There is no test suite configured (no test runner in `package.json`, no `*.test.*`/`*.spec.*` files). Verify changes by running the dev server and exercising the affected flow in the browser.

`next.config.mjs` sets `typescript.ignoreBuildErrors: true` — `npm run build` will **not** catch type errors. Run `npx tsc --noEmit` yourself if you need type-safety confidence.

Standalone scripts (debugging/one-off checks against the DB or PDF pipeline) live in `scripts/` and `scripts/test-pdf/` and are run directly with `npx tsx <file>` or `node <file>.mjs` — they aren't wired into `package.json`.

## Architecture

### Two backends for book uploads/checkout — know which one is live

There are parallel implementations for some flows; only one is actually wired up to the UI:

- **Book upload/processing**: `components/admin/book-form.tsx` calls the Supabase Edge Function `upload-book` directly (`${NEXT_PUBLIC_SUPABASE_URL}/functions/v1/upload-book`, Deno + `supabase/functions/upload-book/`). The Next.js route `app/api/admin/process-book/route.ts` (Node + `mupdf` via `lib/book/pdf-batch-processor.ts`) is a separate PDF pipeline that is **not** called from any admin UI — treat it as legacy/experimental unless you confirm otherwise.
- **Checkout**: `app/checkout/page.tsx` calls `supabase.functions.invoke('process-checkout')` (Edge Function). The Next.js route `app/api/checkout/route.ts` is **not** referenced by any frontend code — dead code, not the live checkout path.

Before assuming a Next.js `app/api/**` route is "the" implementation of a feature, grep for where the frontend actually calls it — this repo has more than one instance of an API route being superseded by a Supabase Edge Function without the old route being deleted.

### Supabase client — three entry points, pick the right one

- `lib/supabase/client.ts` — browser singleton (`createClient()`). Module-level singleton on purpose (see "refresh bug" below) — don't replace with a per-call instantiation.
- `lib/supabase/server.ts` — `createClient()` (cookie-aware, for Server Components/Route Handlers — respects the logged-in user's RLS) vs `createStaticClient()` (no cookies, service-free, only valid for build-time contexts like `generateStaticParams()`). Using `createStaticClient()` in a page's actual render function means that page can never see auth state — this has been a recurring bug (see `docs/refresh-bug-audit.md` #7).
- `lib/supabase/admin.ts` — `createAdminClient()`, service-role key, bypasses RLS. Server-only (API routes/Edge Functions), never import in client components.

`lib/supabase/middleware.ts` (invoked from root `middleware.ts`) is the auth gate: redirects unauthenticated users away from `/admin/*` and premium pages (`/book-club/discussions`, `/book-club/events`), and redirects non-admins away from `/admin/*` and non-premium-subscribers away from the premium pages. It uses `supabase.auth.getUser()` (server-validated), not `getSession()`.

**Known architectural issue** (`docs/refresh-bug-audit.md`, unresolved as of last audit): `context/auth-context.tsx` uses `getSession()` for its initial check, which can disagree with the middleware's `getUser()`-based check, causing "must refresh to see logged-in state" bugs. If you touch auth state, be aware of this split-brain risk and prefer `getUser()` for anything security-relevant.

### Data model

Full as-built schema, RLS matrix, triggers, and migration history: `docs/backend-data-model-recommendation.md`. Key things worth knowing without opening it:

- 21 tables across Users/Auth, Catalog (`books`, `book_variants`, `book_pages`, `book_illustrations`), Commerce (`cart_items`, `orders`, `order_items`, `user_library`, `promo_codes`), Book Club (`book_club_selections`, `book_club_events`, `event_rsvps`), Community (`discussion_topics`, `discussion_posts`, `discussion_votes`), Reading (`reading_progress`, `highlights`, `bookmarks`, `reading_settings`).
- **The reader displays rendered page images, not reflowable text.** `book_pages.page_image_url` is a WebP render of that PDF page; `content` is extracted text used only for search indexing, never displayed as the reading surface. `reading_settings` (server-synced) only has `zoom`/`theme` — font/family/line-height settings shown in the reader UI (`ReadingSettingsPanel`) are `localStorage`-only (`lib/reading-storage.ts`) and never reach the DB.
- **No ratings/reviews, no refunds** — `order_status_enum` deliberately has no `cancelled` value; all sales are final by design, not an oversight.
- Book formats: `ebook`, `paper_book`, `komet_card`. Only `ebook` and `komet_card` grant `user_library` access (digital reading); `paper_book` is shipping-only.
- Dealer/promo codes: format `KANE-{NAME}-{PHONE_LAST4}`, always 35% off, self-use blocked at the Edge Function level, hybrid DB row + Stripe Promotion Code.
- Admin has full CRUD with no RLS restriction; every other role is scoped by RLS policy (see the doc's permission matrix before writing queries that assume elevated access from a non-admin, non-service-role client).
- Cascading deletes on `books` were deliberately widened (migration `20260227200000`) so admin book deletion doesn't 409 — `order_items`, `user_library`, `book_club_selections` all cascade on book delete now.

Other `docs/phase*-*.md` files hold the original design-phase writeups (frontend audit, API design, backend architecture) in both technical and plain-English versions — useful for "why does this exist" context, but `backend-data-model-recommendation.md` is the source of truth for current schema state.

### Supabase Edge Functions (`supabase/functions/`)

Deno runtime, one directory per function, shared helpers in `_shared/` (`cors.ts`, `errors.ts`, `ghl-client.ts`, `stripe-client.ts`, `supabase-client.ts`). Functions: `upload-book` (PDF ingestion pipeline — validates admin, creates book/variant rows, parses PDF via `pdf-parser.ts`/`text-extractor.ts`/`image-extractor.ts`, uploads to Storage, rolls back the book row on failure), `process-checkout`, `create-subscription`, `cancel-subscription`, `reactivate-subscription`, `stripe-webhook` (fulfillment), `ghl-sync` (contact sync to GoHighLevel), `email-ops` (all transactional email routes through here), `get-book-pages`.

### API contract & testing

`api-spec/` holds an OpenAPI 3.1 spec (`openapi.yaml`) and a Bruno collection (`api-spec/bruno/`) for exercising the Supabase REST/Auth/Edge Function surface directly (bypassing the Next.js frontend). Run `login.bru` first to capture a JWT; see `api-spec/README.md` for the full workflow. Useful when you need to verify backend behavior in isolation from frontend state bugs.

### Frontend patterns

- Most data-bearing pages (`/dashboard`, `/book-club`, `/book/[id]`, discussions) are Server Components that fetch with the cookie-aware `createClient()` and pass results as `initial*` props into a client component (e.g. `DashboardContent`) that owns interactivity. These pages generally do **not** re-fetch after client-side mutations — after a mutation that should be reflected immediately (subscribe, checkout, post), call `router.refresh()` rather than assuming the client component will pick up fresh data on its own.
- Route protection for `/admin/*` and premium book-club routes is enforced in middleware (see above), not per-page — don't assume a page needs its own auth guard, but don't rely on client-side checks alone either since middleware is the actual gate.
- UI components: shadcn/ui (`components/ui/`, "new-york" style, Radix primitives, `@/` path alias to repo root) + Tailwind CSS 4. `components.json` defines the shadcn aliases (`@/components`, `@/lib`, `@/hooks`, etc.) — use the CLI conventions rather than hand-rolling primitives that shadcn already provides.
- Cart/auth are React Context (`context/cart-context.tsx`, `context/auth-context.tsx`), not a state library.

### Environment variables

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server-only, never expose to client bundles), `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SHIPPING_RATE`, `NEXT_PUBLIC_TAX_RATE`, `INTERNAL_API_SECRET` (bearer secret for internal Node API routes like `process-book`).
