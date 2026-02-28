# Phase 3: API Design — Plain English (As-Built)

> This document explains **how the API contract actually works** in the live Kane's Komet Book Reader. Every endpoint, rule, and integration described is real and deployed.

---

## 1. What Is an API?

An API is the **set of agreements** between the frontend (what you see on screen) and the backend (where data is stored). When you click "Buy Now," the frontend sends a message to the backend following a specific format. This document explains what messages are sent, what they contain, and what comes back.

In Kane's Komet, there are two types of APIs:

1. **Supabase Edge Functions** — server-side code that handles business operations (checkout, subscriptions, emails)
2. **Next.js API Routes** — lightweight server routes that act as a proxy or handle admin operations

---

## 2. The Foundation: How Requests Work

### The Four Actions
- **GET** — "Give me information" (loading your library, browsing books)
- **POST** — "Do something / create something" (placing an order, adding to cart)
- **PUT / PATCH** — "Change something" (updating a book, editing a setting)
- **DELETE** — "Remove something" (deleting a discussion post)

### Authentication
Most requests require you to be logged in. The app sends your login token (a **JWT** — a secure ticket) in the `Authorization` header of every request. The server checks this ticket before doing anything.

**Public requests** (no login needed): browsing books, viewing book club selections, seeing public events.

**Protected requests** (login required): checkout, library access, reading pages, subscriptions, discussions.

### Responses
Every response from our Edge Functions comes back in the same format:

**On success:**
```json
{
  "clientSecret": "pi_1234_secret_xyz",
  "orderId": "uuid-here"
}
```

**On error:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Cart is empty",
    "details": []
  }
}
```

This means the frontend always knows exactly where to look for data and errors, regardless of which endpoint was called.

---

## 3. Books: Browsing the Catalog

### How Books Are Fetched

The browse page queries Supabase **directly** from the browser using the safe public (anon) key. No Edge Function is needed because Row-Level Security handles access control automatically:

- **What you can see**: All books with `status = 'published'`
- **What drafts do**: Hidden — the database refuses to return them to non-admin users
- **What admins see**: All books (published + draft)
- **Age-restricted books**: The database returns them, but the frontend hides them unless the user is 18+

### Book Data Structure

Each book comes back with:
- `id`, `title`, `author`, `illustrator` (optional)
- `description`, `genre` (one of the fixed 8 genres)
- `cover_image_url` (Supabase Storage URL, publicly accessible)
- `series_name` + `series_order` (if part of a series)
- `status` (draft/published)
- `is_book_club_eligible` (true/false — controls subscription modal)
- `is_age_restricted` (true/false)
- **Nested `book_variants`**: each format (ebook, paper book, Komet Card) with price and in-stock status

### Searching and Filtering

All searching and filtering on the Browse page is **client-side** — all published books are loaded at once, then filtered in the browser:
- Search: matches title or author (case-insensitive)
- Genre filter: exact match
- Sort: A-Z, Z-A, price low-to-high, price high-to-low

Note: the database has a full-text search index ready for server-side search if the catalog grows large enough to need it.

---

## 4. Authentication: Login and Signup

Authentication is handled entirely by **Supabase Auth**. The frontend uses the Supabase SDK:

```
User types email + password → supabase.auth.signInWithPassword()
↓
Supabase returns a JWT session (stored in a cookie)
↓
Middleware reads cookie on every page load, refreshes if expired
↓
Frontend context (auth-context) knows: user, isAdmin, isPremium
```

**What happens on signup:**
1. `supabase.auth.signUp()` creates the auth user
2. A database **trigger** automatically creates the user's profile in `public.users`
3. The `ghl-sync` function is called to create a GoHighLevel contact for the new user

**No social login**: Email + password only.

**No password reset API doc needed**: Handled entirely by Supabase's built-in flow.

---

## 5. Shopping Cart

The cart is **not stored in the database** for logged-in users during browsing. It lives in the browser's `localStorage` and is managed entirely client-side via React Context.

This means:
- **Instant**: Adding/removing items is instant, no network request
- **Guest-friendly**: Anyone can add items before logging in
- **Not synced across devices**: If you add items on your phone and switch to your laptop, the cart is empty on the laptop

When you proceed to checkout, the items are sent to the `process-checkout` Edge Function, which validates them all against the real database.

---

## 6. Checkout: Placing an Order

**Endpoint**: Supabase Edge Function — `process-checkout`  
**Called via**: `supabase.functions.invoke('process-checkout', { body: ... })`  
**Auth**: Required

### What You Send

```json
{
    "items": [
        { "bookId": "uuid", "variantId": "uuid", "format": "ebook", "quantity": 1 }
    ],
    "promoCode": "KANE-SMITH-4821",
    "shippingAddress": {
        "firstName": "Jane",
        "lastName": "Doe",
        "address": "123 Main St",
        "city": "New York",
        "zip": "10001",
        "country": "United States"
    }
}
```

Notes:
- `promoCode` is optional
- `shippingAddress` is only required if any item is a physical format (paper book or Komet Card). For ebook-only orders, it's omitted entirely.

### What Comes Back

```json
{
    "clientSecret": "pi_abc123_secret_xyz789",
    "orderId": "uuid-of-created-order",
    "isFree": false
}
```

- `clientSecret`: Used by Stripe.js to show the payment form
- `orderId`: Used to show the order confirmation number
- `isFree`: If the total is $0 (e.g., 100% dealer code), skip Stripe entirely

### What the Backend Does

1. Validates each item against the real database (confirms prices and stock status)
2. Applies the dealer code if provided (checks it's valid, active, and not your own code)
3. Calculates: subtotal, 35% discount (if code), $5.99 flat shipping (if physical items), 5% GST
4. Creates or retrieves your Stripe Customer account
5. Creates a Stripe PaymentIntent for the calculated total
6. Saves the order and order items to the database
7. Returns the payment client secret to the frontend

### What Stripe Then Does (Webhook)

When Stripe confirms the payment:
- Order status → `confirmed`
- Ebook purchases → added to your library automatically
- Shipping address → saved to your profile
- Confirmation email → sent via GoHighLevel

---

## 7. Book Club Subscriptions

**Endpoint**: Supabase Edge Function — `create-subscription`  
**Called via**: `supabase.functions.invoke('create-subscription', { body: ... })`  
**Auth**: Required

### What You Send

```json
{
    "selectedBookIds": ["uuid-book-1", "uuid-book-2"],
    "tshirtSize": "m",
    "mailingAddress": "123 Cosmic Way, Star City, 10001",
    "fullName": "Jane Doe",
    "phone": "555-123-4567"
}
```

### What Comes Back

```json
{
    "clientSecret": "pi_abc123_secret_xyz789"
}
```

The frontend shows the Stripe payment form for the $49.99 first month fee.

### What Stripe Then Does (Webhook)

When Stripe confirms the $49.99 payment:
1. Your profile is updated: name, phone, T-shirt size, mailing address
2. A $3.99/month subscription is created in Stripe (starts after a 30-day free period)
3. Your Book Club subscription record is created in the database
4. Your 2 chosen books are added to your library (permanently)
5. Your dealer code is generated: `KANE-FIRSTNAME-PHONELAST4` (e.g., `KANE-JANE-4567`)
6. A welcome email is sent via GoHighLevel

### Cancel and Reactivate

| Action | What Happens |
|---|---|
| **Cancel** | Subscription set to cancel at the end of the current billing period. You keep access until then. |
| **Reactivate** | Cancellation reversed. Subscription resumes. Dealer code reactivated (same code). |
| **Re-subscribe** | Pay $49.99 again, choose 2 new books, get the same dealer code back. |

---

## 8. Library and Reading

### Your Library

Your library is a list of books you have access to read. Books enter it through:
- Buying an **ebook** at checkout
- Buying a **Komet Card** at checkout (grants digital access on webhook)
- Your **2 free books** chosen at subscription signup
- The **monthly Book Club pick** (added automatically each month for active premium members)
- **Admin gift** (an admin manually grants you a book)

The library is stored in the `user_library` table. The database ensures you can never have the same book twice (unique constraint).

The books in your library show up on your Dashboard. Each one has a "Read Now" button.

### Loading a Book to Read

When you open a book in the reader (`/read/[id]`), the app fetches:
- **Book metadata**: title, author, illustrator
- **All page images**: one by one, each page is a WebP image rendered from the original PDF
- **Illustrations**: inline artwork extracted from the PDF
- **Your reading progress**: so the reader can auto-jump to where you left off
- **Your highlights and bookmarks**: displayed in the sidebar

Access control is enforced by the database — if the book isn't in your library, the page images simply aren't returned.

### Saving Reading Progress

Progress is saved automatically as you read, but with a **5-second delay** before writing to the database. This prevents the database from being overloaded if you're quickly flipping pages. If you close the book within 5 seconds of turning a page, the last page may not be saved.

---

## 9. Community Discussions

Discussions are **premium members only**. The database enforces this — free users and guests literally cannot retrieve discussion topics or posts.

| Action | Who Can Do It |
|---|---|
| Read discussions | Premium members, admins |
| Create a topic | Admins only |
| Post a comment | Premium members (not banned) |
| Edit a comment | Author, within 15 minutes of posting |
| Delete a comment | Author (any time), admins (any time) |
| Vote (up/down) | Premium members (one vote per post) |

### Discussion Categories

Topics can be: `General`, `Book Club`, `News`, `Crime`, `Children`, `PTP`, `Spiritual`, `Adult`, `Sports`, `Self-Help`, `Cooking`

---

## 10. GoHighLevel: How Emails Work

The app **never sends emails directly**. Instead, it tells GoHighLevel (the email platform) to send the email by applying a "tag" to the user's GHL contact record. GHL automation workflows then send the appropriate templated email.

| Event | GHL Tag Applied | Email Sent |
|---|---|---|
| Order confirmed | `ORDER_CONFIRMED` | Order confirmation with details |
| New premium member | `WELCOME_PREMIUM` | Welcome + what to do next |
| Payment failed | `PAYMENT_FAILED` | Instructions to update payment method |
| Subscription cancelled | `SUBSCRIPTION_CANCELLED` | Farewell + account details |
| Event RSVP | Handled by GHL automation | Event reminder closer to the date |

All email triggers flow through the `email-ops` Edge Function. GHL contacts are created/updated by the `ghl-sync` Edge Function.

---

## 11. Admin Operations

Admins have additional API access through the `/api/admin/*` Next.js routes, all protected by the service-role key (which bypasses Row-Level Security):

| What Admins Can Do | How |
|---|---|
| Fetch all users | Next.js API route with service-role client |
| Ban / unban users | Next.js API route with service-role client |
| Change user roles | Next.js API route with service-role client |
| Create/edit/delete books | Direct Supabase SDK via admin panel |
| Upload a PDF | `upload-book` Edge Function |
| Manage book club selections | Next.js API route |
| Create/manage events | Direct Supabase SDK via admin panel |
| Create/delete discussion topics | Direct Supabase SDK via admin panel |
| Gift books to users | Direct database write via service-role client |

---

## 12. Dealer Code Validation at Checkout

**Endpoint**: `/api/validate-dealer-code` (Next.js API Route)  
**Method**: POST  
**Auth**: Not strictly required for validation (anyone can check), but self-use prevention requires auth at checkout time

### What You Send
```json
{ "code": "KANE-SMITH-4821" }
```

### What Comes Back (success)
```json
{ "discountPercent": 35, "message": "Dealer code applied! 35% off your order." }
```

### What Comes Back (error)
```json
{ "error": "Invalid or expired dealer code." }
```

The self-use prevention check ("you can't use your own code") is enforced in the `process-checkout` Edge Function when the order is actually submitted, not in this validation step.

---

## 13. Error Handling

All errors use the same format:

```json
{
  "error": {
    "code": "ERROR_CODE_HERE",
    "message": "Human readable message",
    "details": [{ "field": "zip", "issue": "Must be 5 digits" }]
  }
}
```

**Common error codes you might see:**

| Code | Meaning | HTTP Status |
|---|---|---|
| `VALIDATION_ERROR` | Something in the request was malformed or missing | 400 |
| `UNAUTHORIZED` | Not logged in, or invalid JWT | 401 |
| `FORBIDDEN` | Logged in, but don't have permission for this | 403 |
| `NOT_FOUND` | Resource doesn't exist | 404 |
| `CONFLICT` | Already exists (duplicate subscription, etc.) | 409 |
| `BUSINESS_RULE_VIOLATION` | Tried to use your own dealer code, etc. | 422 |
| `AMOUNT_TOO_SMALL` | Stripe requires minimum $0.50 | 400 |
| `INTERNAL_ERROR` | Something unexpected happened on our side | 500 |

---

## 14. Testing Tools Recommendation

For local development and testing of the Edge Functions:

| Tool | Use |
|---|---|
| **Bruno** | Manual API testing — import as a collection, test each function with real payloads. Free, offline-first, and stores tests as code in your repo. |
| **Stripe CLI** — `stripe listen --forward-to localhost` | Forward Stripe webhook events to your locally running Edge Function for end-to-end checkout testing |
| **Supabase Studio** | Inspect DB changes after API calls — verify records, check RLS, query live data |
| **OpenAPI** | Document endpoints for onboarding new developers — specs can be generated from our existing function types |

---

## 15. Production URL Reference

| Service | Base URL |
|---|---|
| **Frontend (Vercel)** | `https://kanes-komet.vercel.app` (example) |
| **Supabase Edge Functions** | `https://kpafjhkrjipiyfjizyaw.supabase.co/functions/v1/` |
| **Supabase REST API** | `https://kpafjhkrjipiyfjizyaw.supabase.co/rest/v1/` |
| **Supabase Auth** | `https://kpafjhkrjipiyfjizyaw.supabase.co/auth/v1/` |

---

*Last updated: February 2026 — reflects live deployed API*
