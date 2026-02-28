# Phase 4: Backend Architecture — Technical Reference (As-Built)

> **Status**: Implemented and deployed  
> **Supabase Project**: `kpafjhkrjipiyfjizyaw.supabase.co`  
> **Frontend**: Next.js (App Router) on Vercel  
> **Runtime**: Deno 1.x (Edge Functions)  
> **Language**: TypeScript  
> **Last Updated**: February 2026  

---

## Table of Contents

1. [Technology Stack](#1-technology-stack)
2. [Project Structure](#2-project-structure)
3. [Database Schema Overview](#3-database-schema-overview)
4. [Authentication & Authorization Flow](#4-authentication--authorization-flow)
5. [Row-Level Security (RLS) Policies](#5-row-level-security-rls-policies)
6. [Edge Functions — Architecture](#6-edge-functions--architecture)
7. [Edge Functions — Individual Reference](#7-edge-functions--individual-reference)
8. [Shared Utilities](#8-shared-utilities)
9. [Data Validation Architecture](#9-data-validation-architecture)
10. [Error Handling Framework](#10-error-handling-framework)
11. [Database Triggers](#11-database-triggers)
12. [Storage Architecture](#12-storage-architecture)
13. [External Service Integrations](#13-external-service-integrations)
14. [Environment Variables](#14-environment-variables)
15. [Next.js API Routes](#15-nextjs-api-routes)
16. [Scalability & Performance](#16-scalability--performance)
17. [Migration History](#17-migration-history)

---

## 1. Technology Stack

| Layer | Technology | Version |
|---|---|---|
| **Frontend framework** | Next.js (App Router) | 14.x |
| **UI library** | React | 18.x |
| **Language** | TypeScript | 5.x |
| **Styling** | TailwindCSS | 3.x |
| **BaaS** | Supabase (PostgreSQL) | 15.x |
| **Edge Functions runtime** | Deno | 1.x |
| **Auth** | Supabase Auth (JWT) | 2.x |
| **Payments** | Stripe | Latest SDK |
| **Email / CRM** | GoHighLevel (GHL) API | v1 |
| **Frontend validation** | Zod | 3.x |
| **Deployment: Frontend** | Vercel | — |
| **Deployment: Backend** | Supabase (managed) | — |

---

## 2. Project Structure

```
project-root/
├── app/                         # Next.js App Router
│   ├── api/                     # Next.js API Routes (proxy layer)
│   │   ├── admin/               # Admin data endpoints
│   │   ├── checkout/            # Checkout proxy
│   │   ├── subscribe/           # Subscription proxy
│   │   └── validate-dealer-code/
│   ├── admin/                   # Admin panel pages
│   │   ├── books/               # Book catalog management
│   │   ├── book-club/           # Book club selection management
│   │   ├── discussions/         # Discussion topic management
│   │   ├── events/              # Event management
│   │   ├── upload/              # Book PDF upload
│   │   └── users/               # User management
│   ├── book/[id]/               # Book detail pages
│   ├── book-club/               # Book club public pages
│   ├── browse/                  # Book catalog browse
│   ├── cart/                    # Shopping cart
│   ├── checkout/                # Checkout flow + confirmation
│   ├── dashboard/               # User dashboard + library
│   ├── login/                   # Auth page
│   ├── read/[id]/               # Book reader
│   ├── globals.css              # Global CSS
│   ├── layout.tsx               # Root layout
│   └── page.tsx                 # Landing page
├── components/                  # Shared React components
│   ├── ui/                      # Primitive UI components (shadcn-style)
│   ├── book-card.tsx
│   ├── book-club-content.tsx
│   ├── book-purchase-section.tsx
│   ├── checkout/                # Checkout component
│   ├── dashboard-content.tsx
│   ├── library-book-card.tsx
│   ├── reading-settings-panel.tsx
│   ├── reading-sidebar.tsx
│   ├── site-header.tsx
│   └── subscription-modal.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts            # Browser Supabase client
│   │   ├── server.ts            # SSR Supabase client (cookies)
│   │   ├── admin.ts             # Service-role Supabase client (API routes)
│   │   ├── middleware.ts        # Route protection + session refresh
│   │   ├── types.ts             # Full DB type definitions
│   │   └── database.types.ts    # Auto-generated types (Supabase CLI)
│   ├── book/                    # Book-related utilities
│   ├── reading-storage.ts       # localStorage reading state utilities
│   ├── book-club-utils.ts       # Book club helper functions
│   └── utils.ts                 # General utilities
├── supabase/
│   ├── functions/               # Edge Functions
│   │   ├── _shared/             # Shared utilities
│   │   │   ├── cors.ts
│   │   │   ├── errors.ts
│   │   │   ├── ghl-client.ts
│   │   │   ├── stripe-client.ts
│   │   │   └── supabase-client.ts
│   │   ├── cancel-subscription/index.ts
│   │   ├── create-subscription/index.ts
│   │   ├── email-ops/index.ts
│   │   ├── get-book-pages/index.ts
│   │   ├── ghl-sync/index.ts
│   │   ├── process-checkout/
│   │   │   ├── index.ts         # Entry point (CORS, HTTP, routing)
│   │   │   └── handler.ts       # Business logic
│   │   ├── reactivate-subscription/index.ts
│   │   ├── stripe-webhook/index.ts
│   │   └── upload-book/
│   │       ├── index.ts
│   │       └── ... (PDF processing utilities)
│   └── migrations/              # SQL migration files (run in order)
└── docs/                        # Project documentation
```

---

## 3. Database Schema Overview

The database (`kpafjhkrjipiyfjizyaw`) contains **21 tables** across 6 functional domains:

### Domain Map

```
Users & Auth:        users, user_subscriptions
Catalog & Content:   books, book_variants, book_pages, book_illustrations
Commerce:            cart_items, orders, order_items, user_library, promo_codes, promo_code_usages
Book Club:           book_club_selections, book_club_events, event_rsvps
Community:           discussion_topics, discussion_posts, discussion_votes
Reading Experience:  reading_progress, highlights, bookmarks, reading_settings
Admin:               audit_log
```

### Key Schema Characteristics

- **RLS enabled on all tables** — security is database-enforced, not just API-enforced
- **`updated_at` auto-trigger** on all mutable tables
- **Soft delete** (`deleted_at`) on `users`, `books`, `discussion_topics`, `discussion_posts`
- **Cascade delete** on `books` → `order_items`, `user_library`, `book_club_selections` (migration `20260227200000`)
- **Full-text search** GIN index on `books(title, author)`
- **Partial index** on `books(is_book_club_eligible)` where true
- **Denormalized counters** on `discussion_topics.post_count`, `book_club_events.attendee_count`, `discussion_posts.likes`

---

## 4. Authentication & Authorization Flow

### Auth Provider: Supabase Auth

Supabase Auth manages the full authentication lifecycle — registration, login, JWT issuance, token refresh.

**JWT Structure (Supabase default)**:
```json
{
  "iss": "https://kpafjhkrjipiyfjizyaw.supabase.co/auth/v1",
  "sub": "<uuid>",
  "email": "user@example.com",
  "role": "authenticated",
  "aat": 1740000000,
  "exp": 1740003600
}
```

**Application role** (`user_role_enum`: `reader`, `admin`) is stored in `public.users.role` and enforced via the `is_admin()` PostgreSQL function, **not** embedded in the JWT.

### Client Setup

**Browser client** (`lib/supabase/client.ts`):
```typescript
import { createBrowserClient } from '@supabase/ssr'
export const createClient = () => createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

**Server client** (`lib/supabase/server.ts`):
```typescript
import { createServerClient } from '@supabase/ssr'
// reads/writes session cookies for SSR
```

**Admin client** (`lib/supabase/admin.ts`):
```typescript
import { createClient } from '@supabase/supabase-js'
// Uses SUPABASE_SERVICE_ROLE_KEY — bypasses RLS
// Server-side Next.js API routes only
```

### Edge Function Client Setup

**`_shared/supabase-client.ts`**:
```typescript
export const createClient = (authHeader?: string) => {
    // If authHeader provided → use anon key + user JWT → respects RLS
    // If no authHeader → use service_role key → bypasses RLS (admin operations)
    const key = authHeader ? anonKey : serviceKey;
    return createSupabaseClient(url, key, {
        global: authHeader ? { headers: { Authorization: authHeader } } : undefined,
        auth: { autoRefreshToken: false, persistSession: false }
    })
}
export const createAdminClient = () => createClient() // service_role
export const createAuthClient = (authHeader: string) => createClient(authHeader) // user context
```

### Middleware Route Protection

`lib/supabase/middleware.ts` runs on every request:
1. Refreshes the session cookie
2. Checks if the path is a protected route (`/dashboard`, `/read/*`, `/admin/*`, etc.)
3. Redirects unauthenticated users to `/login`
4. Checks `role = 'admin'` for `/admin/*` routes — redirects non-admins
5. Checks `subscription.status = 'active'` for premium-only features

---

## 5. Row-Level Security (RLS) Policies

### Helper Functions (PostgreSQL)

```sql
-- Checks active premium subscription
CREATE OR REPLACE FUNCTION is_premium()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_subscriptions
    WHERE user_id = auth.uid()
      AND plan = 'premium'
      AND status = 'active'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Checks admin role
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
      AND role = 'admin'
      AND deleted_at IS NULL
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Checks ban status
CREATE OR REPLACE FUNCTION is_banned()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND is_banned = TRUE
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```

`SECURITY DEFINER STABLE` ensures these functions run with elevated privileges (to read `user_subscriptions`) but the result is safely stable for query planning.

### Policy Summary by Table

```
users:
  SELECT → users_select_own (auth.uid() = id)
  UPDATE → users_update_own (auth.uid() = id)
  ALL    → users_all_admin (is_admin())

books:
  SELECT → books_select_published (status='published' AND deleted_at IS NULL)
  ALL    → books_all_admin (is_admin())

book_variants:
  SELECT → book_variants_select_all (TRUE — everyone)
  ALL    → book_variants_all_admin (is_admin())

book_pages:
  SELECT → book_pages_select_owners
           (is_admin() OR EXISTS(user_library WHERE user_id=auth.uid() AND book_id=book_pages.book_id))

book_illustrations:
  SELECT → Same ownership check as book_pages

user_subscriptions:
  SELECT → user_subscriptions_select_own (auth.uid() = user_id)
  ALL    → user_subscriptions_all_admin

promo_codes:
  SELECT → promo_codes_select_own (auth.uid() = owner_id)
  ALL    → promo_codes_all_admin

cart_items:
  SELECT/INSERT/UPDATE/DELETE → Own rows (auth.uid() = user_id)
  ALL → admins

orders:
  SELECT → orders_select_own (auth.uid() = user_id)
  ALL    → admins

order_items:
  SELECT → Via join through orders → orders.user_id = auth.uid()
  ALL    → admins

user_library:
  SELECT → user_library_select_own (auth.uid() = user_id)
  ALL    → admins

reading_progress:
  ALL (SELECT/INSERT/UPDATE) → reading_progress_all_own (auth.uid() = user_id)

highlights:
  ALL → highlights_all_own (auth.uid() = user_id)

bookmarks:
  ALL → bookmarks_all_own (auth.uid() = user_id)

reading_settings:
  SELECT → own row
  UPDATE → own row
  ALL    → admins

book_club_selections:
  SELECT → TRUE (publicly readable)
  ALL    → admins

book_club_events:
  SELECT → is_public=TRUE (anyone)
  SELECT → is_premium() OR is_admin() (all events)
  ALL    → admins

event_rsvps:
  SELECT → own rows
  INSERT → auth.uid()=user_id AND (is_admin() OR is_premium() OR event.is_public=TRUE)
  UPDATE/DELETE → own rows
  ALL    → admins

discussion_topics:
  SELECT → (is_premium() OR is_admin()) AND deleted_at IS NULL
  ALL    → admins

discussion_posts:
  SELECT → (is_premium() OR is_admin()) AND deleted_at IS NULL AND NOT is_banned()
  INSERT → auth.uid()=author_id AND is_premium() AND NOT is_banned()
  UPDATE → auth.uid()=author_id AND deleted_at IS NULL 
           AND (now() - created_at) <= INTERVAL '15 minutes' AND NOT is_banned()
  DELETE → auth.uid()=author_id AND NOT is_banned() (soft-delete only)
  ALL    → admins

discussion_votes:
  ALL → auth.uid()=user_id AND is_premium() AND NOT is_banned()
  ALL → admins

audit_log:
  SELECT → is_admin()
  (Writes via service_role key from Edge Functions)
```

---

## 6. Edge Functions — Architecture

### Function Entry Point Pattern

Every Edge Function follows this structure:

```typescript
import { corsHeaders } from '../_shared/cors.ts'
import { createErrorResponse, ErrorCodes } from '../_shared/errors.ts'

Deno.serve(async (req) => {
    // 1. CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    // 2. HTTP method guard
    if (req.method !== 'POST') {
        return createErrorResponse(ErrorCodes.VALIDATION_ERROR, 'Method not allowed')
    }

    try {
        // 3. Auth check
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return createErrorResponse(ErrorCodes.UNAUTHORIZED, 'Auth required')
        }

        // 4. Parse body
        const body = await req.json()

        // 5. Business logic
        const result = await handleSomething(authHeader, body)

        // 6. Success response
        return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })

    } catch (err: any) {
        console.error('Function error:', err)
        return createErrorResponse(
            err.status || 500,
            err.code || 'INTERNAL_ERROR',
            err.message || 'Unexpected error'
        )
    }
})
```

### CORS Configuration

`_shared/cors.ts` defines allowed origins. In production, CORS is configured to allow the Vercel deployment domain. The `supabase/config.toml` sets allowed request origins for function invocations.

---

## 7. Edge Functions — Individual Reference

### `process-checkout` (handler.ts)

**Trigger**: Frontend checkout form submission  
**Auth**: Required (user JWT)  
**File structure**: `index.ts` (CORS/routing) → `handler.ts` (business logic)

**Logic flow** (`handleCheckout`):
```typescript
1. getUser() from auth header → 401 if not found
2. Fetch book_variants from DB for all cart items → 400 if invalid
3. Calculate: subtotal = sum(variant.price * qty)
4. Apply promoCode:
   - Fetch from promo_codes WHERE code=input AND is_active=true
   - Compute discountAmount = subtotal * (discount_percent / 100)
5. shippingAmount = items.some(i => i.format !== 'ebook') ? 5.99 : 0
6. taxAmount = (subtotal - discountAmount) * 0.05
7. totalAmount = subtotal - discountAmount + taxAmount + shippingAmount
8. If totalAmount > 0 AND totalAmount < 0.50 → 400 AMOUNT_TOO_SMALL
9. If totalAmount > 0:
   - getOrCreateStripeCustomer() → verifies customer in current Stripe env
   - stripe.paymentIntents.create({ amount: Math.round(total * 100), currency: 'usd', ... })
10. Insert order into DB (status: 'pending' if paid, 'paid' would need webhook)
11. If promoCodeId → insert promo_code_usages
12. Insert order_items[]
13. Return { clientSecret, orderId, isFree: totalAmount === 0 }
```

**`getOrCreateStripeCustomer`**:
- Fetches existing `stripe_customer_id` from `users` table
- Calls `stripe.customers.retrieve()` to validate it exists in current env (test vs live)
- On `resource_missing` error → creates new Stripe customer
- Updates `users.stripe_customer_id` on creation

---

### `stripe-webhook` (index.ts)

**Trigger**: Stripe webhook POST to Supabase Function URL  
**Auth**: Stripe signature (`stripe-signature` header + `STRIPE_WEBHOOK_SECRET`)  
**Client**: Admin (service_role) — bypasses RLS for fulfillment operations

**Handled events**:

| Event | Handler |
|---|---|
| `payment_intent.succeeded` | `handlePaymentSuccess()` |
| `payment_intent.payment_failed` | `handlePaymentFailure()` |
| `customer.subscription.updated` | `handleSubscriptionUpdate()` |
| `customer.subscription.deleted` | `handleSubscriptionUpdate()` |
| `invoice.payment_failed` | `handleInvoiceFailure()` |

**`handlePaymentSuccess`**:
```typescript
1. Update orders SET status='confirmed' WHERE stripe_payment_intent_id=paymentIntent.id
2. If order.shipping_address → update users SET mailing_address, full_name
3. Fetch order_items with variant join:
   SELECT * FROM order_items, book_variants WHERE order_id=order.id
4. For each item WHERE variant.format === 'ebook':
   upsert into user_library (user_id, book_id, source: 'purchase')
   // Note: komet_card does NOT currently auto-grant library access here
5. Trigger email-ops: event='ORDER_CONFIRMED'
6. If paymentIntent.metadata.type === 'subscription_initial':
   → call handleSubscriptionInitialSuccess()
```

**`handleSubscriptionInitialSuccess`**:
```typescript
1. Parse metadata: user_id, selected_book_ids (JSON array), tshirt_size, mailing_address, full_name, phone
2. Update users profile (tshirt_size, mailing_address, full_name, phone)
3. Create Stripe Subscription (at $3.99/mo price, 30-day trial):
   stripe.subscriptions.create({ customer, items: [priceId], trial_period_days: 30, ... })
4. Upsert user_subscriptions (plan:'premium', status:'active', stripe_subscription_id, ...)
5. Upsert user_library for each of selectedBookIds (source: 'subscription_signup')
6. Generate promo code: KANE-{FIRSTNAME}-{PHONELAST4}
   Upsert into promo_codes (owner_id, code, discount_percent: 35, is_active: true)
7. Trigger email-ops: event='WELCOME_PREMIUM'
```

**`handleSubscriptionUpdate`**:
```typescript
statusMap = {
  'active':             → 'active',
  'trialing':           → 'active',
  'past_due':           → 'past_due',
  'unpaid':             → 'past_due',
  'canceled':           → 'cancelled',
  'incomplete':         → 'past_due',
  'incomplete_expired': → 'expired'
}
1. Update user_subscriptions WHERE stripe_subscription_id=subscription.id
   SET status, expires_at, cancelled_at
2. If status === 'canceled' → trigger email-ops: event='SUBSCRIPTION_CANCELLED'
```

**`handlePaymentFailure`**:
```typescript
1. Update orders SET status='pending' (keeps as pending, not failed, for retry)
2. Trigger email-ops: event='PAYMENT_FAILED'
```

**`handleInvoiceFailure`**:
```typescript
1. Find user_id via user_subscriptions WHERE stripe_subscription_id=invoice.subscription
2. Trigger email-ops: event='PAYMENT_FAILED'
```

---

### `create-subscription` (index.ts)

**Trigger**: Frontend subscription modal payment step  
**Auth**: Required (user JWT)

```typescript
1. getUser() → 401 if not found
2. Validate body: selectedBookIds (must be array), tshirtSize, mailingAddress, fullName, phone
3. getOrCreateStripeCustomer()
4. stripe.paymentIntents.create({
     amount: Math.round(49.99 * 100),  // $49.99 initial fee
     currency: 'usd',
     customer: customerId,
     metadata: {
       type: 'subscription_initial',
       user_id, selected_book_ids: JSON.stringify(selectedBookIds),
       tshirt_size, mailing_address, full_name, phone
     }
   })
5. Return { clientSecret }
```

---

### `cancel-subscription` (index.ts)

**Trigger**: Dashboard "Cancel Subscription" button  
**Auth**: Required (user JWT via `supabase.functions.invoke`)

```typescript
1. getUser() → 401 if not found
2. Fetch user_subscriptions WHERE user_id=user.id AND status='active'
3. stripe.subscriptions.update(stripe_subscription_id, { cancel_at_period_end: true })
4. Update user_subscriptions SET expires_at=period_end, cancelled_at=now()
5. Return { success: true }
```

---

### `reactivate-subscription` (index.ts)

**Trigger**: Dashboard "Reactivate Subscription" button  
**Auth**: Required

```typescript
1. Find existing cancelled subscription record for user
2. stripe.subscriptions.update(stripe_subscription_id, { cancel_at_period_end: false })
3. Update user_subscriptions SET cancelled_at=null, expires_at=null, status='active'
4. Reactivate promo code: promo_codes SET is_active=true WHERE owner_id=user.id
5. Return { success: true }
```

---

### `email-ops` (index.ts)

**Trigger**: Internal calls from other Edge Functions (order confirmation, welcome email, etc.)  
**Auth**: `INTERNAL_API_SECRET` header + `SUPABASE_SERVICE_ROLE_KEY`

```typescript
// Dispatches email events to GoHighLevel
// Event types: ORDER_CONFIRMED, WELCOME_PREMIUM, PAYMENT_FAILED, SUBSCRIPTION_CANCELLED

1. Validate Internal-API-Secret header
2. Fetch user (full profile) from users table
3. Ensure GHL contact exists (ghl-client.upsertContact)
4. Apply GHL tag corresponding to the event type
```

---

### `ghl-sync` (index.ts)

**Trigger**: Post-signup, profile update  
**Auth**: `INTERNAL_API_SECRET`

```typescript
// Syncs user profile to GoHighLevel contact
1. Fetch user profile
2. ghl-client.upsertContact({ email, phone, firstName, lastName, customFields })
// Conflict resolution: if duplicate contact by phone/email, merge via GHL API
```

---

### `get-book-pages` (index.ts)

**Trigger**: Book reader on load  
**Auth**: Required (RLS enforces ownership)

```typescript
// Fetches paginated book pages (images + illustrations) for the reader
SELECT from book_pages WHERE book_id=bookId ORDER BY page_number
SELECT from book_illustrations WHERE book_id=bookId
// RLS: user must have book in user_library
```

---

### `upload-book` (index.ts)

**Trigger**: Admin `/admin/upload` page  
**Auth**: Required + `role = 'admin'` check

```typescript
1. Receive multipart: PDF file + book metadata
2. Admin role check
3. Insert book record (or update existing book_file_url)
4. Process PDF:
   a. Upload original PDF → book-pdfs bucket
   b. For each page: render to WebP → book-pages bucket
   c. Extract page text → book_pages.content (for FTS)
   d. Extract inline images → book-illustrations bucket
5. Bulk insert book_pages[] and book_illustrations[]
6. Return { bookId, pageCount, illustrationCount }
```

---

## 8. Shared Utilities

### `_shared/cors.ts`

```typescript
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Restricted to Vercel domains in production config
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, x-anon-key, content-type, x-internal-secret',
}
```

### `_shared/errors.ts`

Standard error codes and `createErrorResponse()` factory:

```typescript
export const ErrorCodes = {
    VALIDATION_ERROR:       { status: 400, code: 'VALIDATION_ERROR' },
    UNAUTHORIZED:           { status: 401, code: 'UNAUTHORIZED' },
    FORBIDDEN:              { status: 403, code: 'FORBIDDEN' },
    NOT_FOUND:              { status: 404, code: 'NOT_FOUND' },
    CONFLICT:               { status: 409, code: 'CONFLICT' },
    BUSINESS_RULE_VIOLATION:{ status: 422, code: 'BUSINESS_RULE_VIOLATION' },
    RATE_LIMITED:           { status: 429, code: 'RATE_LIMITED' },
    INTERNAL_ERROR:         { status: 500, code: 'INTERNAL_ERROR' },
} as const;
```

Error response shape:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Cart is empty",
    "details": [{ "field": "items", "issue": "Required" }]
  }
}
```

### `_shared/stripe-client.ts`

```typescript
import Stripe from 'npm:stripe@14'
export const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
    apiVersion: '2024-04-10',
    httpClient: Stripe.createFetchHttpClient()
})
```

### `_shared/ghl-client.ts`

GoHighLevel REST API client with duplicate-contact conflict resolution:
- `createContact()` — POST to GHL contacts endpoint
- `updateContact()` — PUT to GHL contact
- `upsertContact()` — Look up by email → update or create, with merge logic for phone conflicts
- `applyTag()` — POST tag to GHL contact

---

## 9. Data Validation Architecture

### Three-Layer Validation

```
┌──────────────────────────────────────────────────────┐
│  Layer 1: Frontend (React + Zod)                     │
│  - Form validation (required, format, length)        │
│  - Shipping address required if physical items       │
│  - Email format, password strength                   │
│  - Book selection count = 2                          │
├──────────────────────────────────────────────────────┤
│  Layer 2: Edge Functions (TypeScript)                │
│  - JWT validation → 401 if invalid                   │
│  - Body parsing + field presence checks              │
│  - Business rules:                                   │
│    · Stripe minimum amount ($0.50)                   │
│    · Promo code exists + is_active + not self-use    │
│    · Admin role check for privileged operations      │
│    · Subscription uniqueness check                   │
│  - Response: standardized error envelope             │
├──────────────────────────────────────────────────────┤
│  Layer 3: PostgreSQL (CHECK constraints + RLS)       │
│  - price > 0                                         │
│  - quantity >= 1                                     │
│  - progress_percent BETWEEN 0 AND 100                │
│  - zoom IN (75, 100, 125, 150)                       │
│  - text <> '' (highlights)                           │
│  - UNIQUE constraints (user_id, book_id) etc.        │
│  - RLS: user only reads/writes own data              │
└──────────────────────────────────────────────────────┘
```

---

## 10. Error Handling Framework

All Edge Functions use a unified try/catch pattern:

```typescript
try {
    // business logic
} catch (err: any) {
    // Typed business errors — thrown as plain objects with { status, code, message }
    if (err.status && err.code) {
        return createErrorResponse(err.status, err.code, err.message)
    }
    // Unexpected errors
    console.error('[FunctionName] Unhandled error:', err)
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Unexpected error occurred')
}
```

**Business error throwing pattern**:
```typescript
throw { status: 400, code: 'VALIDATION_ERROR', message: 'Cart is empty' }
throw { status: 401, code: 'UNAUTHORIZED', message: 'User not found' }
throw { status: 422, code: 'BUSINESS_RULE_VIOLATION', message: 'Cannot use your own dealer code' }
```

**HTTP Status Codes Used**:

| Code | ErrorCode | Scenario |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Missing fields, invalid format, amount too small |
| 401 | `UNAUTHORIZED` | No JWT, invalid JWT |
| 403 | `FORBIDDEN` | Valid JWT but insufficient role/premium status |
| 404 | `NOT_FOUND` | Resource not found |
| 409 | `CONFLICT` | Already exists (duplicate subscription, etc.) |
| 422 | `BUSINESS_RULE_VIOLATION` | Self-promo-code use, etc. |
| 500 | `INTERNAL_ERROR` | Unhandled exceptions |

---

## 11. Database Triggers

### `update_updated_at()` — Auto-Timestamp

```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Applied to** (as `BEFORE UPDATE` triggers):
- `users` → `trg_users_updated_at`
- `books` → `trg_books_updated_at`
- `book_variants` → `trg_book_variants_updated_at`
- `reading_settings` → `trg_reading_settings_updated_at`
- `book_club_selections`
- `book_club_events`
- `discussion_topics`
- `discussion_posts`

### `create_user_profile()` — Auto User Profile Creation

**Migration**: `20260221000002_user_sync_trigger.sql` (fixed by `20260222161000`)

```sql
-- Fires on INSERT to auth.users (Supabase Auth)
-- Creates the corresponding public.users row
-- Reads display_name, full_name from raw_user_meta_data
```

### Denormalized Counter Triggers

Applied to:
- `discussion_posts` INSERT/DELETE → updates `discussion_topics.post_count`
- `discussion_votes` INSERT/UPDATE/DELETE → updates `discussion_posts.likes`
- `event_rsvps` INSERT/UPDATE/DELETE → updates `book_club_events.attendee_count`
- `promo_code_usages` INSERT → increments `promo_codes.total_uses`

---

## 12. Storage Architecture

```
Supabase Storage
├── book-covers/        # Book cover images (JPG/WebP)
│   └── {bookId}/cover.webp
├── book-pdfs/          # Original PDFs (admin only)
│   └── {bookId}/book.pdf
├── book-pages/         # Rendered page images (WebP)
│   └── {bookId}/page_{n}.webp
└── book-illustrations/ # Extracted inline illustrations
    └── {bookId}/page_{n}_illus_{i}.webp
```

**Access Policies** (from `20260221200000_storage_buckets.sql`):

| Bucket | Public? | RLS Policy |
|---|---|---|
| `book-covers` | Yes | Anyone can download |
| `book-pdfs` | No | Admin only |
| `book-pages` | No | `user_library` ownership check |
| `book-illustrations` | No | `user_library` ownership check |

---

## 13. External Service Integrations

### Stripe

**Book Purchase (One-Time)**:
```
process-checkout → stripe.paymentIntents.create
                → [client completes payment]
                → stripe webhook → payment_intent.succeeded
                → handlePaymentSuccess → DB fulfillment
```

**Subscription (Recurring)**:
```
create-subscription → stripe.paymentIntents.create (type: 'subscription_initial')
                    → [client pays $49.99]
                    → stripe webhook → payment_intent.succeeded
                    → handleSubscriptionInitialSuccess:
                        → stripe.subscriptions.create (trial 30 days, $3.99/mo)
                        → DB: user_subscriptions, user_library, promo_codes
```

**Stripe Events → DB Status Map**:
```
payment_intent.succeeded       → order.status: 'confirmed'
payment_intent.payment_failed  → order.status: 'pending' (retry expected)
customer.subscription.updated  → user_subscriptions.status: mapped
customer.subscription.deleted  → user_subscriptions.status: 'cancelled'
invoice.payment_failed         → email PAYMENT_FAILED triggered
```

### GoHighLevel

**Contact Sync** (`ghl-sync`):
- Field mappings: `email`, `phone`, `firstName`, `lastName`, custom fields for `tshirt_size`, `dealer_code`
- Conflict resolution: if contact exists by phone with different email → merge/update strategy in `ghl-client.ts`

**Email Event Tags** (applied by `email-ops`):

| Internal Event | GHL Tag |
|---|---|
| `ORDER_CONFIRMED` | `order_confirmed` |
| `WELCOME_PREMIUM` | `welcome_premium` |
| `PAYMENT_FAILED` | `payment_failed` |
| `SUBSCRIPTION_CANCELLED` | `subscription_cancelled` |

GHL automations watch for these tags and send the appropriate templated emails.

---

## 14. Environment Variables

### Frontend / Next.js API Routes (`.env.local` → Vercel)

| Variable | Exposure | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Browser Supabase key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Admin Supabase client (API routes) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Public | Stripe.js initialization |
| `NEXT_PUBLIC_SHIPPING_RATE` | Public | $5.99 flat shipping |
| `NEXT_PUBLIC_TAX_RATE` | Public | 0.05 (5% GST) |
| `INTERNAL_API_SECRET` | Server only | Internal API route auth |

### Supabase Edge Functions (Dashboard → Project Secrets)

| Variable | Purpose |
|---|---|
| `SUPABASE_URL` | Supabase instance URL |
| `SUPABASE_ANON_KEY` | Anon key (for user-context clients) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (admin ops + email-ops) |
| `STRIPE_SECRET_KEY` | Stripe API operations |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signature verification |
| `STRIPE_PREMIUM_RECURRING_PRICE_ID` | Stripe Price ID for $3.99/mo plan |
| `GHL_API_KEY` | GoHighLevel API key |
| `GHL_LOCATION_ID` | GHL sub-account location ID |
| `INTERNAL_API_SECRET` | Must match frontend value |

---

## 15. Next.js API Routes

Next.js API routes in `app/api/` act as a **proxy layer** between the frontend and Supabase Edge Functions. They handle:
- CORS management for browser-to-backend communication
- Server-side session forwarding

| Route | Function |
|---|---|
| `POST /api/checkout` | Proxies to `process-checkout` Edge Function |
| `POST /api/subscribe` | Proxies to `create-subscription` Edge Function |
| `POST /api/validate-dealer-code` | Validates a dealer/promo code |
| `GET /api/admin/*` | Admin data fetches (with service-role client) |

---

## 16. Scalability & Performance

### Current Optimizations

| Optimization | Implementation |
|---|---|
| **Page-image reader** | Loads one WebP per page — no full-book download |
| **Reading progress debounce** | Client debounces to 5s intervals before updating DB |
| **GIN full-text search** | `to_tsvector('english', title || ' ' || author)` on `books` |
| **Partial index for book club** | `CREATE INDEX WHERE is_book_club_eligible = TRUE` |
| **Denormalized counters** | Post/attendee/vote counts updated by triggers |
| **`STABLE` RLS functions** | `is_premium()`, `is_admin()` are `STABLE` — query-plan cached |
| **Connection pooling** | Supabase Edge Functions use ephemeral, short-lived connections |
| **Cascade deletes** | Book deletion atomically removes all orphaned data |

### Future Considerations

- Implement Supabase `pgmq` or background job queue for async PDF processing on large uploads
- Consider CDN caching headers on `book-pages` Storage bucket for frequently accessed page images
- Add `LIMIT` + cursor-based pagination to discussion posts as community grows
- Add Stripe retry logic in webhook handler with exponential backoff

---

## 17. Migration History

| File | Applied | Description |
|---|---|---|
| `20260221000000_initial_schema.sql` | 2026-02-21 | Full schema: 21 tables, enums, triggers, indexes |
| `20260221000001_rls_policies.sql` | 2026-02-21 | RLS: 23 tables, helper functions |
| `20260221000002_user_sync_trigger.sql` | 2026-02-21 | Auto-create `public.users` on Auth signup |
| `20260221100000_reading_rls_policies.sql` | 2026-02-21 | Additional RLS for reading experience tables |
| `20260221200000_storage_buckets.sql` | 2026-02-21 | Storage buckets + access policies |
| `20260222161000_fix_user_sync_metadata.sql` | 2026-02-22 | Fixed user sync trigger metadata parsing |
| `20260223101000_add_book_club_eligibility.sql` | 2026-02-23 | `books.is_book_club_eligible` boolean + partial index |
| `20260223110000_add_library_source_gift.sql` | 2026-02-23 | `admin_gift` value added to `library_source_enum` |
| `20260227200000_cascade_book_deletion.sql` | 2026-02-27 | `ON DELETE CASCADE` on order_items, user_library, book_club_selections |
