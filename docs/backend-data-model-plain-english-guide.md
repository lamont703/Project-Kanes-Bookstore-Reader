# Kane's Komet: The Data Model Explained in Plain English (As-Built)

> This guide reflects the **actual, implemented** database as it exists today in the Supabase project `kpafjhkrjipiyfjizyaw`. Every decision below has been confirmed against the live migration files.

---

## 1. Executive Summary: The "Big Picture"

Kane's Komet Book Reader is a **digital bookstore combined with a members-only book club**. The database has **20 core tables** spread across six areas:

| Area | What It Does |
|---|---|
| **The People** | Stores who's using the app — their name, email, and whether they're a free reader or a premium book club member. |
| **The Bookshelf** | Stores every book, with each page rendered as an image to preserve the original PDF layout, plus inline illustrations. |
| **The Store** | Handles shopping carts, orders, payments (via Stripe), and dealer discount codes. |
| **The Book Club** | Manages monthly book picks, community events, and RSVPs. |
| **The Community** | Powers the discussion forum where premium members can chat, reply, and vote on posts. |
| **The Reader** | Remembers exactly where you left off reading, your highlights, bookmarks, and display preferences — across all your devices. |

### What's Been Built

The backend is **fully operational**. All data lives in a real Supabase (PostgreSQL) database at `kpafjhkrjipiyfjizyaw.supabase.co`. The app is deployed to Vercel, connects to Stripe for payments, and uses GoHighLevel for all outbound emails.

---

## 2. The People: Users & Subscriptions

### Who Can Sign Up?
Anyone with an email and password. No Google or Apple login — just email. Supabase Auth handles the actual registration securely.

### Two Types of People
1. **Free Readers** — They can browse the store, buy books, and read them in the app. That's it.
2. **Premium Members** (Book Club) — They pay **$49.99 for the first month**, then **$3.99/month** after that. They get everything free readers get, **plus**:
   - Access to the monthly book club pick (automatically added to their library)
   - Community discussions (the chat forum)
   - Book club events and RSVP
   - A personal **dealer code** to share for 35% off (more on that later)
   - 2 free books picked at signup that **they keep forever**
   - **A KANE's T-shirt and a special free gift** (these items are exclusive perks and never sold in the app)

### What About Admins?
There are only two roles: `reader` and `admin`. Admins can see and change everything. The admin panel at `/admin` is protected by server-side middleware that checks the user's role from the database.

### What Happens If Someone Gets Banned?
- They **can still read** any books they've already purchased.
- They **cannot** access discussions, events, or any community features.
- Their premium subscription is **automatically cancelled** — they stop being charged.

### Privacy
Other users can **only** see a person's **display name** in discussions. No profile pictures, emails, phone numbers, or any other personal data is visible to other users.

---

## 3. The Bookshelf: Books & Content

### How Books Get Into the System
1. An admin uploads a **PDF** of the book through the `/admin/upload` page.
2. An admin uploads a **standard-sized book cover image**.
3. The `upload-book` Edge Function converts each PDF page into a high-quality **WebP image** that preserves the exact visual layout.
4. **Text is also extracted** from each page — but only for search indexing, not for display.
5. **Inline illustrations** are extracted from the PDF with their page positions and stored separately.
6. The reader app shows each page as a rendered image — everything looks exactly like the original printed book, with **"Page 1 of 45" navigation**.

### Key Fields Per Book
- **One author** and **one optional illustrator** per book. The illustrator's name is shown publicly on the book detail page.
- **Book Club Eligibility**: An `is_book_club_eligible` flag determines which books can appear in the subscription modal book picker. Admins control this.
- **Formats (Variants)**: Every book can be purchased in three ways:
   - **ebook**: Digital version, added to your library immediately.
   - **Paper Book**: Physical copy, shipped to your address.
   - **Komet Card**: Physical commemorative card, shipped to your address. **Also grants digital reading access** — the ebook is added to your library when the webhook confirms payment.
- **What You Can Read**: Only the **ebook** version (and Komet Card digital access) appear as readable books in your library. Paper Book orders are tracked in order history only.
- **Series support**: Some books are part of a series (e.g., "Brute Syndicate #3"). The series name and order number are stored and displayed as a label on the book card.
- **Inventory Management**: Admins can independently toggle availability for each format. Out-of-stock formats remain visible with a label, but the purchase option is disabled.
- **Genres are fixed**: Crime, Children, PTP (Prayers, Thoughts, and Poetry), Spiritual, Adult, Sports, Self-Help, Cooking.
- **No user reviews or ratings**. These have been completely removed from the platform.
- **Simplified Catalog**: Page counts, published years, and ISBNs have been removed.

### Book Deletion
When an admin deletes a book, the database performs a **cascade deletion** — automatically cleaning up all related `order_items`, `user_library` entries, and `book_club_selections` tied to that book. This prevents orphaned data and was implemented in migration `20260227200000`.

---

## 4. The Store: Shopping & Payments

### Payment Processor: Stripe
Stripe handles all money:
- **Book purchases**: One-time payments via Stripe PaymentIntents (handled by the `process-checkout` Edge Function).
- **Subscriptions**: Stripe manages the recurring $3.99/month billing (handled by the `create-subscription` Edge Function).
- **Webhook**: The `stripe-webhook` Edge Function listens for Stripe events and updates order status, grants library access, and triggers emails.

### Tax
A flat **5% GST** is applied to every order.

### All Sales Are Final
No refunds, no cancellations. Once you buy a book, it's yours.

### No Duplicate Purchases
The system prevents a user from buying an **ebook** they already own. However, they **can** buy physical copies of books they already own digitally (as gifts, for example).

### Dealer Codes (The Affiliate System)
Every premium member gets a unique **dealer code** formatted like: `KANE-EVANS-4821`.

Here's how it works:
- The code gives **35% off** any book purchase at checkout (not subscription fees).
- It can be shared with anyone and used **unlimited times** by **multiple people**.
- **Self-use prevention**: You **cannot use your own dealer code** on your own purchases.
- **Every use is tracked** so the business can see which "dealer" (premium member) is driving sales.
- When a premium member cancels their subscription or gets banned, their code is **automatically deactivated**.
- **Stripe integration**: The code is also created as a **Stripe Promotion Code**, so it can be used across any application connected to the same Stripe account.

### Library Sources
Books can enter a user's library through four sources (tracked by the `source` field):
1. **`purchase`** — Bought at checkout (ebook or Komet Card).
2. **`subscription_signup`** — The 2 free books chosen during Book Club signup.
3. **`book_club_monthly`** — Monthly picks for active premium members.
4. **`admin_gift`** — Manually granted by an admin.

### Email Confirmations
When a purchase is completed, **GoHighLevel** sends the confirmation email via the `email-ops` Edge Function — not the app itself.

---

## 5. The Book Club: Selections, Events & RSVPs

### Monthly Book Picks
Each month, the admin selects a featured book. When a book becomes the "current" pick, it is **automatically added** to every active premium member's library.

### Book Selection at Signup
The subscription modal shows up to **5 books** that are flagged as `is_book_club_eligible = true`. Users must choose exactly 2. Adult-restricted books are hidden from users under 18.

### Membership Cancellation & Access
- **Keep Everything**: Any book a user receives (purchased, signup freebies, OR monthly picks) **remains in their library forever**.
- **No New Picks**: If a user cancels their membership, they stop receiving future monthly picks, but keep everything they already had.
- **Reactivation**: Re-subscribing means paying $49.99 again, picking 2 more free books, and having the existing dealer code reactivated (same code, not a new one).

### Events
- Can be **virtual** (with a meeting link) or **in-person** (with a physical address).
- No max capacity — unlimited RSVPs.
- **Account required** to RSVP — no guest RSVPs.
- **Free users can RSVP to public events**; premium members can RSVP to all events.
- GoHighLevel handles event reminder emails.

---

## 6. The Community: Discussions

### Who Can Participate?
Discussions are for **premium members only**. Free readers and guests **cannot see** topics or posts at all.

### Discussion Categories
Discussion topics can be categorized as: `General`, `Book Club`, `News`, or any of the book genres (Crime, Children, PTP, Spiritual, Adult, Sports, Self-Help, Cooking).

### Who Creates Topics?
**Only admins** can create, pin, feature, or delete discussion topics.

### Posting Rules
- Premium members can post comments and replies (2 levels deep max).
- You can **edit** your own comment within **15 minutes** of posting it. After that, it's locked.
- You can **delete** your own comment at **any time**.
- Admins can delete any comment (manual moderation).
- Other users see only your **display name** — no other personal info.

### Voting
Users can upvote or downvote posts. Each user gets one vote per post.

---

## 7. The Reader: Reading Experience

### Cross-Device Sync
If you read to page 12 on your phone, you'll see page 12 when you open the app on your laptop. Reading progress, highlights, bookmarks, and display settings all sync to the server.

### Highlights
- You can highlight text in **four colors**: yellow, green, blue, pink.
- You can add an optional note to any highlight.
- **Cap: 10 highlights per book** (for all users — free and premium).
- Highlights are **always private** — no one else can see them.

### Bookmarks
- Bookmarks work at the **page level** — you bookmark an entire page, not a specific paragraph.
- You can add an optional label to each bookmark.
- **Cap: 10 bookmarks per book** (for all users).

### Reader Settings
Because the reader displays rendered PDF page images (not re-flowed text), the display settings are limited to:
- **Zoom level**: 75%, 100%, 125%, or 150%.
- **Theme**: Dark (dark background), Light (white background), or Sepia (warm parchment look).

Font size, font family, and line height controls do **not** apply to the page-image reader.

---

## 8. Fixed Lists (Enums)

The database uses fixed sets of allowed values to prevent data errors:

| List | Options | Notes |
|---|---|---|
| **User role** | reader, admin | |
| **T-shirt size** | xs, s, m, l, xl, xxl, xxxl | For merch fulfillment |
| **Subscription plan** | free, premium | |
| **Subscription status** | active, cancelled, expired, past_due | No "paused" option |
| **Genre** | Crime, Children, PTP, Spiritual, Adult, Sports, Self-Help, Cooking | |
| **Book status** | draft, published | |
| **Book format** | ebook, paper_book, komet_card | |
| **Order status** | pending, confirmed, fulfilled | No "cancelled" — all sales final |
| **Library source** | purchase, subscription_signup, book_club_monthly, admin_gift | |
| **Highlight color** | yellow, green, blue, pink | |
| **Reading theme** | dark, light, sepia | |
| **Selection status** | current, upcoming, past | |
| **Event type** | virtual, in_person | |
| **Event status** | upcoming, past, cancelled | |
| **RSVP status** | confirmed, cancelled | |
| **Discussion category** | General, Book Club, News, Crime, Children, PTP, Spiritual, Adult, Sports, Self-Help, Cooking | |
| **Vote type** | up, down | |

---

## 9. Relationships: The Digital Web

- A **User** has one **Subscription**, one set of **Reading Settings**, and one **Promo Code** (if premium).
- A **User** can have many **Cart Items**, **Orders**, **Library Books**, **Highlights**, **Bookmarks**, **RSVPs**, **Discussion Posts**, and **Votes**.
- A **Book** has many **Pages** and many **Illustrations**. It also has an `is_book_club_eligible` flag.
- A **Book** can appear in many users' **Libraries**, **Carts**, and **Orders**.
- An **Order** has many **Order Items** and optionally uses one **Promo Code**.
- When a **Book is deleted** by an admin, all Order Items, Library entries, and Book Club Selections for that book are automatically cleaned up (cascading delete).

---

## 10. Indexes: Speed Boosters

The database has performance shortcuts so common actions are instant:
- **Searching for a book** by title or author → full-text search index.
- **Filtering by genre** on the Browse page → genre + status index.
- **Finding books eligible for Book Club selection** → `is_book_club_eligible` partial index.
- **Looking up your cart or library** → user ID index.
- **Checking a dealer code at checkout** → unique code index.
- **Loading a discussion thread** → topic ID + timestamp index.

---

## 11. Validation: The Rulebook

| Rule | Why |
|---|---|
| Book price must be greater than $0 | Free access is handled through subscriptions |
| Cart quantity must be at least 1 | Can't have 0 items in your cart |
| Reader zoom must be 75, 100, 125, or 150 | Keeps the reader usable |
| Max 10 highlights per book | Keeps the reader lean |
| Max 10 bookmarks per book | Same as above |
| One RSVP per user per event | Prevents duplicate signups |
| Comments editable for 15 minutes only | Encourages thoughtful posting |
| Can't re-purchase an ebook you already own | Prevents accidental duplicates |
| Only premium members can post in discussions | Community is a paid perk |
| Exactly 2 books must be chosen at signup | Per business design |
| Only 5 books are shown in the signup selector | Only `is_book_club_eligible = true` books appear |

---

## 12. Permissions: Who Sees What

### Guests (not logged in)
Browse the book catalog, add books to their cart, see book club selections, and view public events. Cannot checkout, post, or see discussions.

### Free Readers (logged in, no subscription)
Everything guests can do, **plus**: purchase books, read owned books, use the reader with highlights/bookmarks/settings, view order history, and **RSVP to public events**. Cannot see any part of the community discussions.

### Premium Members (active subscription)
Everything free readers can do, **plus**: access monthly book picks, RSVP to all events, post in discussions, vote on posts, use their dealer code.

### Banned Users
Can **only** read the books currently in their library with full reader features (progress, highlights, bookmarks, settings). Everything else is locked out. Subscription is auto-cancelled.

### Admins
Full control over everything: manage users, books, events, discussions, selections, and view all data. The admin panel at `/admin` requires the `role = 'admin'` check.

---

## 13. Audit & Safety

### Timestamps
Every row in every table records **when it was created** and **when it was last changed**.

### Soft Delete
When an admin "deletes" a book, discussion topic, or user — it's not actually erased. It's marked with a `deleted_at` timestamp. Mistakes can be undone, and data integrity is preserved.

### Hard Cascade Delete (Books)
When a book record is fully deleted via the admin catalog page, the cascade deletion migration ensures all related `order_items`, `user_library` entries, and `book_club_selections` are removed automatically — preventing 409 Conflict errors.

### Admin Audit Log
An `audit_log` table records sensitive admin actions (banning users, deleting books, cancelling subscriptions), creating an accountability trail.

---

## 14. Scalability: Thinking Ahead

| Design Choice | Why It Matters |
|---|---|
| **Pages rendered as images** | The reader loads one page image at a time — much faster than loading an entire book. |
| **Illustrations as separate records** | Loaded on-demand as the reader reaches them. |
| **Debounced reading progress** | The app waits 5 seconds between saving your page position to the server. Avoids database overload. |
| **Denormalized counters** | Discussion post counts, vote totals, and event attendee counts update via database triggers — no recalculation on every page load. |
| **Book club eligibility flag** | Allows the admin to curate a small, targeted list of books for the signup modal without complex queries. |
| **Stripe + GoHighLevel** | Payments and emails are handled by specialized services, reducing what our code needs to manage. |

---

## 15. What's NOT Being Built

Based on current decisions, these features are **explicitly excluded**:

- ❌ Social login (Google, Apple)
- ❌ User reviews or ratings
- ❌ Wishlists
- ❌ Audiobooks
- ❌ Multiple languages
- ❌ Reading streaks / gamification
- ❌ In-app notifications
- ❌ Calendar invites for events
- ❌ Data export for admins
- ❌ Analytics dashboard
- ❌ Membership pause option
- ❌ Refunds
- ❌ Dedicated series page
- ❌ Mobile app
- ❌ In-app sales of physical merchandise

---

## 16. Key Integrations Summary

| Service | What It Does | Connection Details |
|---|---|---|
| **Supabase** | Database (PostgreSQL), authentication, file storage, Edge Functions | Project ID: `kpafjhkrjipiyfjizyaw`. Connected via `NEXT_PUBLIC_SUPABASE_URL` and anon key in the frontend. |
| **Stripe** | Processes book payments and manages monthly subscription billing | Stripe Customer ID + Subscription ID stored in our `users` table. Webhooks delivered to the `stripe-webhook` Edge Function. Uses `STRIPE_WEBHOOK_SECRET` for verification. |
| **GoHighLevel (GHL)** | Sends all outbound emails (order confirmations, subscription welcome, event reminders, payment failures, ban notices) | GHL Contact ID stored in the `users.ghl_contact_id` field. All email triggers go through the `email-ops` Edge Function and the `ghl-sync` Edge Function for contact sync. |
| **Vercel** | Hosts the Next.js frontend | Deployed from the main Git branch. Uses environment variables matching those in `.env.local`. |

---

*Last updated: February 2026 — reflects live codebase*
