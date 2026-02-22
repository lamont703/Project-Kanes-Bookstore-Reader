# Kane's Komet Book Reader — Phase 4: Backend Architecture (Technical Specification)

> **Phase**: 4 — Architect the Backend System  
> **Generated from**: Phase 2 (Data Model) + Phase 3 (API Contract)  
> **Target Backend**: Supabase (PostgreSQL + Edge Functions + Auth + Storage)  
> **Auth**: Supabase Auth (JWT)  
> **Payment**: Stripe  
> **Email**: GoHighLevel  
> **Date**: February 2026

---

## Table of Contents

1. [Overview & Goals](#1-overview--goals)
2. [Tech Stack Selection](#2-tech-stack-selection)
3. [Project Folder Structure](#3-project-folder-structure)
4. [Database Schema Implementation](#4-database-schema-implementation)
5. [Authentication & Authorization Architecture](#5-authentication--authorization-architecture)
6. [Row-Level Security (RLS) Policy Design](#6-row-level-security-rls-policy-design)
7. [Edge Function Architecture](#7-edge-function-architecture)
8. [Data Validation Strategy](#8-data-validation-strategy)
9. [Error Handling Framework](#9-error-handling-framework)
10. [Database Triggers & Computed Fields](#10-database-triggers--computed-fields)
11. [Storage Architecture](#11-storage-architecture)
12. [External Service Integration](#12-external-service-integration)
13. [Environment & Configuration Management](#13-environment--configuration-management)
14. [Deployment Pipeline](#14-deployment-pipeline)
15. [Scalability & Performance Plan](#15-scalability--performance-plan)

---

## 1. Overview & Goals

This document defines the **backend architecture** for Kane's Komet Book Reader. With the API contract (Phase 3) and data model (Phase 2) locked in, this phase plans:

- **How** the backend is organized (folder structure, separation of concerns)
- **What** technologies power each layer (Supabase serverless stack)
- **Where** business logic lives (Edge Functions vs. RLS vs. DB triggers)
- **How** security, validation, and error handling are implemented

### Architecture Principles

| Principle | Implementation |
|---|---|
| **Serverless-first** | No self-managed servers. Supabase handles PostgreSQL, Auth, Storage, and Edge Functions. |
| **Separation of concerns** | Database logic (SQL/RLS), business logic (Edge Functions), and configuration (env vars) are strictly separated. |
| **Security by default** | RLS enabled on every table. No table is accessible without explicit policy. |
| **Git-tracked infrastructure** | All migrations, functions, policies, and seed data are version-controlled. |
| **Reproducible environments** | Local dev mirrors production via `supabase start`. Migrations are the single source of truth for schema. |

---

## 2. Tech Stack Selection

### Why Supabase (Backend-as-a-Service)

| Criterion | Supabase | Alternatives Considered |
|---|---|---|
| **Database** | PostgreSQL (managed) — battle-tested, relational, supports JSONB, full-text search, triggers | Firebase (NoSQL — poor fit for relational data model), PlanetScale (MySQL — less feature-rich) |
| **Auth** | Built-in email/password auth with JWT issuance, session management, and user metadata | Auth0 (overkill + separate service), Firebase Auth (ties to Firebase ecosystem) |
| **Serverless Functions** | Deno-based Edge Functions — deploy alongside DB, access Supabase client natively | AWS Lambda (complex setup, cold starts), Vercel Functions (tied to frontend deploy) |
| **File Storage** | S3-compatible Supabase Storage with RLS-like access policies | AWS S3 (requires separate IAM config), Cloudinary (image-only, costly) |
| **Real-time** | Built-in Realtime subscriptions (future use for discussions) | Pusher, Socket.io (separate infra) |
| **Cost** | Free tier generous for MVP; predictable pricing at scale | AWS (complex billing), Firebase (unpredictable at scale) |

### Runtime & Language

| Layer | Technology | Justification |
|---|---|---|
| **Frontend** | Next.js 16 + React 19 + TypeScript | Already built (Phase 1) |
| **Edge Functions** | Deno (TypeScript) | Native Supabase runtime. TypeScript consistency with frontend. No `node_modules` bloat. |
| **Database** | PostgreSQL 15 | Supabase default. Supports RLS, triggers, full-text search, JSONB, arrays. |
| **ORM / Query** | `@supabase/supabase-js` + raw SQL for migrations | Supabase JS client for Edge Functions and frontend. Raw SQL for schema migrations. |
| **Validation** | Zod (Edge Functions) + CHECK constraints (PostgreSQL) | Zod already in the frontend (`package.json`). Dual validation = defense in depth. |
| **Testing** | Deno.test (Edge Functions) + pgTAP (RLS/DB) + Bruno (API contract) | Matches the testing pyramid from Phase 3. |

---

## 3. Project Folder Structure

The following folder structure implements **complete separation of concerns** across the backend. All backend code lives within the `supabase/` directory at the project root, keeping it cleanly separated from the existing Next.js frontend.

```
kane-komet-book-reader/
│
├── app/                              # ── FRONTEND (existing Next.js app) ──
│   ├── (routes)/                     #    Page routes
│   ├── api/                          #    Next.js API routes (mock → proxy)
│   │   ├── books/route.ts            #    Temporary mock endpoints
│   │   ├── cart/route.ts             #    (replaced by Supabase in Phase C)
│   │   └── ...
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
│
├── components/                       # ── FRONTEND COMPONENTS ──
│
├── context/                          # ── FRONTEND STATE ──
│   └── cart-context.tsx
│
├── lib/                              # ── SHARED UTILITIES ──
│   ├── supabase/                     #    Supabase client configuration
│   │   ├── client.ts                 #    Browser client (anon key)
│   │   ├── server.ts                 #    Server-side client (service role)
│   │   ├── middleware.ts             #    Auth middleware for Next.js
│   │   └── types.ts                  #    Auto-generated DB types
│   ├── validators/                   #    Shared Zod schemas
│   │   ├── auth.ts                   #    Registration/login validation
│   │   ├── books.ts                  #    Book CRUD validation
│   │   ├── cart.ts                   #    Cart operations validation
│   │   ├── checkout.ts               #    Checkout payload validation
│   │   ├── discussions.ts            #    Discussion post validation
│   │   ├── profile.ts               #    Profile update validation
│   │   ├── reading.ts               #    Reading progress/settings validation
│   │   └── subscription.ts          #    Subscription signup validation
│   ├── mock-books.ts                 #    (deprecated after Phase C)
│   ├── mock-user-data.ts             #    (deprecated after Phase C)
│   └── utils.ts
│
├── supabase/                         # ── BACKEND (all Supabase infrastructure) ──
│   │
│   ├── config.toml                   #    Supabase project configuration
│   │
│   ├── migrations/                   #    Database schema migrations (ordered)
│   │   ├── 00001_create_enums.sql                #    All enum types
│   │   ├── 00002_create_users_table.sql          #    users table
│   │   ├── 00003_create_books_tables.sql         #    books, book_variants,
│   │   │                                         #    book_pages, book_illustrations
│   │   ├── 00004_create_commerce_tables.sql      #    cart_items, orders, order_items,
│   │   │                                         #    user_library, promo_codes,
│   │   │                                         #    promo_code_usages
│   │   ├── 00005_create_subscription_table.sql   #    user_subscriptions
│   │   ├── 00006_create_reading_tables.sql       #    reading_progress, highlights,
│   │   │                                         #    bookmarks, reading_settings
│   │   ├── 00007_create_book_club_tables.sql     #    book_club_selections,
│   │   │                                         #    book_club_events, event_rsvps
│   │   ├── 00008_create_discussion_tables.sql    #    discussion_topics,
│   │   │                                         #    discussion_posts, discussion_votes
│   │   ├── 00009_create_audit_log.sql            #    audit_log table
│   │   ├── 00010_create_indexes.sql              #    All indexes
│   │   ├── 00011_create_triggers.sql             #    updated_at triggers,
│   │   │                                         #    denormalized counter triggers
│   │   ├── 00012_enable_rls.sql                  #    Enable RLS on all tables
│   │   ├── 00013_rls_users.sql                   #    RLS policies for users
│   │   ├── 00014_rls_books.sql                   #    RLS policies for books/catalog
│   │   ├── 00015_rls_commerce.sql                #    RLS policies for cart/orders/library
│   │   ├── 00016_rls_reading.sql                 #    RLS policies for reading experience
│   │   ├── 00017_rls_book_club.sql               #    RLS policies for book club
│   │   ├── 00018_rls_discussions.sql             #    RLS policies for discussions
│   │   └── 00019_rls_admin.sql                   #    Admin bypass policies
│   │
│   ├── seed/                         #    Seed data for development/testing
│   │   ├── 01_users.sql              #    Test users (admin + readers)
│   │   ├── 02_books.sql              #    Books + variants + pages
│   │   ├── 03_book_club.sql          #    Selections + events
│   │   ├── 04_discussions.sql        #    Topics + sample posts
│   │   └── 05_promo_codes.sql        #    Test dealer codes
│   │
│   ├── functions/                    #    Supabase Edge Functions (Deno)
│   │   │
│   │   ├── _shared/                  #    Shared utilities across functions
│   │   │   ├── supabase-client.ts    #    Supabase admin client init
│   │   │   ├── stripe-client.ts      #    Stripe SDK init
│   │   │   ├── ghl-client.ts         #    GoHighLevel API client
│   │   │   ├── cors.ts               #    CORS headers helper
│   │   │   ├── errors.ts             #    Standardized error response builder
│   │   │   ├── validators.ts         #    Shared Zod validators (re-exported)
│   │   │   ├── auth-helpers.ts       #    JWT parsing, role checking helpers
│   │   │   └── types.ts              #    Shared TypeScript types
│   │   │
│   │   ├── checkout/                 #    POST /functions/v1/checkout
│   │   │   ├── index.ts              #    Entry point (HTTP handler)
│   │   │   ├── handler.ts            #    Business logic orchestration
│   │   │   ├── stripe-ops.ts         #    Stripe PaymentIntent creation
│   │   │   ├── order-ops.ts          #    Order + order_items creation
│   │   │   ├── library-ops.ts        #    Add ebooks + Komet Card purchases to user_library
│   │   │   ├── shipping-ops.ts       #    Determine shipping requirement ($5.99 flat rate)
│   │   │   ├── promo-ops.ts          #    Promo code validation, self-use prevention, & usage tracking
│   │   │   └── email-ops.ts          #    GoHighLevel order confirmation trigger
│   │   │
│   │   ├── subscribe/                #    POST /functions/v1/subscribe
│   │   │   ├── index.ts              #    Entry point
│   │   │   ├── handler.ts            #    Business logic orchestration
│   │   │   ├── stripe-ops.ts         #    One-time $49.99 charge + $3.99/mo Subscription (first invoice delayed 30 days)
│   │   │   ├── subscription-ops.ts   #    user_subscriptions upsert
│   │   │   ├── library-ops.ts        #    Add 2 selected books to library
│   │   │   ├── promo-ops.ts          #    Generate dealer code (DB + Stripe Promotion Code)
│   │   │   ├── ghl-ops.ts            #    Sync t-shirt size + mailing address to GoHighLevel
│   │   │   └── email-ops.ts          #    GoHighLevel welcome email trigger
│   │   │
│   │   ├── cancel-subscription/      #    POST /functions/v1/cancel-subscription
│   │   │   ├── index.ts
│   │   │   └── handler.ts
│   │   │
│   │   ├── ban-user/                 #    POST /functions/v1/ban-user
│   │   │   ├── index.ts
│   │   │   └── handler.ts            #    Ban → cancel sub → deactivate promo
│   │   │
│   │   ├── validate-promo/           #    POST /functions/v1/validate-promo
│   │   │   ├── index.ts
│   │   │   └── handler.ts
│   │   │
│   │   ├── upload-book/              #    POST /functions/v1/upload-book
│   │   │   ├── index.ts
│   │   │   ├── handler.ts
│   │   │   ├── pdf-parser.ts         #    PDF → page rendering (WebP images for layout preservation)
│   │   │   ├── text-extractor.ts     #    PDF → text extraction per page (for search indexing only)
│   │   │   └── image-extractor.ts    #    PDF → inline illustration extraction (with page positions)
│   │   │
│   │   ├── stripe-webhook/           #    POST /functions/v1/stripe-webhook
│   │   │   ├── index.ts
│   │   │   ├── handler.ts            #    Event router
│   │   │   ├── payment-succeeded.ts  #    payment_intent.succeeded handler
│   │   │   ├── invoice-paid.ts       #    invoice.payment_succeeded handler
│   │   │   ├── invoice-failed.ts     #    invoice.payment_failed handler
│   │   │   └── subscription-deleted.ts  # customer.subscription.deleted handler
│   │   │
│   │   └── ghl-sync/                 #    POST /functions/v1/ghl-sync
│   │       ├── index.ts
│   │       └── handler.ts            #    Sync events → GoHighLevel
│   │
│   └── tests/                        #    Backend test suites
│       ├── rls/                       #    RLS policy tests (pgTAP)
│       │   ├── users.test.sql
│       │   ├── books.test.sql
│       │   ├── commerce.test.sql
│       │   ├── reading.test.sql
│       │   ├── book-club.test.sql
│       │   └── discussions.test.sql
│       ├── functions/                 #    Edge Function unit tests (Deno.test)
│       │   ├── checkout.test.ts
│       │   ├── subscribe.test.ts
│       │   ├── validate-promo.test.ts
│       │   ├── stripe-webhook.test.ts
│       │   └── upload-book.test.ts
│       └── fixtures/                  #    Shared test data
│           ├── test-users.ts
│           ├── test-books.ts
│           └── test-orders.ts
│
├── api-spec/                         # ── API SPECIFICATION (from Phase 3) ──
│   ├── openapi.yaml
│   └── bruno/                        #    Bruno API test collections
│       ├── bruno.json
│       ├── environments/
│       ├── auth/
│       ├── books/
│       ├── cart/
│       ├── orders/
│       ├── reading/
│       ├── book-club/
│       ├── discussions/
│       └── admin/
│
├── docs/                             # ── DOCUMENTATION ──
│   ├── phase1-frontend-audit-technical.md
│   ├── phase1-frontend-audit-plain-english.md
│   ├── backend-data-model-recommendation.md
│   ├── phase3-api-design-technical.md
│   ├── phase3-api-design-plain-english.md
│   ├── phase4-backend-architecture-technical.md     ← THIS FILE
│   └── phase4-backend-architecture-plain-english.md
│
├── .env.local                        #    Local environment variables (gitignored)
├── .env.example                      #    Template for required env vars
├── package.json                      #    Frontend dependencies
└── supabase/.env                     #    Supabase-specific env vars (gitignored)
```

### Separation of Concerns Summary

| Concern | Location | Responsibility |
|---|---|---|
| **UI / Presentation** | `app/`, `components/` | React components, pages, layouts |
| **Frontend State** | `context/` | Client-side state management (cart, auth) |
| **Supabase Client** | `lib/supabase/` | Client initialization, auth middleware, generated types |
| **Validation Schemas** | `lib/validators/` | Zod schemas shared between frontend and Edge Functions |
| **Database Schema** | `supabase/migrations/` | SQL migrations (tables, constraints, indexes, RLS) |
| **Business Logic** | `supabase/functions/` | Edge Functions for multi-step operations |
| **Shared Function Utils** | `supabase/functions/_shared/` | Reusable clients, error builders, auth helpers |
| **Seed Data** | `supabase/seed/` | Development/test data |
| **Backend Tests** | `supabase/tests/` | RLS tests (pgTAP) + Edge Function tests (Deno.test) |
| **API Specification** | `api-spec/` | OpenAPI spec + Bruno test collections |
| **Documentation** | `docs/` | All phase documents |
| **Config & Secrets** | `.env.*`, `supabase/config.toml` | Environment-specific configuration |

---

## 4. Database Schema Implementation

### Migration Strategy

Migrations are ordered numerically and run sequentially via `supabase db push` (local) or `supabase db migrate` (production). Each migration is idempotent where possible.

### Migration Grouping Rationale

| Migration | Contents | Why Separated |
|---|---|---|
| `00001_create_enums.sql` | All 14 enum types | Enums must exist before any table references them |
| `00002–00008` | Table groups by domain | Logical grouping allows independent review and rollback |
| `00009_create_audit_log.sql` | Audit log table | Separate concern — admin observability |
| `00010_create_indexes.sql` | All performance indexes | Centralized for easy performance tuning |
| `00011_create_triggers.sql` | `updated_at` + counter triggers | Centralized trigger management |
| `00012–00019` | RLS policies by domain | One file per domain for reviewability |

### Example: Enums Migration (`00001_create_enums.sql`)

```sql
-- 00001_create_enums.sql
-- All enum types for the Kane's Komet platform

BEGIN;

CREATE TYPE user_role_enum AS ENUM ('reader', 'admin');
CREATE TYPE tshirt_size_enum AS ENUM ('xs', 's', 'm', 'l', 'xl', 'xxl', 'xxxl');
CREATE TYPE subscription_plan_enum AS ENUM ('free', 'premium');
CREATE TYPE subscription_status_enum AS ENUM ('active', 'cancelled', 'expired', 'past_due');
CREATE TYPE genre_enum AS ENUM (
  'Crime', 'Children', 'PTP', 'Spiritual', 'Adult', 'Sports', 'Self-Help', 'Cooking'
);
CREATE TYPE book_status_enum AS ENUM ('draft', 'published');
CREATE TYPE book_format_enum AS ENUM ('ebook', 'paper_book', 'komet_card');
CREATE TYPE order_status_enum AS ENUM ('pending', 'confirmed', 'fulfilled');
CREATE TYPE library_source_enum AS ENUM ('purchase', 'subscription_signup', 'book_club_monthly');
CREATE TYPE highlight_color_enum AS ENUM ('yellow', 'green', 'blue', 'pink');
CREATE TYPE reading_theme_enum AS ENUM ('dark', 'light', 'sepia');
CREATE TYPE selection_status_enum AS ENUM ('current', 'upcoming', 'past');
CREATE TYPE event_type_enum AS ENUM ('virtual', 'in_person');
CREATE TYPE event_status_enum AS ENUM ('upcoming', 'past', 'cancelled');
CREATE TYPE rsvp_status_enum AS ENUM ('confirmed', 'cancelled');
CREATE TYPE discussion_category_enum AS ENUM (
  'Crime', 'Children', 'PTP', 'Spiritual', 'Adult', 'Sports', 'Self-Help', 'Cooking'
);
CREATE TYPE vote_type_enum AS ENUM ('up', 'down');

COMMIT;
```

### Example: Users Table Migration (`00002_create_users_table.sql`)

```sql
-- 00002_create_users_table.sql

BEGIN;

CREATE TABLE public.users (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           TEXT NOT NULL UNIQUE,
  display_name    TEXT NOT NULL,
  full_name       TEXT NOT NULL,
  phone           TEXT,
  date_of_birth   DATE,
  mailing_address TEXT,
  tshirt_size     tshirt_size_enum,
  avatar_url      TEXT,
  role            user_role_enum NOT NULL DEFAULT 'reader',
  is_banned       BOOLEAN NOT NULL DEFAULT false,
  ghl_contact_id  TEXT,
  stripe_customer_id TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_active_at  TIMESTAMPTZ,
  deleted_at      TIMESTAMPTZ
);

-- Index for admin user filtering
CREATE INDEX idx_users_role ON public.users(role);
-- Index for login lookup (Supabase auth handles this, but explicit for RLS queries)
CREATE UNIQUE INDEX idx_users_email ON public.users(email);
-- Index for Stripe webhook handling
CREATE INDEX idx_users_stripe_customer ON public.users(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

COMMIT;
```

All 20 tables from the Phase 2 data model are implemented across migrations `00002`–`00008`, following the exact column definitions, types, constraints, and defaults specified in the data model document.

---

## 5. Authentication & Authorization Architecture

### Auth Flow

```
┌──────────┐     ┌──────────────┐     ┌─────────────┐
│  Browser  │────▶│ Supabase Auth │────▶│  PostgreSQL  │
│  (Next.js)│◀────│   (JWT)       │◀────│  (RLS)       │
└──────────┘     └──────────────┘     └─────────────┘
     │                                       ▲
     │          ┌──────────────┐             │
     └─────────▶│ Edge Function │─────────────┘
                │ (Deno/TS)     │
                └──────────────┘
```

### Authentication (Who Are You?)

| Step | Implementation |
|---|---|
| **Registration** | `supabase.auth.signUp()` → creates `auth.users` row → DB trigger creates `public.users` profile row |
| **Login** | `supabase.auth.signInWithPassword()` → returns JWT access token + refresh token |
| **Session persistence** | Supabase JS client auto-refreshes tokens. Next.js middleware checks session on protected routes. |
| **Logout** | `supabase.auth.signOut()` → invalidates server-side session |

### Authorization (What Can You Do?)

Authorization is enforced at **three levels**:

| Level | Mechanism | Scope |
|---|---|---|
| **1. Next.js Middleware** | `lib/supabase/middleware.ts` | Route protection — redirects unauthenticated users away from `/dashboard`, `/admin`, etc. |
| **2. RLS Policies** | `supabase/migrations/00012–00019` | Row-level data access — PostgreSQL enforces who can read/write which rows |
| **3. Edge Function Guards** | `supabase/functions/_shared/auth-helpers.ts` | Business logic auth — checks subscription status, admin role, ban status before executing operations |

### Authorization Tier Matrix

```typescript
// supabase/functions/_shared/auth-helpers.ts

export type UserTier = 'guest' | 'free' | 'premium' | 'banned' | 'admin';

export async function getUserTier(supabase: SupabaseClient, userId: string): Promise<UserTier> {
  const { data: user } = await supabase
    .from('users')
    .select('role, is_banned')
    .eq('id', userId)
    .single();

  if (!user) return 'guest';
  if (user.role === 'admin') return 'admin';
  if (user.is_banned) return 'banned';

  const { data: sub } = await supabase
    .from('user_subscriptions')
    .select('plan, status')
    .eq('user_id', userId)
    .single();

  if (sub?.plan === 'premium' && sub?.status === 'active') return 'premium';
  return 'free';
}
```

---

## 6. Row-Level Security (RLS) Policy Design

RLS is enabled on **every table**. The general pattern:

```sql
-- Enable RLS (from 00012_enable_rls.sql)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
-- ... repeated for all 20 tables
```

### Policy Pattern Examples

**Users — own row access:**
```sql
-- 00013_rls_users.sql
CREATE POLICY "Users can read own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id AND deleted_at IS NULL);

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT role FROM public.users WHERE id = auth.uid())  -- cannot self-promote
  );
```

**Books — public read for published:**
```sql
-- 00014_rls_books.sql
CREATE POLICY "Anyone can read published books"
  ON public.books FOR SELECT
  USING (status = 'published' AND deleted_at IS NULL);
```

**Book pages — ownership gated:**
```sql
CREATE POLICY "Owners can read book pages"
  ON public.book_pages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_library
      WHERE user_id = auth.uid()
      AND book_id = book_pages.book_id
    )
  );
```

**Discussions — premium-only access:**
```sql
-- 00018_rls_discussions.sql
CREATE POLICY "Premium members can read discussion topics"
  ON public.discussion_topics FOR SELECT
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.user_subscriptions
      WHERE user_id = auth.uid()
      AND plan = 'premium'
      AND status = 'active'
    )
  );
```

**Admin — full bypass:**
```sql
-- 00019_rls_admin.sql
CREATE POLICY "Admins have full access"
  ON public.users FOR ALL
  USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
  );
-- Repeated for all tables
```

---

## 7. Edge Function Architecture

Edge Functions handle **multi-step operations** that require orchestration across multiple tables and external services. Simple CRUD goes through RLS-protected PostgREST endpoints directly.

### Decision Matrix: PostgREST vs. Edge Function

| Operation | Route | Why |
|---|---|---|
| List books, get profile, update settings | PostgREST (`/rest/v1/`) | Simple CRUD, RLS-protected |
| Checkout | Edge Function | Orchestrates: validate cart → check promo (prevent self-use) → determine shipping → Stripe charge → create order → add ebooks + Komet Cards to library → clear cart → email |
| Subscribe | Edge Function | Orchestrates: $49.99 one-time Stripe charge → $3.99/mo Stripe subscription (delayed 30 days) → update DB → add books → generate promo (DB + Stripe) → sync GHL → email |
| Ban user | Edge Function | Orchestrates: ban flag → cancel Stripe → deactivate promo → email |
| Upload book | Edge Function | Orchestrates: render PDF pages as images (WebP) → extract text per page for search → extract inline illustrations with positions → store page images in Storage → create pages/illustrations in DB |
| Stripe webhook | Edge Function | Routes webhook events → updates order/subscription/promo status |
| Validate promo | Edge Function | Multi-table query + business rule validation |

### Edge Function Standard Structure

Each Edge Function follows this pattern:

```typescript
// supabase/functions/checkout/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createErrorResponse } from '../_shared/errors.ts';
import { handleCheckout } from './handler.ts';

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Authenticate
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return createErrorResponse(401, 'UNAUTHORIZED', 'Missing authorization header');
    }

    // Parse body
    const body = await req.json();

    // Delegate to handler
    const result = await handleCheckout(authHeader, body);

    return new Response(JSON.stringify(result), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return createErrorResponse(
      error.status || 500,
      error.code || 'INTERNAL_ERROR',
      error.message
    );
  }
});
```

---

## 8. Data Validation Strategy

Validation is implemented at **three layers** for defense in depth:

```
┌──────────────────────────────────────────────────┐
│ Layer 1: Frontend (Zod + React Hook Form)         │  User-facing error messages
├──────────────────────────────────────────────────┤
│ Layer 2: Edge Function (Zod)                      │  Business rule enforcement
├──────────────────────────────────────────────────┤
│ Layer 3: Database (CHECK + UNIQUE + NOT NULL)     │  Data integrity guarantee
└──────────────────────────────────────────────────┘
```

### Shared Zod Schemas

```typescript
// lib/validators/checkout.ts — shared between frontend and Edge Function

import { z } from 'zod';

export const checkoutSchema = z.object({
  promo_code: z.string().regex(/^KANE-[A-Z]+-\d{4}$/).optional(),
  shipping: z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Valid email required'),
    address: z.string().min(1, 'Address is required'),
    city: z.string().min(1, 'City is required'),
    state: z.string().length(2, 'Use 2-letter state code'),
    zip: z.string().regex(/^\d{5}$/, 'Valid 5-digit ZIP required'),
  }).optional(), // Only required when cart contains physical items
  stripe_payment_method_id: z.string().startsWith('pm_'),
});
```

### PostgreSQL CHECK Constraints

```sql
-- Applied inline during table creation (migrations 00002–00008)
ALTER TABLE book_variants ADD CONSTRAINT chk_price_positive CHECK (price > 0);
ALTER TABLE cart_items ADD CONSTRAINT chk_quantity_min CHECK (quantity >= 1);
ALTER TABLE reading_progress ADD CONSTRAINT chk_progress_range CHECK (progress_percent BETWEEN 0 AND 100);
ALTER TABLE reading_settings ADD CONSTRAINT chk_font_size_range CHECK (font_size BETWEEN 12 AND 32);
ALTER TABLE reading_settings ADD CONSTRAINT chk_line_height_range CHECK (line_height BETWEEN 1.0 AND 3.0);
ALTER TABLE highlights ADD CONSTRAINT chk_text_not_empty CHECK (text <> '');
```

---

## 9. Error Handling Framework

All errors follow the standard envelope defined in Phase 3:

```typescript
// supabase/functions/_shared/errors.ts

interface AppError {
  code: string;
  message: string;
  details?: Array<{ field: string; issue: string }>;
}

export function createErrorResponse(
  httpStatus: number,
  code: string,
  message: string,
  details?: Array<{ field: string; issue: string }>
): Response {
  const body: { error: AppError } = {
    error: { code, message, ...(details && { details }) },
  };

  return new Response(JSON.stringify(body), {
    status: httpStatus,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Standardized error codes (mapped from Phase 3 spec)
export const ErrorCodes = {
  VALIDATION_ERROR: { status: 400, code: 'VALIDATION_ERROR' },
  UNAUTHORIZED: { status: 401, code: 'UNAUTHORIZED' },
  FORBIDDEN: { status: 403, code: 'FORBIDDEN' },
  NOT_FOUND: { status: 404, code: 'NOT_FOUND' },
  CONFLICT: { status: 409, code: 'CONFLICT' },
  BUSINESS_RULE_VIOLATION: { status: 422, code: 'BUSINESS_RULE_VIOLATION' },
  RATE_LIMITED: { status: 429, code: 'RATE_LIMITED' },
  INTERNAL_ERROR: { status: 500, code: 'INTERNAL_ERROR' },
} as const;
```

---

## 10. Database Triggers & Computed Fields

### `updated_at` Auto-Update Trigger

```sql
-- 00011_create_triggers.sql

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Applied to all tables with updated_at column
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
-- ... repeated for books, book_variants, user_subscriptions,
--     reading_settings, book_club_selections, book_club_events,
--     discussion_topics, discussion_posts
```

### Denormalized Counter Triggers

```sql
-- Attendee count on events
CREATE OR REPLACE FUNCTION update_event_attendee_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.book_club_events
  SET attendee_count = (
    SELECT COUNT(*) FROM public.event_rsvps
    WHERE event_id = COALESCE(NEW.event_id, OLD.event_id)
    AND rsvp_status = 'confirmed'
  )
  WHERE id = COALESCE(NEW.event_id, OLD.event_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_rsvp_count
  AFTER INSERT OR UPDATE OR DELETE ON public.event_rsvps
  FOR EACH ROW EXECUTE FUNCTION update_event_attendee_count();

-- Similar triggers for:
-- discussion_topics.post_count (on discussion_posts INSERT/DELETE)
-- discussion_topics.member_count (on discussion_posts INSERT/DELETE)
-- discussion_posts.likes (on discussion_votes INSERT/UPDATE/DELETE)
-- promo_codes.total_uses (on promo_code_usages INSERT)
```

### Auto-Create User Profile on Auth Signup

```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, display_name, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

---

## 11. Storage Architecture

### Supabase Storage Buckets

| Bucket | Access | Contents |
|---|---|---|
| `book-covers` | Public read, admin write | Standard-sized book cover images (`.webp`, `.jpg`) |
| `book-pdfs` | Private (admin only) | Original uploaded PDF files |
| `book-pages` | Authenticated read (library owners), admin write | Rendered page images (WebP) preserving exact PDF layout |
| `book-illustrations` | Authenticated read (library owners), admin write | Extracted inline illustration images |
| `avatars` | Private (own user), admin read | User profile images |

### Storage Policies

```sql
-- book-covers: public read
CREATE POLICY "Public can view book covers"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'book-covers');

-- book-illustrations: only library owners
CREATE POLICY "Library owners can view illustrations"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'book-illustrations'
    AND EXISTS (
      SELECT 1 FROM public.user_library
      WHERE user_id = auth.uid()
      AND book_id = (storage.foldername(name))[1]::uuid
    )
  );
```

---

## 12. External Service Integration

### Stripe Integration Points

| Integration | Edge Function | Stripe API |
|---|---|---|
| One-time book purchase | `checkout` | `PaymentIntents.create()` |
| Premium subscription | `subscribe` | `Subscriptions.create()` |
| Cancel subscription | `cancel-subscription` | `Subscriptions.cancel()` |
| Webhook processing | `stripe-webhook` | Signature verification via `stripe.webhooks.constructEvent()` |

### GoHighLevel Integration Points

| Trigger | Edge Function | GHL API Action |
|---|---|---|
| User registration | Auth trigger → `ghl-sync` | Create contact (ALL users — free + premium) |
| Order confirmed | `checkout` → `email-ops` | Send order confirmation |
| Subscription created | `subscribe` → `email-ops` | Send premium welcome |
| Subscription cancelled | `cancel-subscription` | Send cancellation email |
| User banned | `ban-user` | Send ban notification |
| Payment failed | `stripe-webhook` → `invoice-failed` | Send payment failure notice |

---

## 13. Environment & Configuration Management

### Required Environment Variables

```bash
# .env.example

# ── Supabase ──
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_DB_URL=postgresql://postgres:postgres@localhost:54322/postgres

# ── Stripe ──
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PREMIUM_PRICE_ID=price_...       # $49.99 initial
STRIPE_PREMIUM_RECURRING_PRICE_ID=price_...  # $3.99/mo

# ── GoHighLevel ──
GHL_API_KEY=your-ghl-api-key
GHL_LOCATION_ID=your-location-id
GHL_WEBHOOK_URL=https://...

# ── App Config ──
NEXT_PUBLIC_APP_URL=http://localhost:3000
GST_TAX_RATE=0.05
DEALER_DISCOUNT_PERCENT=35
FLAT_SHIPPING_RATE=5.99
```

---

## 14. Deployment Pipeline

### Local Development

```bash
# 1. Start Supabase locally
supabase start

# 2. Run migrations
supabase db push

# 3. Seed development data
supabase db seed

# 4. Start Edge Functions
supabase functions serve

# 5. Start Next.js frontend
npm run dev
```

### Production Deployment

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│  Git Push     │────▶│  CI Pipeline  │────▶│  Supabase     │
│  (main)       │     │  (GitHub      │     │  (Production) │
│               │     │   Actions)    │     │               │
└─────────────┘     └──────┬───────┘     └──────────────┘
                           │
                    ┌──────┴───────┐
                    │  Steps:       │
                    │  1. Lint       │
                    │  2. Type check │
                    │  3. Run tests  │
                    │  4. Migrate DB │
                    │  5. Deploy fns │
                    │  6. Deploy FE  │
                    └──────────────┘
```

---

## 15. Scalability & Performance Plan

| Concern | Strategy | Implementation |
|---|---|---|
| **Database performance** | Indexes on all hot query paths | `00010_create_indexes.sql` — per Phase 2 index plan |
| **Full-text search** | PostgreSQL `tsvector` + GIN index | Applied to `books(title, author)` |
| **Reading progress writes** | Client-side debounce (30s) | Reduces DB writes by ~60x vs. every scroll |
| **Pagination** | Cursor-based on all list endpoints | Avoids `OFFSET` performance degradation |
| **Denormalized counters** | DB triggers for `attendee_count`, `post_count`, `likes`, `total_uses` | Avoids expensive `COUNT(*)` queries |
| **Lazy page loading** | Pages stored as separate rows, rendered as images | Frontend loads one page image at a time ("Page X of Y" navigation) |
| **Edge Function cold starts** | Keep functions small and focused | Each function < 500 LOC, minimal imports |
| **File storage** | Supabase Storage CDN | Cover images served from CDN edge nodes |
| **Connection pooling** | Supabase PgBouncer (built-in) | Handles concurrent connections without overwhelming PostgreSQL |
| **Rate limiting** | Per Phase 3 spec (10/min auth, 100/min read, 30/min write) | Implemented via Supabase API gateway + Edge Function guards |

---

> **Next Step**: Phase 5 — Backend Implementation. With the architecture fully planned, the implementation phase builds the actual SQL migrations, Edge Functions, RLS policies, and test suites following this blueprint. The folder structure and patterns defined here ensure every line of backend code has a clear, predictable home.
