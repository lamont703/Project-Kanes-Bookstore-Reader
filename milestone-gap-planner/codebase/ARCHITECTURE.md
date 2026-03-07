# Architecture

**Analysis Date:** 2026-03-06

## Pattern Overview

**Overall:** Next.js App Router (React Server Components) combined with Supabase Edge Functions (Deno) and PostgreSQL.

**Key Characteristics:**
- Hybrid rendering: server components for SEO‑friendly pages, client components for interactive UI.
- Stateless API layer implemented as Supabase Edge Functions.
- Database schema managed via Supabase migrations (PostgreSQL).
- Centralized authentication via Supabase Auth, propagated to both UI and Edge Functions.
- External payment integration through Stripe SDKs inside Edge Functions.

## Layers

**UI Layer:**
- Purpose: Render the web interface, handle client‑side interactions, and manage local state.
- Location: `app/`, `components/`, `context/`
- Contains: React Server Components (`*.tsx` in `app/`), client components (`components/**/*.tsx`), React Context providers (`context/*.tsx`).
- Depends on: Supabase client libraries (`lib/supabase/client.ts`), React, Next.js APIs.
- Used by: End‑users via the browser.

**API Layer (Edge Functions):**
- Purpose: Provide server‑side business logic, payment processing, webhooks, and secure data mutations.
- Location: `supabase/functions/`
- Contains: Deno entry files (`index.ts`, `handler.ts`) and shared utilities (`_shared/*`).
- Depends on: Supabase client (`_shared/supabase-client.ts`), Stripe SDK (`_shared/stripe-client.ts`), other external SDKs.
- Used by: UI layer (via Supabase client calls) and external services (Stripe webhooks).

**Data Layer:**
- Purpose: Define and evolve the relational schema, enforce RLS policies, and store persistent data.
- Location: `supabase/migrations/`
- Contains: SQL migration scripts (e.g., `20260221000000_initial_schema.sql`).
- Depends on: PostgreSQL engine provided by Supabase.
- Used by: Both UI (direct Supabase client queries) and Edge Functions (server‑side queries).

## Data Flow

**[Client Request Flow]:**
1. Browser loads a page (e.g., `app/page.tsx`).
2. Server Component fetches data via `createClient()` (`lib/supabase/server.ts`).
3. Client Component may call Supabase JS client (`lib/supabase/client.ts`) for interactive actions (e.g., add to cart).
4. For protected operations (checkout, subscription), the UI calls a Supabase Edge Function (e.g., `supabase/functions/create-subscription/index.ts`).
5. Edge Function validates auth, interacts with Stripe, updates the `users` table, and returns JSON.
6. UI updates state via React Context (`context/cart-context.tsx`).

**State Management:**
- Global UI state stored in React Contexts (`CartProvider`, `AuthProvider`).
- Persistent cart synced to `localStorage`.

## Key Abstractions

**Supabase Client Wrapper:**
- Purpose: Abstract creation of SSR‑aware client vs. static client.
- Examples: `lib/supabase/server.ts`, `lib/supabase/client.ts`.
- Pattern: Factory functions returning a singleton per request.

**Edge Function Error Helper:**
- Purpose: Standardized error responses.
- Example: `_shared/errors.ts` used in all functions.
- Pattern: `createErrorResponse(status, code, message)`.

## Entry Points

**Next.js Root Layout:**
- Location: `app/layout.tsx`
- Triggers: Initial page render, sets up global providers.

**Main Landing Page:**
- Location: `app/page.tsx`
- Responsibilities: Assemble hero UI, navigation, and feature cards.

**Supabase Edge Functions:**
- Location: `supabase/functions/<function>/index.ts`
- Triggers: HTTP requests from the UI or external services (e.g., Stripe webhook).

## Error Handling

**Strategy:** Centralized error response helpers in `_shared/errors.ts` for Edge Functions; UI layer uses try/catch around async Supabase calls and logs via `console.error`.

**Patterns:**
- Throw on unexpected errors, catch and convert to HTTP 4xx/5xx JSON.
- UI displays error messages based on response codes.

## Cross-Cutting Concerns

**Logging:** Console logging in Edge Functions; Vercel Analytics (`@vercel/analytics/next`) integrated in `app/layout.tsx`.

**Validation:** Input validation performed in Edge Functions (e.g., checking `selectedBookIds` length).

**Authentication:** Supabase Auth token passed via `Authorization` header to Edge Functions; UI obtains session via `createClient`.

---

*Architecture analysis: 2026-03-06*