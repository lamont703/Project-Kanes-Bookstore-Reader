# Phase 1: Frontend Audit — Technical Reference (As-Built)

> **Status**: Implemented and deployed  
> **Framework**: Next.js 14 (App Router) on Vercel  
> **Language**: TypeScript  
> **Styling**: TailwindCSS  
> **Last Updated**: February 2026  

---

## Table of Contents

1. [Application Architecture](#1-application-architecture)
2. [Directory Structure](#2-directory-structure)
3. [Route Map](#3-route-map)
4. [Component Inventory](#4-component-inventory)
5. [Data Models (TypeScript)](#5-data-models-typescript)
6. [State Management](#6-state-management)
7. [Authentication & Authorization](#7-authentication--authorization)
8. [Supabase Client Configurations](#8-supabase-client-configurations)
9. [Checkout Flow Implementation](#9-checkout-flow-implementation)
10. [Reader Implementation](#10-reader-implementation)
11. [Forms & Validation](#11-forms--validation)
12. [API Communication Patterns](#12-api-communication-patterns)
13. [Known Gaps & Technical Debt](#13-known-gaps--technical-debt)

---

## 1. Application Architecture

```
Client ─────────────────────────────────────────────► Vercel CDN
  │                                                      │
  │  Next.js App Router (SSR / CSR hybrid)               │
  │  ┌───────────────────────────────────────────────┐   │
  │  │  Page components (server or 'use client')      │   │
  │  │  ├── React Context (auth, cart)               │   │
  │  │  ├── Supabase SDK (realtime queries)          │   │
  │  │  └── Stripe.js (card input iframe)            │   │
  │  └───────────────────────────────────────────────┘   │
  │                                                      │
  ├──────────────────────────────────────────────────────►
  │  Next.js API Routes (app/api/)
  │  ├── POST /api/checkout           → proxies to Supabase Edge Function
  │  ├── POST /api/subscribe          → proxies to Supabase Edge Function
  │  ├── POST /api/validate-dealer-code
  │  └── GET  /api/admin/*            → admin data (service-role client)
  │
  └──────────────────────────────────────────────────────►
     Supabase (kpafjhkrjipiyfjizyaw.supabase.co)
     ├── Auth (JWT sessions via cookies)
     ├── PostgreSQL + RLS
     ├── Storage (book assets)
     └── Edge Functions (Deno runtime)
```

---

## 2. Directory Structure

```
app/
├── admin/
│   ├── book-club/page.tsx         # Book Club selections management
│   ├── books/
│   │   ├── page.tsx               # Book catalog list + search + delete
│   │   └── [id]/page.tsx          # Edit specific book
│   ├── discussions/page.tsx        # Discussion topic management
│   ├── events/page.tsx            # Event management
│   ├── layout.tsx                 # Admin sidebar layout
│   ├── page.tsx                   # Admin dashboard (stats)
│   ├── upload/page.tsx            # PDF upload + book creation
│   └── users/
│       ├── page.tsx               # User list
│       └── [id]/page.tsx          # User profile + ban
├── api/
│   ├── admin/
│   │   └── [...route]/route.ts    # Admin data API endpoints
│   ├── checkout/route.ts          # Proxies to process-checkout Edge Function
│   ├── subscribe/route.ts         # Proxies to create-subscription Edge Function
│   └── validate-dealer-code/route.ts
├── book/[id]/page.tsx             # Book detail page
├── book-club/
│   └── page.tsx                   # Book Club public page
│   (+ subdirectory pages)
├── browse/page.tsx                # Book catalog browse
├── cart/page.tsx                  # Shopping cart
├── checkout/page.tsx              # Full Stripe checkout
├── dashboard/page.tsx             # User dashboard
├── login/page.tsx                 # Auth page
├── read/[id]/page.tsx             # Book reader
├── globals.css                    # Global styles
├── layout.tsx                     # Root layout + Providers
└── page.tsx                       # Landing page

components/
├── ui/                            # Primitive components (button, input, card, etc.)
├── add-to-cart-button.tsx         # Format selector + cart add with success state
├── admin-sidebar.tsx              # Admin navigation sidebar
├── book-card.tsx                  # Browse page book card
├── book-club-content.tsx          # Book club page content (selections + events + discussions)
├── book-club-selection-card.tsx   # Book club selection display card
├── book-purchase-section.tsx      # Book detail page purchase buttons by format
├── checkout/
│   └── stripe-checkout-form.tsx   # Stripe Elements wrapper for card input
├── dashboard-content.tsx          # Full dashboard UI (library, subscription, orders, dealer code)
├── library-book-card.tsx          # Library book card with "Read Now" button
├── providers.tsx                  # Root-level React context providers
├── reading-settings-panel.tsx     # Reader settings UI (zoom, theme + localStorage settings)
├── reading-sidebar.tsx             # Reader sidebar (highlights, bookmarks tabs)
├── site-header.tsx                # Global header (nav, cart, auth state)
├── stat-card.tsx                  # Admin dashboard stat card
├── subscription-modal.tsx         # 6-step Book Club signup modal
├── theme-provider.tsx             # Dark/light theme provider (next-themes)
└── admin/
    └── ...                        # Admin-specific UI components

lib/
├── supabase/
│   ├── client.ts                  # Browser Supabase client (createBrowserClient)
│   ├── server.ts                  # SSR Supabase client (createServerClient, cookies)
│   ├── admin.ts                   # Service-role client for API routes
│   ├── middleware.ts              # Route protection + session refresh
│   ├── types.ts                   # Hand-maintained DB type definitions
│   └── database.types.ts         # Supabase CLI-generated types (placeholder)
├── book/
│   └── ...                        # Book utility functions
├── types/
│   ├── book.ts                    # Book & BookVariant TypeScript interfaces + GENRES constant
│   └── ...
├── reading-storage.ts             # localStorage utilities for reader state
├── book-club-utils.ts             # Book club helper functions
└── utils.ts                       # General utilities (cn, etc.)

context/
├── auth-context.tsx               # Auth state (user, session, isAdmin, isPremium, signOut)
└── cart-context.tsx               # Cart state (items, addItem, removeItem, cartCount)
```

---

## 3. Route Map

### Public Routes
| Route | Rendered | Auth | Description |
|---|---|---|---|
| `/` | Client | None | Landing page |
| `/browse` | Client | None | Book catalog with live Supabase query |
| `/book/[id]` | Client | None | Book detail |
| `/cart` | Client | None | Shopping cart (localStorage) |
| `/book-club` | Mixed | None | Book club page |
| `/login` | Client | None | Auth |

### Protected Routes (Middleware)
| Route | Auth Requirement |
|---|---|
| `/checkout` | Authenticated |
| `/dashboard` | Authenticated |
| `/read/[id]` | Authenticated + book in library (RLS) |

### Admin Routes (Middleware)
| Route | Auth Requirement |
|---|---|
| `/admin/*` | Authenticated + `role = 'admin'` |

### API Routes
| Route | Method | Handler |
|---|---|---|
| `/api/checkout` | POST | Proxies to `process-checkout` Edge Function |
| `/api/subscribe` | POST | Proxies to `create-subscription` Edge Function |
| `/api/validate-dealer-code` | POST | Validates dealer code via admin Supabase client |
| `/api/admin/*` | GET/POST/PUT/DELETE | Admin CRUD via service-role client |

---

## 4. Component Inventory

### Global Components

**`SiteHeader`** (`components/site-header.tsx`)
- Client component (`"use client"`)
- Reads `useAuth()` and `useCart()` contexts
- Responsive: desktop nav + mobile hamburger menu
- Cart count badge with bounce animation on increment
- Login/Dashboard toggle based on auth state
- Admin Panel link shown if `isAdmin === true`

**`ThemeProvider`** (`components/theme-provider.tsx`)
- Wraps `next-themes` provider

**`providers.tsx`**
- Root-level composition: `ThemeProvider` → `CartProvider` → `AuthProvider`

---

### Checkout Components

**`StripeCheckoutForm`** (`components/checkout/stripe-checkout-form.tsx`)
- Must be wrapped in `<Elements stripe={stripePromise} options={{ clientSecret }}>` (Stripe.js provider)
- Renders Stripe's `PaymentElement`
- On `handleSubmit`: calls `stripe.confirmPayment()` → waits for Stripe confirmation
- On success callback: calls parent's `onSuccess()` → clears cart, shows order confirmation

---

### Reader Components

**`ReadingSettingsPanel`** (`components/reading-settings-panel.tsx`)
- Zoom options: 75%, 100%, 125%, 150% → persisted to `reading_settings` table
- Theme options: Dark, Light, Sepia → persisted to `reading_settings` table
- Font size, font family, line height controls visible in UI but stored in `localStorage` only (not server-synced — not applicable to page-image reader)

**`ReadingSidebar`** (`components/reading-sidebar.tsx`)
- Tab-based: Highlights / Bookmarks
- Highlights list: color indicator, text preview, note preview, delete action
- Bookmarks list: page number, label, delete action

---

### Dashboard Component

**`DashboardContent`** (`components/dashboard-content.tsx`)
- Sections: Library, Subscription Status, Order History, Dealer Code (premium only), Account Details
- Subscription cancel → `supabase.functions.invoke('cancel-subscription', ...)`
- Subscription reactivate → `supabase.functions.invoke('reactivate-subscription', ...)`
- All data fetched from Supabase on mount

---

### Subscription Modal

**`SubscriptionModal`** (`components/subscription-modal.tsx`)
- 6 steps: Perks → Details → Choose Books → Your Info → Payment → Success
- Step 3: Fetches `books WHERE is_book_club_eligible = true AND status = 'published'` (max 5 shown)
- Step 3: Age-gate: if user `date_of_birth` is under 18, `is_age_restricted = true` books filtered out
- Step 3: Selection count validation — must choose exactly 2
- Step 5: Calls `create-subscription` Edge Function → receives `clientSecret` → renders `<Elements>` + `<StripeCheckoutForm />`

---

## 5. Data Models (TypeScript)

### `lib/types/book.ts`

```typescript
export interface BookVariant {
    id: string
    format: 'ebook' | 'paper_book' | 'komet_card'
    price: number
    available: boolean
}

export interface Book {
    id: string
    title: string
    author: string
    illustrator?: string | null
    coverImage: string
    genre: string
    description: string
    price: number          // Ebook price (used as default display price)
    variants: BookVariant[]
    seriesName?: string | null
    seriesOrder?: number | null
    // Removed: pageCount, publishedYear, isbn, rating
}

export const GENRES = [
    'All', 'Crime', 'Children', 'PTP', 'Spiritual',
    'Adult', 'Sports', 'Self-Help', 'Cooking'
]
```

### `lib/supabase/types.ts` — DB Type Definitions

Matches the actual Supabase schema. Key types:

```typescript
Database.public.Tables.books.Row = {
    id: string
    title: string
    author: string
    illustrator: string | null
    description: string | null
    genre: string | null
    cover_image_url: string | null
    series_name: string | null
    series_order: number | null
    status: 'draft' | 'published'
    created_at: string
    updated_at: string
    // Note: is_age_restricted and is_book_club_eligible present in DB schema
    // but not yet fully reflected in types.ts — update needed
}

Database.public.Tables.book_variants.Row = {
    id: string
    book_id: string
    format: 'ebook' | 'paper_book' | 'komet_card'
    price: number
    is_in_stock: boolean
    stock_count: number | null
    created_at: string
}

Database.public.Tables.reading_settings.Row = {
    id: string
    user_id: string
    zoom: number          // 75 | 100 | 125 | 150
    theme: 'dark' | 'light' | 'sepia'
    updated_at: string
}

Database.public.Enums = {
    user_role_enum: 'reader' | 'admin'
    tshirt_size_enum: 'xs' | 's' | 'm' | 'l' | 'xl' | 'xxl' | 'xxxl'
    subscription_plan_enum: 'free' | 'premium'
    subscription_status_enum: 'active' | 'cancelled' | 'expired' | 'past_due'
    genre_enum: 'Crime' | 'Children' | 'PTP' | 'Spiritual' | 'Adult' | 'Sports' | 'Self-Help' | 'Cooking'
    book_status_enum: 'draft' | 'published'
    book_format_enum: 'ebook' | 'paper_book' | 'komet_card'
    order_status_enum: 'pending' | 'confirmed' | 'fulfilled'
    library_source_enum: 'purchase' | 'subscription_signup' | 'book_club_monthly' | 'admin_gift'
    highlight_color_enum: 'yellow' | 'green' | 'blue' | 'pink'
    reading_theme_enum: 'dark' | 'light' | 'sepia'
}
```

### Cart Context Types

```typescript
// Internal cart item shape (context/cart-context.tsx)
interface CartItem {
    id: string           // book_id
    variantId: string    // book_variants.id
    title: string
    author: string
    coverImage: string
    format: 'ebook' | 'paper_book' | 'komet_card'
    price: number
    quantity: number
}
```

---

## 6. State Management

### Auth Context (`context/auth-context.tsx`)

```typescript
interface AuthContextValue {
    user: User | null           // Supabase auth user
    session: Session | null
    isAdmin: boolean            // role === 'admin' from public.users
    isPremium: boolean          // subscription.plan === 'premium' && status === 'active'
    signOut: () => Promise<void>
}
```

- Initialized by reading the Supabase session on mount
- Subscribes to `supabase.auth.onAuthStateChange` for real-time updates
- `isAdmin` and `isPremium` fetched from `public.users` and `user_subscriptions` tables on auth state change

### Cart Context (`context/cart-context.tsx`)

```typescript
interface CartContextValue {
    items: CartItem[]
    addItem: (item: Omit<CartItem, 'quantity'>) => void
    removeItem: (id: string, format: string) => void
    updateQuantity: (id: string, format: string, quantity: number) => void
    clearCart: () => void
    cartCount: number
}
```

- State persisted to `localStorage` under a session key
- `cartCount` = sum of all item quantities (used for header badge)
- On `addItem`: if same `(id, format)` exists → increment quantity; else insert new item

### Reading State (`lib/reading-storage.ts`)

Local storage utilities for reader preferences that don't map to the page-image reader (font settings, etc.):
```typescript
getReadingSettings(bookId: string): LocalReadingSettings
saveReadingSettings(bookId: string, settings: LocalReadingSettings): void
```

Server-synced reading state is handled directly via Supabase SDK in `app/read/[id]/page.tsx`.

---

## 7. Authentication & Authorization

### Login Flow

1. User submits email + password on `/login`
2. `supabase.auth.signInWithPassword()` called
3. Supabase returns session; cookies set by `@supabase/ssr`
4. `middleware.ts` refreshes session on every request
5. `auth-context` reads session → fetches user role + subscription

### Middleware Route Protection (`lib/supabase/middleware.ts`)

```typescript
// Protected routes (redirect to /login if no session)
const protectedRoutes = ['/dashboard', '/checkout', '/read']

// Admin routes (redirect to / if role !== 'admin')
const adminRoutes = ['/admin']
```

Process:
1. Create server-side Supabase client with cookie store
2. Call `supabase.auth.getSession()` — refreshes token if needed, writes cookie
3. For protected routes: redirect to `/login?redirect=<path>` if no session
4. For admin routes: additionally check `users.role = 'admin'`

### Checkout Auth Check (client-side)

```typescript
// app/checkout/page.tsx
const { data: { user } } = await supabase.auth.getUser()
if (!user) {
    router.push("/login?redirect=/checkout&message=purchase")
}
```

---

## 8. Supabase Client Configurations

### Browser Client (`lib/supabase/client.ts`)

```typescript
import { createBrowserClient } from '@supabase/ssr'
export const createClient = () => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```
Used in: all `"use client"` components and pages.

### Server Client (`lib/supabase/server.ts`)

```typescript
import { createServerClient } from '@supabase/ssr'
// Reads/writes Next.js cookie store
export const createClient = (cookieStore) => createServerClient(url, anonKey, { cookies })
```
Used in: middleware, Server Components, server actions.

### Admin Client (`lib/supabase/admin.ts`)

```typescript
import { createClient } from '@supabase/supabase-js'
export const createAdminClient = () => createClient(url, serviceRoleKey)
```
Used in: Next.js API Routes only. Never exposed to browser. Uses `SUPABASE_SERVICE_ROLE_KEY`.

---

## 9. Checkout Flow Implementation

### Step 1: Cart → Checkout page

```
CartItem[] (from context/localStorage)
  → renders order summary
  → requires login redirect if unauthenticated
  → shows shipping form only if any(item.format !== 'ebook')
```

### Step 2: Dealer Code Validation

```typescript
// POST /api/validate-dealer-code (Next.js API Route)
const res = await fetch('/api/validate-dealer-code', {
    method: 'POST',
    body: JSON.stringify({ code: dealerCode })
})
const { discountPercent } = await res.json()
```

- The API route checks `promo_codes WHERE code = input AND is_active = true`
- Uses service-role client to read the promo code
- **Self-use prevention** happens in `process-checkout` Edge Function, not here

### Step 3: Shipping + Total Calculation

```typescript
const hasPhysicalItems = items.some(item => item.format !== 'ebook')
const FLAT_SHIPPING_RATE = 5.99
const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
const gst = total * 0.05
const shipping = hasPhysicalItems ? FLAT_SHIPPING_RATE : 0
const discountAmount = dealerCodeApplied ? total * (dealerDiscount / 100) : 0
const finalTotal = total + gst + shipping - discountAmount
```

**Note**: Front-end total is for display only. Backend recalculates everything from real DB prices.

### Step 4: Call process-checkout Edge Function

```typescript
const { data, error } = await supabase.functions.invoke('process-checkout', {
    body: {
        items: items.map(item => ({
            bookId: item.id,
            variantId: item.variantId,
            format: item.format,
            quantity: item.quantity,
        })),
        promoCode: dealerCodeApplied ? dealerCode.trim().toUpperCase() : undefined,
        shippingAddress: hasPhysicalItems ? { firstName, lastName, address, city, zip, country } : undefined,
    }
})
```

- Uses `supabase.functions.invoke()` which automatically attaches the user's JWT

### Step 5: Stripe Payment

```typescript
// On data.isFree === false:
setClientSecret(data.clientSecret)
// React re-renders with:
<Elements stripe={stripePromise} options={{ clientSecret, appearance: {...} }}>
    <StripeCheckoutForm orderId={orderId} onSuccess={() => { setOrderComplete(true); clearCart() }} />
</Elements>

// In StripeCheckoutForm:
const result = await stripe.confirmPayment({
    elements,
    confirmParams: { return_url: window.location.origin + '/checkout/confirmation' }
})
```

### Step 6: Confirmation

```typescript
// On isFree order:
setOrderComplete(true); clearCart()

// On Stripe payment success callback:
setOrderComplete(true); clearCart()
```

Shows order number: `orderId.slice(0, 8).toUpperCase()`

---

## 10. Reader Implementation

**File**: `app/read/[id]/page.tsx`  
**Type**: Client Component (`"use client"`)

### Data Loading Sequence

```typescript
useEffect(() => {
    async function loadBook() {
        // 1. Fetch book metadata (title, author, illustrator)
        await supabase.from('books').select('*').eq('id', bookId).single()
        
        // 2. Fetch all pages (ordered)
        await supabase.from('book_pages')
            .select('page_number, page_image_url')
            .eq('book_id', bookId)
            .order('page_number')
        
        // 3. Fetch all illustrations
        await supabase.from('book_illustrations')
            .select('*')
            .eq('book_id', bookId)
        
        // 4. Fetch user's reading progress → setCurrentPage(progress.current_page)
        await supabase.from('reading_progress')
            .select('current_page, progress_percent')
            .eq('book_id', bookId)
            .eq('user_id', userId)
            .maybeSingle()
        
        // 5. Fetch bookmarks
        await supabase.from('bookmarks').select('*')
            .eq('user_id', userId).eq('book_id', bookId)
        
        // 6. Fetch highlights
        await supabase.from('highlights').select('*')
            .eq('user_id', userId).eq('book_id', bookId)
    }
    loadBook()
}, [bookId])
```

### Progress Saving (Debounced)

```typescript
const progressSaveRef = useRef<ReturnType<typeof setTimeout>>()

const saveProg = useCallback((page: number, total: number) => {
    clearTimeout(progressSaveRef.current)
    progressSaveRef.current = setTimeout(async () => {
        await supabase.from('reading_progress').upsert({
            user_id: userId,
            book_id: bookId,
            current_page: page,
            progress_percent: total > 0 ? (page / total) * 100 : 0
        }, { onConflict: 'user_id,book_id' })
    }, 5000)  // 5 second debounce
}, [supabase, userId, bookId])
```

### Highlight + Bookmark Caps

```typescript
// Before inserting a new highlight:
if (highlights.length >= 10) {
    toast.error("You've reached the maximum of 10 highlights for this book.")
    return
}
// Before inserting a new bookmark:
if (bookmarks.length >= 10) {
    toast.error("You've reached the maximum of 10 bookmarks for this book.")
    return
}
```

### Reading Settings Persistence

Server-persisted (zoom, theme):
```typescript
await supabase.from('reading_settings').upsert({ user_id, zoom, theme }, { onConflict: 'user_id' })
```

localStorage-only (not server-synced):
- Font size, font family, line height → stored via `lib/reading-storage.ts`
- These control UI preferences that do not affect the page-image renderer

---

## 11. Forms & Validation

### Checkout Shipping Form

```typescript
const validate = () => {
    const newErrors: Record<string, boolean> = {}
    if (hasPhysicalItems) {
        if (!formData.firstName) newErrors.firstName = true
        if (!formData.lastName) newErrors.lastName = true
        if (!formData.address || formData.address.length < 5) newErrors.address = true
        if (!formData.city) newErrors.city = true
        if (!/^\d{5}(-\d{4})?$/.test(formData.zip)) newErrors.zip = true
    }
    // Error fields highlighted with border-destructive class
}
```

### Subscription Modal (Step 4: Your Info)

All fields required. Validated before proceeding to payment step:
- `fullName` (non-empty)
- `phone` (non-empty)
- `mailingAddress` (non-empty)
- `tshirtSize` (selected from dropdown: xs–xxxl)

### Subscription Modal (Step 3: Book Selection)

```typescript
const canProceed = selectedBookIds.length === 2  // Exactly 2 required
```

### Browse Page Filters

```typescript
// Client-side filtering on the already-fetched book list
const filteredBooks = useMemo(() => books
    .filter(b => selectedGenre === 'All' || b.genre === selectedGenre)
    .filter(b => b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q))
    .sort(/* by sortBy */)
, [books, selectedGenre, searchQuery, sortBy])
```

Filter is purely client-side — all books are fetched on mount, then filtered in memory.

---

## 12. API Communication Patterns

### Edge Functions (preferred)

```typescript
// Via supabase.functions.invoke() — automatically passes JWT
const { data, error } = await supabase.functions.invoke('function-name', {
    body: { ... }
})
```

Used for: `process-checkout`, `cancel-subscription`, `reactivate-subscription`, `create-subscription`

### Next.js API Routes

```typescript
// Via fetch (for server-side operations needing service-role key)
const res = await fetch('/api/validate-dealer-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code })
})
```

Used for: dealer code validation, admin data operations

### Direct Supabase SDK

```typescript
// For read operations within RLS boundaries
const { data } = await supabase.from('books').select('*, book_variants(*)').eq('status', 'published')
```

Used for: browse, book detail, dashboard library, reading progress, highlights, bookmarks

---

## 13. Known Gaps & Technical Debt

| Gap | Details | Priority |
|---|---|---|
| **`types.ts` partial** | `lib/supabase/types.ts` is hand-maintained and missing `is_age_restricted`, `is_book_club_eligible`, full `users` columns, and several newer fields added via migrations | Medium |
| **Komet Card no digital access** | `stripe-webhook` only grants `user_library` for `format === 'ebook'`. Komet Card does not auto-grant. | High |
| **Guest cart not merged on login** | Cart items added as guest are not merged with the DB-side user cart on login. Users must re-add items. | Medium |
| **Reader `localStorage` settings** | Font size, family, line height are exposed in `ReadingSettingsPanel` but are irrelevant to the page-image reader. Should be hidden or removed from UI. | Low |
| **Browse page loads all books at once** | All published books are fetched on mount, then filtered client-side. No pagination or server-side filtering. Will not scale well for large catalogs. | Medium |
| **`supabase.functions.invoke` auth** | `cancel-subscription` was previously broken with `fetch()` (401 errors) because the JWT wasn't forwarded. Fixed by switching to `supabase.functions.invoke()`. Other functions should use the same pattern. | Low |
| **Admin loading states** | Admin table pages have `isLoading` state but no skeleton UI — blank screen during load. | Low |
| **`database.types.ts` placeholder** | `lib/supabase/database.types.ts` is a placeholder. The `types.ts` file is the working type file. Should be regenerated via Supabase CLI: `npx supabase gen types typescript --project-id kpafjhkrjipiyfjizyaw` | Low |
