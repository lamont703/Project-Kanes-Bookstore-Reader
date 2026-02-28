# Phase 1: Frontend Audit — Plain English (As-Built)

> This document describes the **actual, implemented frontend** of Kane's Komet Book Reader — every page, feature, and behavior as it exists in the live codebase today.

---

## 1. What Is Kane's Komet?

Kane's Komet is a **digital bookstore + members-only book club**. Users can:
- Browse and buy books in multiple formats (digital, physical, Komet Card)
- Read their purchased books in the in-app reader
- Join the Book Club for premium access and exclusive perks
- Participate in community discussions (premium only)

The frontend is built with **Next.js (App Router)**, **React**, **TypeScript**, and **TailwindCSS**. It runs on **Vercel** and connects to a **Supabase** backend.

---

## 2. The Pages: A Complete Map

### Public Pages (No Login Required)

| Page | URL | What It Shows |
|---|---|---|
| **Landing / Home** | `/` | Hero section, feature highlights, call to action |
| **Browse Books** | `/browse` | Full book catalog with search and genre filters |
| **Book Detail** | `/book/[id]` | Book info, formats, pricing, add-to-cart |
| **Shopping Cart** | `/cart` | Cart contents, format badges, remove items |
| **Book Club** | `/book-club` | Premium access info, current selection, events |
| **Login** | `/login` | Email/password login and signup |

### Protected Pages (Login Required)

| Page | URL | What It Shows |
|---|---|---|
| **Checkout** | `/checkout` | Shipping (if physical), dealer code, Stripe payment |
| **Dashboard** | `/dashboard` | Library, subscriptions, order history |
| **Book Reader** | `/read/[id]` | In-app book reader (page images) |

### Admin Pages (Admin Role Required)

| Page | URL | What It Does |
|---|---|---|
| **Admin Overview** | `/admin` | Stats, quick links |
| **Books Catalog** | `/admin/books` | View, search, edit, delete books |
| **Upload Book** | `/admin/upload` | PDF upload pipeline |
| **Book Club Mgmt** | `/admin/book-club` | Manage monthly selections |
| **User Management** | `/admin/users` | View users, ban, change roles |
| **Discussion Topics** | `/admin/discussions` | Create and manage discussion topics |
| **Events** | `/admin/events` | Create and manage book club events |

---

## 3. The Header: Always Present

The `SiteHeader` component appears on **every page**. It's smart — it shows different content depending on who you are:

| Situation | What the Header Shows |
|---|---|
| **Guest (not logged in)** | Logo, nav links, cart icon, Login button |
| **Free reader** | Logo, nav links, cart icon with count (bounces when item added), Dashboard link, Logout |
| **Premium member** | Same as above, with visual indicator of premium status |
| **Admin** | Same as above, plus Admin Panel link |

**Cart badge animation**: When an item is added to the cart, the cart icon bounces to give visual feedback. This is handled by comparing the previous and current cart count via a React `useRef`.

---

## 4. The Bookstore: Browse, Choose, Buy

### Browse Page (`/browse`)

**What it does:**
- Shows all published books as cards in a grid
- Search bar filters by title/author in real-time
- Genre dropdown filters (Crime, Children, PTP, Spiritual, Adult, Sports, Self-Help, Cooking)
- Sort options: A-Z, Z-A, by price
- Each card shows: cover image, title, author, genre badge, series label (if applicable), format badges, and an "Add to Cart" button

**Add to Cart button behavior:**
- Clicking shows a quick format selector (ebook, paper book, Komet Card) if multiple formats exist
- After selecting format and clicking again, the button temporarily changes to a checkmark/success state to confirm
- Cart count in header updates instantly

**No login required** to browse or add to cart. Login is only required at checkout.

### Book Detail Page (`/book/[id]`)

**What it shows:**
- Book cover image
- Title, author, illustrator (if one exists), genre, series info
- Description
- Purchase options for each available format (ebook, paper book, Komet Card)
- Each format shows its price and a dedicated "Add to Cart" button
- Out-of-stock formats show an "Out of Stock" label instead of a button

**What's NOT shown:**
- No page count, published year, or ISBN (removed)
- No user ratings or reviews (removed entirely)
- No "Quick Stats" section

### Shopping Cart (`/cart`)

**What it shows:**
- Each cart item: book cover, title, format badge, quantity controls, price, remove button
- Order summary: subtotal, shipping note
- "Checkout" button → redirects to `/login?redirect=/checkout` if not logged in, otherwise to `/checkout`

**Cart persistence:**
- Cart state is stored in browser memory via React Context + `localStorage`
- Works for guests (no account needed to add items)
- Guest carts are not automatically merged with account carts on login (future consideration)

---

## 5. The Checkout Flow

**URL**: `/checkout`  
**Required**: Must be logged in  
**Redirects**: Non-authenticated users are sent to `/login?redirect=/checkout&message=purchase`

### The Four-Step Visual Flow

**Step 1: Shipping (if physical items)**  
If any cart item is NOT an ebook, a shipping form appears with:
- First name, Last name (required)
- Street address (min 5 chars)
- City, Zip (5-digit or 9-digit US format), Country
- Real-time field validation with error highlighting
- If ebook only → shipping form is hidden, replaced with "Digital Delivery" card

**Step 2: Dealer Code**
- Input field for optional dealer code
- "Apply" button (or press Enter) → calls `/api/validate-dealer-code`
- Success: shows code, discount %, and dollar amount saved in green
- Applied code locked to the session (can be removed with "Remove" button)
- The backend prevents self-use of your own code

**Step 3: Order Summary (sticky sidebar)**
- Lists all items with cover image, title, format badge, price
- Shows: Subtotal, Dealer Discount (if applied), Shipping ($5.99 or "Free (Digital)"), GST (5%), Total

**Step 4: Payment**
- "Continue to Payment" button → calls Edge Function `process-checkout`
- On success: Stripe `<Elements>` component loads the embedded Stripe payment form (night theme, Komet red primary color)
- User enters card details in the Stripe form
- On payment success: cart is cleared, confirmation screen appears
- Confirmation shows order number (first 8 chars of order ID, uppercased)

**Free orders** (100% dealer discount): Order is processed without showing Stripe form. Confirmation appears directly.

---

## 6. The Dashboard: Your Personal Space

**URL**: `/dashboard`  
**Required**: Must be logged in

Implemented in the `DashboardContent` component. Sections include:

### Your Library
- All books in the user's library (purchased, subscription freebies, gifts, monthly picks)
- Each book shows: cover, title, author, format source badge, "Read Now" button → `/read/[id]`
- If library is empty: prompt to browse the store

### Subscription Status
- Shows current plan (Free or Premium)
- If premium: shows subscription status (Active, Cancelled, Past Due)
- If active: shows "Cancel Subscription" button → calls `cancel-subscription` Edge Function
- If cancelled: shows "Reactivate" button → calls `reactivate-subscription` Edge Function
- If free: shows "Join the Book Club" button → opens subscription modal

### Order History
- List of all past orders with date, total, status badge
- Expandable to show individual items per order

### Dealer Code (Premium only)
- Shows the user's unique dealer code (formatted `KANE-NAME-####`)
- One-click copy to clipboard
- Sharing instructions

### Account Details
- Display name, email
- Subscription details

---

## 7. The Subscription Modal

**Triggered by**: "Join the Book Club" button anywhere on the site  
**Component**: `SubscriptionModal`

A multi-step modal flow:

| Step | Name | What Happens |
|---|---|---|
| 1 | **What You Get** | Overview of premium perks |
| 2 | **Book Club Details** | Terms, pricing ($49.99 + $3.99/mo) |
| 3 | **Choose Books** | Select 2 books from up to 5 eligible books (`is_book_club_eligible = true`). Adult books hidden for under-18 users. |
| 4 | **Your Info** | Full name, phone, mailing address, T-shirt size |
| 5 | **Payment** | Stripe embedded form (calls `create-subscription` Edge Function) |
| 6 | **Success** | Confirmation, dealer code shown, redirect to dashboard |

**Validation:**
- Step 3: Must select exactly 2 books (min 2, max 2)
- Step 4: All fields required
- Step 5: Stripe handles card validation

---

## 8. The Book Reader: Reading Experience

**URL**: `/read/[id]`  
**Required**: Must be logged in + book must be in library (enforced by RLS on book_pages)

### What the Reader Does

- **Page navigation**: Previous / Next buttons to navigate through rendered page images
- **"Page X of Y" display**: Shows current position in the book
- **Auto-resume**: On first load, jumps to last read page (from `reading_progress` table)
- **Progress saved**: Every page change saves progress to the database (debounced 5 seconds)
- **Highlights panel**: Sidebar shows existing highlights; can add new ones in 4 colors (yellow, green, blue, pink); optional note per highlight
- **Bookmarks panel**: Sidebar shows existing bookmarks; can bookmark the current page with an optional label
- **Settings panel**: Theme (Dark/Light/Sepia) and Zoom (75%/100%/125%/150%) controls
- **Two-panel layout**: Main reading area + collapsible sidebar (highlights, bookmarks, settings)

### Key Technical Behaviors

- Pages load as rendered WebP images (exact PDF visual fidelity preserved)
- The reader component (`app/read/[id]/page.tsx`) is a "client component" (`"use client"`)
- Reading settings that don't map to the page-image reader (font size, font family) are stored in `localStorage` via `lib/reading-storage.ts` — they are **not** persisted to the server-side `reading_settings` table. The server persists only zoom and theme.
- Highlights are capped at 10 per book. New highlight attempts beyond 10 show an error toast.
- Bookmarks are capped at 10 per book.

---

## 9. The Book Club Page

**URL**: `/book-club`  
**Required**: Public page (no login needed to view)

**What it shows:**
- "Kane's Komet Book Club" hero section with "Premium Access" framing
- Current monthly book selection (publicly visible)
- Upcoming selections (if any)
- Book club events (public events visible to everyone; premium events visible only to premium + admin)
- RSVP buttons (login required to RSVP)

**Premium upsell:**
- Non-premium users see a "Join the Book Club" CTA that opens the subscription modal

**Discussion rooms section:**
- Displays the discussion forum rooms (categories)
- Locked card + "premium members only" message for non-premium users
- Responsive layout — mobile-optimized with correct stacking behavior

---

## 10. The Admin Panel

**URL**: `/admin/*`  
**Required**: Must be logged in with `role = 'admin'`

**Layout**: Admin sidebar navigation + content area

### Admin Sidebar Navigation
Links to: Dashboard, Books, Upload, Book Club, Users, Discussions, Events

### Book Catalog (`/admin/books`)
- Search bar, status filter (Draft/Published), pagination
- Table of all books with title, author, genre, status, variants, created date
- Edit button → opens edit modal/form
- Delete button → soft-delete (marks `deleted_at`)
- **Book Club Eligibility checkbox** on each book edit: sets `is_book_club_eligible = true/false`

### Upload Book (`/admin/upload`)
- Upload cover image + PDF file
- Fields: title, author, illustrator (optional), genre, series info, age restriction toggle, price per format (ebook required; paper book + Komet Card optional)
- Submits to `upload-book` Edge Function
- Progress indicator during PDF processing

### User Management (`/admin/users`)
- Table of all users: name, email, role, subscription status, join date
- Ban/unban toggle
- Role change (reader ↔ admin)

### Book Club Management (`/admin/book-club`)
- Data fetched from Supabase in real time
- Create new monthly selection: choose book, set month/year/theme/status
- Delete existing selections
- All data via Next.js API route `/api/admin/`

### Discussion Topics (`/admin/discussions`)
- Create discussion topics with title, description, category (General/Book Club/News/genre), optional book link
- Pin/feature flags
- Delete topics (soft delete)

### Events (`/admin/events`)
- Create, edit events: title, date, time, location, type (virtual/in-person), cover image, public/private toggle
- Manage status (upcoming/past/cancelled)

---

## 11. Login & Auth

**URL**: `/login`  
**Flow**: Email + password only. No social login.

- Supabase Auth handles authentication
- On successful login: session cookie set, redirect to original destination (or `/dashboard`)
- Registration on the same page (toggle between Login/Register forms)
- On registration: Supabase creates the auth user → DB trigger auto-creates `public.users` profile → `ghl-sync` is called to create the GHL contact

---

## 12. State Management

| State Type | Where It Lives | Mechanism |
|---|---|---|
| Cart | Client-side | React Context (`cart-context`) + `localStorage` |
| Auth state | Client-side | React Context (`auth-context`) — wraps Supabase session |
| Reading progress | Server | `reading_progress` table — synced on page change |
| Reading settings (zoom, theme) | Server | `reading_settings` table |
| Reading settings (font, etc.) | Client only | `localStorage` via `lib/reading-storage.ts` |
| Admin data | Server | Fetched via Next.js API routes (service-role client) |

---

## 13. Identified Issues & Known Limitations

| Issue | Notes |
|---|---|
| **Komet Card doesn't grant digital access yet** | The `stripe-webhook` only grants `user_library` access for `format === 'ebook'`. Komet Card webhook grant is a known TODO. |
| **Guest cart not merged on login** | If a guest adds items and then logs in, their cart items are not merged with any server-side guest session. |
| **Font/line-height reader settings** | The `ReadingSettingsPanel` component shows font size, family, line height controls — but these don't apply to the page-image reader and are only stored in `localStorage`, not synced to server. |
| **No loading skeletons on admin tables** | Admin pages fetch data on mount without skeleton UI for loading states. |

---

## 14. Tech & Tools Used

| Tool | Purpose |
|---|---|
| **Next.js 14 (App Router)** | Frontend framework + SSR |
| **React 18** | Component model |
| **TypeScript** | Type safety |
| **TailwindCSS** | Utility-first styling |
| **Supabase JS SDK** | Auth + realtime database queries |
| **Stripe.js + @stripe/react-stripe-js** | Embedded payment form |
| **Lucide React** | Icon library |
| **Sonner** | Toast notifications |
| **shadcn/ui (radix primitives)** | UI component library |
| **Zod** | Schema validation on forms |

---

*Last updated: February 2026 — reflects live deployed codebase*
