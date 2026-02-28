# Phase 4: Backend Architecture — Plain English (As-Built)

> This document explains **how the backend actually works today** — not as a plan, but as an implemented system. Every function, integration, and design decision described below has been deployed and verified against the live codebase.

---

## 1. What is the "Backend"?

The backend is everything the user **can't see** — the database, the server-side logic that runs when you click a button, and the connections to external services like Stripe and GoHighLevel.

For Kane's Komet, the backend is **Supabase** — a platform that provides:
- A **database** (where all data lives)
- **User accounts and login** (Authentication)
- **File storage** (book covers, page images, PDFs)
- **Edge Functions** (server-side code that runs on every request)

---

## 2. The Folder Structure

The project is organized like this:

```
app/                   → All Next.js pages (the frontend)
  api/                 → Next.js API Routes (server-side bridge code)
  admin/               → Admin panel pages
  book-club/           → Book Club pages
  browse/              → Book browse + search
  cart/                → Shopping cart
  checkout/            → Checkout flow
  dashboard/           → User dashboard
  login/               → Login/signup
  read/[id]/           → Book reader
components/            → Reusable UI pieces
lib/                   → Shared TypeScript utilities
  supabase/            → Supabase client setup + types
  book/                → Book utilities
  types/               → TypeScript interfaces
supabase/              → All Supabase backend code
  functions/           → Edge Functions (server-side code)
    _shared/           → Shared utilities for functions
    cancel-subscription/
    create-subscription/
    email-ops/
    get-book-pages/
    ghl-sync/
    process-checkout/
    reactivate-subscription/
    stripe-webhook/
    upload-book/
  migrations/          → Database schema files (run in order)
docs/                  → Project documentation
```

### The Simple Rule: One Responsibility Per Function

Each Edge Function does **exactly one job**. Nothing more. This makes bugfixes easy — if something is wrong with checkout, you look in `process-checkout`. If subscriptions are wrong, you look in `create-subscription`.

---

## 3. The Database: Where Everything Lives

The database is a real **PostgreSQL** database hosted by Supabase. Every user, book, order, and comment lives here.

### The 9 Migration Files

The database was built step-by-step through **migration files** — SQL scripts that run in sequence to shape the database exactly as needed:

| File | What It Created |
|---|---|
| `20260221000000_initial_schema.sql` | The **entire database** — all 21 tables, all rules |
| `20260221000001_rls_policies.sql` | **Security rules** — who can see/edit what |
| `20260221000002_user_sync_trigger.sql` | **Auto-profile creation** — when you register, your profile is auto-created |
| `20260221100000_reading_rls_policies.sql` | Security rules specifically for the reader |
| `20260221200000_storage_buckets.sql` | **Storage buckets** for PDFs, covers, pages, illustrations |
| `20260222161000_fix_user_sync_metadata.sql` | Fixed the profile trigger to correctly read name data |
| `20260223101000_add_book_club_eligibility.sql` | Added `is_book_club_eligible` flag to books |
| `20260223110000_add_library_source_gift.sql` | Added `admin_gift` as a way for admins to give books |
| `20260227200000_cascade_book_deletion.sql` | Fixed admin book deletion (prevented database errors) |

### Why Migrations?
Instead of manually making changes to the database, every change is written as a numbered SQL file. This means the entire database can be rebuilt from scratch — on any computer, any server — just by running the files in order. That's critical for Vercel deployments, team collaboration, and debugging.

---

## 4. Security: Three Layers

Security is not handled in one place — it's enforced at **three separate levels** so that even if one layer is bypassed, the others hold:

### Layer 1: Frontend Route Protection
The `middleware.ts` file (at `lib/supabase/middleware.ts`) intercepts every page request in Next.js. If a user tries to visit `/dashboard` or `/admin` without being logged in, they're redirected automatically. This is the first gate.

### Layer 2: Row-Level Security (RLS)
Every table in the database has **Row-Level Security** enabled. RLS is a database-level rule that says "this user can only read/write their own rows." For example:
- You can see your own orders, but not anyone else's.
- You can edit your own reading progress, but not someone else's.
- Free readers cannot see any discussion topics or posts — the database refuses to return those rows entirely.

RLS is declared in SQL and enforced by PostgreSQL itself, not by our application code. This means even if the app code has a bug, the database still protects the data.

### Layer 3: Edge Function Guards
Each Edge Function has its own authorization checks. For example:
- Before processing a checkout, `process-checkout` verifies the user is authenticated.
- Before creating a subscription, `create-subscription` confirms no subscription already exists.
- Admin-only operations (booking management, user management) verify the requesting user has `role = 'admin'` before executing.

This means no amount of clever manipulation of the frontend can bypass server-side rules.

---

## 5. The Edge Functions: The Engine Room

Edge Functions are **server-side JavaScript/TypeScript code** that runs in Deno (a modern JavaScript runtime). They're the action layer — executed when something needs to actually happen.

### Currently Deployed Functions

| Function | What It Does |
|---|---|
| `process-checkout` | Creates a Stripe PaymentIntent for book purchases. Saves the order and order items to the database. Also creates/verifies the Stripe Customer. |
| `stripe-webhook` | Receives events from Stripe when payments succeed or fail. Confirms orders, grants library access for ebook purchases, triggers welcome/confirmation/cancellation emails. Also handles monthly subscription renewal via the Stripe `customer.subscription.updated` event. |
| `create-subscription` | Handles the initial $49.99 Book Club signup payment. Creates the Stripe PaymentIntent for the initial fee. |
| `cancel-subscription` | Cancels the user's Stripe subscription at period end. |
| `reactivate-subscription` | Reactivates a previously cancelled subscription. |
| `email-ops` | Dispatches email events to GoHighLevel (GHL). Adds tags like `ORDER_CONFIRMED`, `WELCOME_PREMIUM`, `PAYMENT_FAILED`, `SUBSCRIPTION_CANCELLED` to GHL contacts. |
| `ghl-sync` | Syncs a user's profile data (name, email, phone, etc.) to GoHighLevel as a contact. Called after signup and after profile updates. |
| `get-book-pages` | Fetches a book's page images from Supabase Storage. Used for the reader experience. |
| `upload-book` | Receives a PDF upload from the admin panel, extracts each page as a WebP image, extracts inline illustrations, extracts page text for search, and saves everything to Supabase Storage and the database. |

### How a Function Works (simplified)

```
1. Request arrives (from frontend or external service like Stripe)
2. CORS check (is this request from an allowed origin?)
3. Auth check (is this user logged in? Do they have permission?)
4. Validation (is the data in the correct format?)
5. Business logic (do the actual thing: write to DB, call Stripe, etc.)
6. Response (send back success or error)
```

---

## 6. The `_shared` Utilities

The `/supabase/functions/_shared/` folder holds code used by **multiple Edge Functions** — so it's written once and imported by all:

| File | What It Contains |
|---|---|
| `supabase-client.ts` | Creates Supabase database connections (one that respects security rules, one that bypasses them for admin operations) |
| `stripe-client.ts` | Initializes the Stripe SDK with the API key |
| `ghl-client.ts` | A client for talking to the GoHighLevel API — handles creating, updating, and conflict-resolving contacts |
| `cors.ts` | Standard CORS headers — which websites are allowed to call our functions |
| `errors.ts` | Standard error shapes — every error from every function looks the same |

### CORS Configuration
CORS answers the question: "Is this website allowed to talk to our backend?"

Allowed origins are configured in `cors.ts` and are based on the deployed frontend URLs (e.g., the Vercel production URL and `localhost:3000` for local development). Without this, browsers block all cross-domain requests.

---

## 7. The Checkout Flow: Step by Step

Here's exactly what happens when a user buys a book:

```
User clicks "Buy Now" → checkout page
  ↓
Frontend calls process-checkout Edge Function
  ↓
process-checkout:
  1. Verifies the user is logged in
  2. Fetches real prices from the database
  3. Applies dealer code discount (if any) — validates code is active + not self-used
  4. Calculates total: subtotal - discount + 5% GST + $5.99 shipping (if physical)
  5. Creates/verifies Stripe Customer (stores Stripe Customer ID in users table)
  6. Creates Stripe PaymentIntent (returns client secret to frontend)
  7. Saves the order and order items to the database (status: 'pending')
  ↓
Frontend shows Stripe payment form (uses client secret)
  ↓
User enters card details → Stripe processes payment
  ↓
Stripe sends webhook event "payment_intent.succeeded"
  ↓
stripe-webhook Edge Function receives event:
  1. Updates order status to 'confirmed'
  2. Updates user's mailing address from shipping data
  3. For each ebook item: adds book to user_library (source: 'purchase')
  4. Sends 'ORDER_CONFIRMED' event to email-ops → GoHighLevel sends confirmation email
```

---

## 8. The Subscription Flow: Step by Step

Here's what happens when a user joins the Book Club:

```
User completes subscription modal:
  - Enters name, phone, T-shirt size, mailing address
  - Picks 2 free books
  ↓
Frontend calls create-subscription Edge Function
  ↓
create-subscription:
  1. Verifies the user is logged in
  2. Gets or creates a Stripe Customer
  3. Creates a Stripe PaymentIntent for $49.99 (with all metadata: user_id, selected_book_ids, etc.)
  4. Returns the client_secret to the frontend
  ↓
Frontend shows Stripe payment form
  ↓
User enters card details → Stripe processes $49.99 payment
  ↓
Stripe sends webhook event "payment_intent.succeeded" with metadata.type = "subscription_initial"
  ↓
stripe-webhook Edge Function receives event:
  1. handleSubscriptionInitialSuccess() is called:
  2. Updates user profile (name, phone, T-shirt size, mailing address)
  3. Creates a Stripe recurring subscription at $3.99/month with a 30-day trial
  4. Creates the user_subscriptions record in the DB (plan: 'premium', status: 'active')
  5. Adds the 2 selected books to user_library (source: 'subscription_signup')
  6. Generates dealer code: KANE-FIRSTNAME-PHONELAST4 (saved to promo_codes table)
  7. Sends 'WELCOME_PREMIUM' event to email-ops → GoHighLevel sends welcome email
```

---

## 9. Validation: Data Gets Checked Three Times

| Stage | Who Does It | What Gets Checked |
|---|---|---|
| **Frontend** | React + Zod (forms) | Form fields, required inputs, email format |
| **Edge Function** | TypeScript + manual checks | Auth, business rules (e.g., self-use of promo code), Stripe amount minimums |
| **Database** | PostgreSQL CHECK constraints | Price > 0, quantity ≥ 1, progress 0–100, zoom ∈ {75,100,125,150} |

This triple-check means no bad data can sneak in at any level.

---

## 10. Error Handling: Consistent and Predictable

Every error from every Edge Function uses the **same shape**:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Cart is empty",
    "details": {}
  }
}
```

This means the frontend always knows what to look for. It doesn't have to guess whether errors will be in `err.message` or `err.data.reason` or somewhere else.

The `errors.ts` shared file defines all error codes. Functions throw errors like:
```typescript
throw { status: 400, code: 'VALIDATION_ERROR', message: 'Cart is empty' }
```
And the error handler catches it and wraps it in the standard shape.

---

## 11. File Storage: Three Buckets

Supabase Storage is configured with separate buckets for different file types. Each has its own security settings:

| Bucket | Contents | Who Can Access |
|---|---|---|
| `book-covers` | Cover images (JPG/WebP) | Public (anyone can view) |
| `book-pdfs` | Original PDF uploads | Admin only |
| `book-pages` | Rendered page images (WebP) | Library owners only |
| `book-illustrations` | Extracted inline illustrations | Library owners only |

The `upload-book` Edge Function handles the entire PDF processing pipeline:
1. Admin uploads a PDF via `/admin/upload`
2. PDF is written to `book-pdfs` bucket
3. Each page is rendered as a WebP image (with fonts and layout preserved)
4. Page images are stored in `book-pages` bucket
5. Inline illustrations are extracted and stored in `book-illustrations`
6. All image URLs, page text (for search), and metadata are saved to `book_pages` and `book_illustrations` tables

---

## 12. External Services: Stripe and GoHighLevel

### Stripe — Payments
Stripe handles all money. The app never stores credit card numbers. Instead:
- The frontend uses Stripe.js (with the publishable key `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`)
- The backend uses the secret key to create PaymentIntents and manage subscriptions
- Stripe sends **webhook events** to the `stripe-webhook` function to confirm when payments succeed or fail
- The webhook is verified using a `STRIPE_WEBHOOK_SECRET` to ensure it's actually from Stripe

**Events handled:**
- `payment_intent.succeeded` → Fulfill order or activate subscription
- `payment_intent.payment_failed` → Trigger payment failure email
- `customer.subscription.updated` → Sync subscription status
- `customer.subscription.deleted` → Cancel subscription + trigger cancellation email
- `invoice.payment_failed` → Trigger payment failure email for recurring billing

### GoHighLevel (GHL) — Emails
Kane's Komet does **not** send emails directly. All outbound communication goes through GoHighLevel:

- **Order confirmation** → `ORDER_CONFIRMED` tag applied → GHL automation sends the email
- **Welcome email** → `WELCOME_PREMIUM` tag → GHL sends premium welcome
- **Payment failure** → `PAYMENT_FAILED` tag → GHL sends retry instructions
- **Cancellation** → `SUBSCRIPTION_CANCELLED` tag → GHL sends farewell email
- **Event reminders** → GHL handles these via automation

The GHL client (in `_shared/ghl-client.ts`) handles:
- Looking up contacts by email
- Creating new contacts
- Resolving duplicate conflicts (a common GHL API edge case — handled with merge logic)
- Updating contact fields and applying tags

---

## 13. Environment Variables

### Frontend (Next.js / Vercel)

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Safe-to-expose browser key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side admin key (bypasses RLS) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe frontend key |
| `NEXT_PUBLIC_SHIPPING_RATE` | $5.99 flat shipping rate |
| `NEXT_PUBLIC_TAX_RATE` | 0.05 (5% GST) |
| `INTERNAL_API_SECRET` | Shared secret for internal API route protection |

### Edge Functions (Supabase Dashboard Secrets)

| Variable | Purpose |
|---|---|
| `SUPABASE_URL` | Supabase instance URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin-level database access |
| `STRIPE_SECRET_KEY` | Stripe payment operations |
| `STRIPE_WEBHOOK_SECRET` | Validates incoming Stripe webhook events |
| `STRIPE_PREMIUM_RECURRING_PRICE_ID` | Stripe Price ID for $3.99/month plan |
| `GHL_API_KEY` | GoHighLevel API access |
| `GHL_LOCATION_ID` | GHL sub-account location |
| `INTERNAL_API_SECRET` | Must match the frontend value |

---

## 14. The Reader: How It Works

The `app/read/[id]/page.tsx` is the most complex frontend component. Here's what it loads on startup:

1. **Book metadata** — title, author, illustrator
2. **All pages** — fetched from `book_pages` (page number + image URL)
3. **All illustrations** — fetched from `book_illustrations` (for inline display)
4. **Reading progress** — last page read (from `reading_progress` table) — auto-resumes
5. **Bookmarks** — user's bookmarks for this book
6. **Highlights** — user's highlights for this book
7. **Reading settings** — current zoom/theme

When the user reads:
- Page navigation updates `current_page` and `progress_percent` in the database
- Progress is **debounced** (waits 5 seconds of no change before saving)
- New highlights/bookmarks are inserted immediately
- Settings changes (zoom, theme) are saved immediately

---

## 15. Admin Panel: `/admin`

The admin panel is a full management interface at `/admin`. Routes include:

| Path | Function |
|---|---|
| `/admin` | Dashboard (overview stats) |
| `/admin/books` | Book catalog management (add, edit, delete, upload) |
| `/admin/upload` | PDF upload pipeline (triggers `upload-book` Edge Function) |
| `/admin/users` | User management (view, ban, role changes) |
| `/admin/book-club` | Book Club selections management |
| `/admin/discussions` | Discussion topic management |
| `/admin/events` | Event management |

Access is server-side protected: the Supabase middleware in `lib/supabase/middleware.ts` checks `role = 'admin'` and redirects unauthorized users before the page loads.

---

## 16. What's Intentionally Excluded

These features **do not exist** and are not planned:

- ❌ No Google/Apple/Social login
- ❌ No user ratings or reviews
- ❌ No wishlists
- ❌ No audiobooks
- ❌ No refunds (all sales final)
- ❌ No membership pause (cancel only)
- ❌ No in-app notifications
- ❌ No analytics dashboard
- ❌ No data export
- ❌ No calendar invites for events
- ❌ No dedicated "series" page
- ❌ No gamification / reading streaks

---

## 17. Scalability: Built to Grow

| Design | Why It Matters |
|---|---|
| **Page images** | The reader loads one WebP image per page rather than a full book — fast even on slow connections |
| **Debounced progress saves** | The frontend waits 5 seconds before writing progress — prevents database overload on fast page-flipping |
| **Denormalized counters** | Post counts, vote totals, attendee counts are pre-computed and updated by triggers, not recalculated on every request |
| **Partial index on `is_book_club_eligible`** | The book club signup modal only needs to query a tiny subset of books — the index makes this instant |
| **Vercel + Supabase Edge** | Both run on global CDN infrastructure — the app is geographically close to users worldwide |
| **Cascade deletions** | Admin can safely delete books without manual cleanup — the database handles it atomically |

---

*Last updated: February 2026 — reflects live deployed codebase*
