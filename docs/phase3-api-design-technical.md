# Phase 3: API Design — Technical Reference (As-Built)

> **Status**: Implemented and deployed  
> **Supabase Project**: `kpafjhkrjipiyfjizyaw`  
> **Frontend Base URL**: Vercel deployment  
> **Edge Functions Base URL**: `https://kpafjhkrjipiyfjizyaw.supabase.co/functions/v1/`  
> **Last Updated**: February 2026  

---

## Table of Contents

1. [API Architecture Overview](#1-api-architecture-overview)
2. [Authentication & Authorization](#2-authentication--authorization)
3. [Base URLs & Conventions](#3-base-urls--conventions)
4. [Standard Error Envelope](#4-standard-error-envelope)
5. [Edge Function Reference](#5-edge-function-reference)
6. [Next.js API Route Reference](#6-nextjs-api-route-reference)
7. [Direct Supabase SDK Queries](#7-direct-supabase-sdk-queries)
8. [Webhook Contracts](#8-webhook-contracts)
9. [Pagination Strategy](#9-pagination-strategy)
10. [Rate Limiting](#10-rate-limiting)
11. [API Testing Setup](#11-api-testing-setup)

---

## 1. API Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser (Next.js Client Components)                             │
│                                                                   │
│  Direct SDK calls:              supabase.from('books').select()  │
│  Function calls:                supabase.functions.invoke(...)   │
│  Next.js API calls:             fetch('/api/...')                │
│  Stripe.js calls:               stripe.confirmPayment(...)       │
└──────────────────┬──────────────────────────┬────────────────────┘
                   │                          │
                   ▼                          ▼
┌──────────────────────────┐    ┌────────────────────────────────┐
│  Supabase Edge Functions  │    │  Next.js API Routes (Vercel)   │
│  (Deno runtime)           │    │  (Node.js / Edge Runtime)      │
│                           │    │                                │
│  process-checkout         │    │  /api/checkout (proxy)        │
│  create-subscription      │    │  /api/subscribe (proxy)       │
│  stripe-webhook           │    │  /api/validate-dealer-code    │
│  cancel-subscription      │    │  /api/admin/* (CRUD)          │
│  reactivate-subscription  │    │                                │
│  email-ops                │    └──────────────┬─────────────────┘
│  ghl-sync                 │                   │
│  get-book-pages           │                   │
│  upload-book              │                   │
└──────────────┬────────────┘                   │
               │                                │
               ▼                                ▼
  ┌────────────────────────────────────────────────────────┐
  │  Supabase (kpafjhkrjipiyfjizyaw.supabase.co)           │
  │  PostgreSQL 15 + Supabase Auth + Supabase Storage      │
  └────────────────────────────────────────────────────────┘
               │
               ├── Stripe API (payments, subscriptions)
               └── GoHighLevel API (email + CRM)
```

---

## 2. Authentication & Authorization

### Authentication Method
**JWT (RS256)** issued by Supabase Auth.

**Token delivery:**
- Browser to Edge Functions: `Authorization: Bearer <jwt>` header (automatically added by `supabase.functions.invoke()`)
- Browser to Next.js API Routes: via Next.js cookie session (read by `@supabase/ssr`)
- Internal: Edge Functions calling other Edge Functions use `SUPABASE_SERVICE_ROLE_KEY`

### Authorization Tiers

| Tier | Identifier | Access |
|---|---|---|
| Guest | No JWT | Public books, book club selections, public events |
| Reader | Valid JWT, `role = 'reader'`, no active premium | Own cart, orders, library, reading features, public events + RSVPs |
| Premium | Valid JWT, `role = 'reader'`, active premium subscription | All of above + discussions, all events |
| Admin | Valid JWT, `role = 'admin'` | Full access, bypasses RLS via service_role key |
| Banned | Valid JWT, `is_banned = true` | Own library reading only |

### Internal API Authentication
Internal API routes and function-to-function calls use the `INTERNAL_API_SECRET` environment variable:
```
X-Internal-Secret: <INTERNAL_API_SECRET_VALUE>
```

### Stripe Webhook Authentication
Stripe webhook payloads are verified using HMAC-SHA256:
```typescript
stripe.webhooks.constructEventAsync(body, signature, STRIPE_WEBHOOK_SECRET)
```

---

## 3. Base URLs & Conventions

### Edge Functions
```
https://kpafjhkrjipiyfjizyaw.supabase.co/functions/v1/{function-name}
```

**Headers required:**
```
Authorization: Bearer <user-jwt>
Content-Type: application/json
apikey: <supabase-anon-key>      // Added automatically by supabase.functions.invoke()
```

### Next.js API Routes
```
https://<vercel-deployment>/api/{route}
```

### Supabase REST API (direct SDK queries)
```
https://kpafjhkrjipiyfjizyaw.supabase.co/rest/v1/{table}
```
Accessed via the SDK only — never call the REST endpoint directly in application code.

### Conventions

| Convention | Rule |
|---|---|
| Request format | `application/json` body for POST/PATCH/PUT |
| Response format | `application/json` |
| Timestamps | ISO 8601: `2026-02-21T00:00:00.000Z` |
| IDs | UUID v4 |
| Money | `NUMERIC(10,2)` in DB; cents (`Integer`) for Stripe API |
| HTTP methods | POST for all Edge Functions (no GET Edge Functions in this project) |

---

## 4. Standard Error Envelope

All Edge Functions and API routes return errors in this shape:

```typescript
interface ErrorResponse {
    error: {
        code: string        // Machine-readable constant
        message: string     // Human-readable description
        details?: Array<{   // Optional per-field validation errors
            field: string
            issue: string
        }>
    }
}
```

```json
// Example
{
    "error": {
        "code": "VALIDATION_ERROR",
        "message": "Cart is empty",
        "details": [
            { "field": "items", "issue": "At least one item is required" }
        ]
    }
}
```

### Defined Error Codes

```typescript
const ErrorCodes = {
    VALIDATION_ERROR:        { status: 400, code: 'VALIDATION_ERROR' },
    UNAUTHORIZED:            { status: 401, code: 'UNAUTHORIZED' },
    FORBIDDEN:               { status: 403, code: 'FORBIDDEN' },
    NOT_FOUND:               { status: 404, code: 'NOT_FOUND' },
    CONFLICT:                { status: 409, code: 'CONFLICT' },
    BUSINESS_RULE_VIOLATION: { status: 422, code: 'BUSINESS_RULE_VIOLATION' },
    RATE_LIMITED:            { status: 429, code: 'RATE_LIMITED' },
    INTERNAL_ERROR:          { status: 500, code: 'INTERNAL_ERROR' },
}
```

**Additional business-specific code:**
- `AMOUNT_TOO_SMALL` (400) — Stripe minimum not met

---

## 5. Edge Function Reference

---

### `POST /functions/v1/process-checkout`

Initiates a book purchase. Validates cart, calculates totals, creates PaymentIntent, saves order.

**Auth**: Required (user JWT)  
**Invocation**: `supabase.functions.invoke('process-checkout', { body })`  

**Request Body:**
```typescript
{
    items: Array<{
        bookId: string          // books.id (UUID)
        variantId: string       // book_variants.id (UUID)
        format: 'ebook' | 'paper_book' | 'komet_card'
        quantity: number        // >= 1
    }>
    promoCode?: string          // Optional dealer code (e.g., "KANE-SMITH-4821")
    shippingAddress?: {         // Required if any item.format !== 'ebook'
        firstName: string
        lastName: string
        address: string
        city: string
        zip: string             // 5-digit or 9-digit US postal code
        country: string
    }
}
```

**Response (200):**
```typescript
{
    clientSecret: string        // Stripe PaymentIntent client secret (null if isFree)
    orderId: string             // orders.id (UUID)
    isFree: boolean             // true if totalAmount === 0
}
```

**Business Logic:**
1. `supabase.auth.getUser()` from `Authorization` header
2. Fetch `book_variants` for all `variantId`s → validate existence
3. Calculate `subtotal = Σ(variant.price * item.quantity)`
4. Apply `promoCode` if present → validate `is_active = true`, compute `discountAmount`
5. `shippingAmount = items.any(format ≠ 'ebook') ? 5.99 : 0`
6. `taxAmount = (subtotal - discountAmount) * 0.05`
7. `totalAmount = subtotal - discountAmount + taxAmount + shippingAmount`
8. If `totalAmount > 0 && totalAmount < 0.50` → `AMOUNT_TOO_SMALL` error
9. If `totalAmount > 0` → `stripe.paymentIntents.create({ amount: Math.round(total * 100), ... })`
10. Insert `orders` record (status: `'pending'` if `totalAmount > 0`)
11. Insert `promo_code_usages` if promo used
12. Insert `order_items[]`
13. Return `{ clientSecret, orderId, isFree }`

**Error Scenarios:**

| Condition | Error Code | HTTP |
|---|---|---|
| No auth / invalid JWT | `UNAUTHORIZED` | 401 |
| Items array empty | `VALIDATION_ERROR` | 400 |
| Invalid variant ID | `VALIDATION_ERROR` | 400 |
| Total < $0.50 | `AMOUNT_TOO_SMALL` | 400 |
| DB write failure | `DATABASE_ERROR` | 500 |

---

### `POST /functions/v1/create-subscription`

Creates the initial $49.99 Book Club subscription PaymentIntent.

**Auth**: Required (user JWT)  
**Invocation**: `supabase.functions.invoke('create-subscription', { body })`  

**Request Body:**
```typescript
{
    selectedBookIds: string[]   // Exactly 2 book UUIDs (is_book_club_eligible = true)
    tshirtSize: 'xs' | 's' | 'm' | 'l' | 'xl' | 'xxl' | 'xxxl'
    mailingAddress: string
    fullName: string
    phone: string
}
```

**Response (200):**
```typescript
{
    clientSecret: string        // Stripe PaymentIntent client secret for $49.99
}
```

**Business Logic:**
1. Validate all required fields present
2. `getOrCreateStripeCustomer()` → checks/creates Stripe Customer, saves to `users.stripe_customer_id`
3. `stripe.paymentIntents.create({ amount: 4999, currency: 'usd', ... })` with full metadata:
   ```
   metadata: {
     type: 'subscription_initial',
     user_id, selected_book_ids (JSON), tshirt_size, mailing_address, full_name, phone
   }
   ```
4. Return `{ clientSecret }`

**Fulfillment:** via `stripe-webhook` on `payment_intent.succeeded` — see webhook reference.

---

### `POST /functions/v1/stripe-webhook`

Receives and verifies Stripe webhook events. Handles payment fulfillment and subscription lifecycle.

**Auth**: Stripe webhook signature (`stripe-signature` header + `STRIPE_WEBHOOK_SECRET`)  
**Client**: Admin (service_role) — bypasses RLS  

**Handled Events:**

| Stripe Event | Handler Function |
|---|---|
| `payment_intent.succeeded` | `handlePaymentSuccess()` |
| `payment_intent.payment_failed` | `handlePaymentFailure()` |
| `customer.subscription.updated` | `handleSubscriptionUpdate()` |
| `customer.subscription.deleted` | `handleSubscriptionUpdate()` |
| `invoice.payment_failed` | `handleInvoiceFailure()` |

**`handlePaymentSuccess`** (book purchase):
```typescript
// 1. UPDATE orders SET status='confirmed' WHERE stripe_payment_intent_id=paymentIntent.id
// 2. If order.shipping_address → UPDATE users SET mailing_address, full_name
// 3. SELECT order_items + book_variants WHERE order_id=order.id
// 4. For each item WHERE variant.format === 'ebook':
//    UPSERT user_library (user_id, book_id, source:'purchase')
// 5. POST to email-ops: { event: 'ORDER_CONFIRMED', userId: order.user_id }
// 6. If paymentIntent.metadata.type === 'subscription_initial':
//    → call handleSubscriptionInitialSuccess()
```

**`handleSubscriptionInitialSuccess`**:
```typescript
// 1. Parse metadata: user_id, selected_book_ids[], tshirt_size, mailing_address, full_name, phone
// 2. UPDATE users SET tshirt_size, mailing_address, full_name, phone
// 3. stripe.subscriptions.create({ customer, items:[priceId], trial_period_days:30 })
// 4. UPSERT user_subscriptions { plan:'premium', status:'active', stripe_subscription_id, ... }
// 5. UPSERT user_library[] for selectedBookIds (source:'subscription_signup')
// 6. UPSERT promo_codes { code:'KANE-FIRSTNAME-PHONELAST4', owner_id, discount_percent:35 }
// 7. POST to email-ops: { event: 'WELCOME_PREMIUM', userId: user_id }
```

**`handleSubscriptionUpdate`**:
```typescript
const statusMap = {
    'active':             'active',
    'trialing':           'active',
    'past_due':           'past_due',
    'unpaid':             'past_due',
    'canceled':           'cancelled',
    'incomplete':         'past_due',
    'incomplete_expired': 'expired'
}
// UPDATE user_subscriptions SET status, expires_at, cancelled_at WHERE stripe_subscription_id=...
// If status === 'canceled' → POST to email-ops: { event: 'SUBSCRIPTION_CANCELLED' }
```

**`handleInvoiceFailure`**:
```typescript
// SELECT user_id FROM user_subscriptions WHERE stripe_subscription_id=invoice.subscription
// POST to email-ops: { event: 'PAYMENT_FAILED', userId }
```

**Response (200):**
```json
{ "received": true }
```

---

### `POST /functions/v1/cancel-subscription`

Cancels the active Stripe subscription at period end.

**Auth**: Required (user JWT via `supabase.functions.invoke`)  

**Request Body:** (empty body — user identity from JWT)

**Response (200):**
```typescript
{ success: true }
```

**Business Logic:**
1. `getUser()` from JWT
2. Fetch `user_subscriptions WHERE user_id AND status='active'`
3. `stripe.subscriptions.update(stripe_subscription_id, { cancel_at_period_end: true })`
4. `UPDATE user_subscriptions SET expires_at=current_period_end, cancelled_at=now()`

---

### `POST /functions/v1/reactivate-subscription`

Reverses a pending cancellation. Reactivates the subscription and dealer code.

**Auth**: Required (user JWT)  

**Response (200):**
```typescript
{ success: true }
```

**Business Logic:**
1. Find existing subscription
2. `stripe.subscriptions.update(stripe_subscription_id, { cancel_at_period_end: false })`
3. `UPDATE user_subscriptions SET cancelled_at=null, expires_at=null, status='active'`
4. `UPDATE promo_codes SET is_active=true WHERE owner_id=user.id`

---

### `POST /functions/v1/email-ops`

Dispatches email events to GoHighLevel.

**Auth**: Internal only — not called from browser  
**Internal Header**: `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>`  

**Request Body:**
```typescript
{
    event: 'ORDER_CONFIRMED' | 'WELCOME_PREMIUM' | 'PAYMENT_FAILED' | 'SUBSCRIPTION_CANCELLED'
    userId: string             // users.id (UUID)
    metadata?: {               // Optional event-specific context
        orderId?: string
    }
}
```

**Response (200):**
```json
{ "success": true }
```

---

### `POST /functions/v1/ghl-sync`

Syncs a user's profile data to GoHighLevel contacts.

**Auth**: Internal only  

**Request Body:**
```typescript
{
    userId: string
}
```

**Business Logic:**
1. Fetch full user profile from `public.users`
2. `ghlClient.upsertContact({ email, phone, firstName, lastName, customFields: { tshirt_size, dealer_code } })`
3. Handles duplicate-contact conflicts via GHL merge strategy in `_shared/ghl-client.ts`

---

### `POST /functions/v1/get-book-pages`

Returns paginated book pages for the reader.

**Auth**: Required  
**Note**: RLS on `book_pages` and `book_illustrations` tables ensures access only if book is in `user_library`.

**Request Body:**
```typescript
{ bookId: string }
```

**Response (200):**
```typescript
{
    pages: Array<{
        page_number: number
        page_image_url: string
    }>
    illustrations: Array<{
        page_number: number
        position_index: number
        image_url: string
        caption: string | null
    }>
}
```

---

### `POST /functions/v1/upload-book`

PDF upload + content extraction pipeline.

**Auth**: Required + `role = 'admin'`  
**Content-Type**: `multipart/form-data`  

**Request Fields:**
```
pdf: File                   (PDF)
cover: File                 (JPG/PNG/WebP)
title: string
author: string
illustrator?: string
genre: genre_enum_value
seriesName?: string
seriesOrder?: string        (number)
isAgeRestricted: string     ('true' | 'false')
ebookPrice?: string         (decimal)
paperBookPrice?: string     (decimal)
kometCardPrice?: string     (decimal)
```

**Response (200):**
```typescript
{
    bookId: string
    pageCount: number
    illustrationCount: number
}
```

---

## 6. Next.js API Route Reference

---

### `POST /api/validate-dealer-code`

Validates a dealer/promo code at checkout.

**Auth**: Not required for validation step  
**File**: `app/api/validate-dealer-code/route.ts`  

**Request:**
```json
{ "code": "KANE-SMITH-4821" }
```

**Response (200):**
```json
{ "discountPercent": 35, "message": "Dealer code applied! 35% off your order." }
```

**Response (400):**
```json
{ "error": "Invalid or expired dealer code." }
```

**Logic:** Uses admin Supabase client to query `promo_codes WHERE code=input AND is_active=true`.

---

### `GET/POST /api/admin/*`

Admin data operations. All use the Supabase service-role client.

**Auth**: Server-side session check — redirects non-admins

| Route | Method | Purpose |
|---|---|---|
| `/api/admin/users` | GET | Fetch all users |
| `/api/admin/users/[id]` | PATCH | Update user role or ban status |
| `/api/admin/book-club` | GET | Fetch all book club selections |
| `/api/admin/book-club` | POST | Create new book club selection |
| `/api/admin/book-club/[id]` | DELETE | Delete a book club selection |

---

## 7. Direct Supabase SDK Queries

These are called directly from client components — no Edge Function needed. RLS enforces access control.

### Browse Books

```typescript
const { data } = await supabase
    .from('books')
    .select(`
        *,
        book_variants (*)
    `)
    .eq('status', 'published')
```

Returns: all published books with their variants. Ordering and filtering done client-side.

### User Library

```typescript
const { data } = await supabase
    .from('user_library')
    .select(`
        *,
        book:books(id, title, author, cover_image_url)
    `)
    .eq('user_id', userId)
    .order('acquired_at', { ascending: false })
```

### Reading Progress (upsert)

```typescript
await supabase
    .from('reading_progress')
    .upsert({
        user_id: userId,
        book_id: bookId,
        current_page: pageNumber,
        progress_percent: (pageNumber / totalPages) * 100
    }, { onConflict: 'user_id,book_id' })
```

### Highlights

```typescript
// Create
await supabase.from('highlights').insert({
    user_id, book_id, page_number, paragraph_index, text, color, note
})

// Delete
await supabase.from('highlights').delete().eq('id', highlightId)
```

### Bookmarks

```typescript
// Create
await supabase.from('bookmarks').insert({
    user_id, book_id, page_number, label
})

// Delete
await supabase.from('bookmarks').delete().eq('id', bookmarkId)
```

### Reading Settings

```typescript
// Fetch
await supabase.from('reading_settings').select('zoom, theme')
    .eq('user_id', userId).maybeSingle()

// Update
await supabase.from('reading_settings')
    .upsert({ user_id, zoom, theme }, { onConflict: 'user_id' })
```

### Subscription Status

```typescript
await supabase.from('user_subscriptions')
    .select('plan, status, stripe_subscription_id, expires_at, cancelled_at')
    .eq('user_id', userId)
    .maybeSingle()
```

### Book Club Selections (public)

```typescript
await supabase.from('book_club_selections')
    .select(`*, book:books(id, title, author, cover_image_url)`)
    .order('created_at', { ascending: false })
```

### Book Club Events (filtered by premium status)

```typescript
// All users see public events
// Premium users + admins see all
await supabase.from('book_club_events')
    .select('*')
    .eq('status', 'upcoming')
    .order('date')
```
RLS automatically filters to public-only for non-premium users.

---

## 8. Webhook Contracts

### Stripe → `stripe-webhook` Edge Function

**Endpoint**: `https://kpafjhkrjipiyfjizyaw.supabase.co/functions/v1/stripe-webhook`  
**Method**: POST  
**Verification**: `stripe-signature` header + `STRIPE_WEBHOOK_SECRET`

**Handled Event Types:**

```
payment_intent.succeeded
payment_intent.payment_failed
customer.subscription.updated
customer.subscription.deleted
invoice.payment_failed
```

**Required PaymentIntent metadata fields (for book purchases):**
```
metadata: {
    user_id: string
    items: string    // JSON.stringify([{ id, q, f }])
    promo_code: string | null
}
```

**Required PaymentIntent metadata fields (for subscription initial payment):**
```
metadata: {
    type: 'subscription_initial'
    user_id: string
    selected_book_ids: string    // JSON.stringify(string[])
    tshirt_size: string
    mailing_address: string
    full_name: string
    phone: string
}
```

**Response (200):**
```json
{ "received": true }
```

**Response (400):** Stripe will retry if we return non-200.

---

## 9. Pagination Strategy

**Current implementation**: No server-side pagination. The browse page loads all published books at once — this works for small catalogs.

**When needed**: Implement offset-based or cursor-based pagination as catalog grows.

**Planned approach (cursor-based):**
```typescript
// Request
{ cursor?: string, limit: number }

// Response
{
    data: Book[]
    nextCursor: string | null    // Pass back as 'cursor' in next request
    hasMore: boolean
}

// Query
supabase.from('books')
    .select('*')
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(20)
    .gt('created_at', cursor ?? '1970-01-01')
```

**Where pagination is most needed**: discussion posts (could grow quickly), order history.

---

## 10. Rate Limiting

**Current state**: No explicit rate limiting implemented.

**Inherent limits:**
- Supabase Edge Functions: auto-scaled, governed by Supabase plan limits
- Supabase DB connections: pooled through Supabase proxy
- Stripe: standard Stripe API rate limits apply (typically 100 req/s)
- GoHighLevel: per-API-key limits enforced by GHL

**Future implementation (if needed):**
- Supabase `pg_net` extension for IP-based rate limiting
- Vercel Edge Middleware with KV store for frontend rate limiting
- Use `RATE_LIMITED (429)` error code from `errors.ts`

---

## 11. API Testing Setup

### Bruno (Recommended)

Bruno is a free, offline-first API testing tool that stores tests as files in the repo.

**Setup:**
1. Install Bruno: `npm install -g @usebruno/cli`
2. Create collection: `bruno/` directory in project root
3. Create environment files for dev/staging/prod

**Example Bruno request file** (`bruno/checkout.bru`):
```
meta {
  name: Process Checkout
  type: http
  seq: 1
}

post {
  url: {{BASE_URL}}/functions/v1/process-checkout
  body: json
  auth: bearer
}

auth:bearer {
  token: {{USER_JWT}}
}

body:json {
  {
    "items": [{ "bookId": "{{TEST_BOOK_ID}}", "variantId": "{{TEST_VARIANT_ID}}", "format": "ebook", "quantity": 1 }]
  }
}
```

### Stripe CLI (Webhook Testing)

```bash
# Forward Stripe events to local Supabase function
stripe listen --forward-to https://kpafjhkrjipiyfjizyaw.supabase.co/functions/v1/stripe-webhook

# Trigger a test event
stripe trigger payment_intent.succeeded
```

### Supabase Dashboard

- **RLS testing**: Supabase SQL editor — test queries as different roles
- **Edge Function logs**: Dashboard → Edge Functions → Logs
- **DB mutations**: Table editor for verifying data after API calls

### Environment Configuration for Testing

```env
# .env.local (dev)
NEXT_PUBLIC_SUPABASE_URL=https://kpafjhkrjipiyfjizyaw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
INTERNAL_API_SECRET=kanes-komet-internal-api-secret-12345
NEXT_PUBLIC_SHIPPING_RATE=5.99
NEXT_PUBLIC_TAX_RATE=0.05
```

### Recommended API Spec Generation

For onboarding documentation, generate an **OpenAPI 3.1** spec from the TypeScript types:

```bash
# Using ts-to-openapi or similar tooling
npx ts-to-openapi --input lib/supabase/types.ts --output docs/openapi.yaml
```

This allows generating:
- Interactive Swagger UI documentation
- Client SDK generation (for potential mobile apps)
- Mock server via Prism: `npx @stoplight/prism-cli mock docs/openapi.yaml`
