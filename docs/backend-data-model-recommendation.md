# Kane's Komet Book Reader — Backend Data Model Recommendation (Final)

> **Generated from**: Full frontend codebase analysis + owner Q&A  
> **Target Backend**: Supabase (PostgreSQL + Edge Functions)  
> **Payment Provider**: Stripe  
> **Email Provider**: GoHighLevel  
> **Date**: February 2026 — **Finalized**

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Entity Definitions](#2-entity-definitions)
3. [Enums & Constants](#3-enums--constants)
4. [Relationships & Foreign Keys](#4-relationships--foreign-keys)
5. [Indexes](#5-indexes)
6. [Derived / Computed Fields](#6-derived--computed-fields)
7. [Validation Rules](#7-validation-rules)
8. [Permission Boundaries (RLS)](#8-permission-boundaries-rls)
9. [Audit & Soft Delete](#9-audit--soft-delete)
10. [Scalability Considerations](#10-scalability-considerations)
11. [Business Rules Summary](#11-business-rules-summary)
12. [Entity-Relationship Diagram (Text)](#12-entity-relationship-diagram-text)

---

## 1. Executive Summary

The Kane's Komet Book Reader is a **digital bookstore + book club platform** with the following domain model:

| Domain | Tables |
|---|---|
| **Users & Auth** | `users`, `user_subscriptions` |
| **Catalog & Content** | `books`, `book_chapters`, `book_illustrations` |
| **Commerce** | `cart_items`, `orders`, `order_items`, `user_library`, `promo_codes`, `promo_code_usages` |
| **Book Club** | `book_club_selections`, `book_club_events`, `event_rsvps` |
| **Community** | `discussion_topics`, `discussion_posts`, `discussion_votes` |
| **Reading Experience** | `reading_progress`, `highlights`, `bookmarks`, `reading_settings` |

**Total: 20 tables**

### Key Business Decisions (from owner Q&A)

- **Open registration**: Anyone can sign up with email + password. No social login.
- **Two user tiers**: Free readers (buy & read books) and Premium members (book club — access to discussions, events, monthly picks, dealer codes, plus a KANE's T-shirt and special gift).
- **Stripe payments**: $49.99 first month, then $3.99/month recurring. Book purchases are separate one-time charges. Physical perks (T-shirt/gift) are exclusive to premium and not sold individually.
- **No refunds**: All sales are final.
- **GoHighLevel**: Handles all outbound email notifications (order confirmations, subscription emails, event reminders, etc.).
- **No Ratings or Reviews**: The rating and review feature has been completely eliminated from the platform. The `rating` field has been removed from the data model and all UI components.
- **PDF → Text extraction**: Admin uploads PDFs and a standard-sized book cover; a tool extracts text into chapters. Illustrations are stored separately and shown as full-page images between chapters.
- **Book Variants**: Each book can be purchased as an **ebook** (digital), **Paper Book** (physical), or **Komet Card** (physical). 
- **Digital vs Physical**: Only the ebook version is readable within the application. Paper Books and Komet Cards are physical items that require a shipping address and will be shipped to the user.
- **Dealer codes**: Every premium member receives a unique code (`KANE-NAME-PHONE` format) worth 35% off at checkout. Usage is tracked for dealer credit.
- **Cross-device sync**: Reading progress, highlights, bookmarks, and settings persist server-side.
- **Caps**: 10 highlights per book, 10 bookmarks per book (all users).

---

## 2. Entity Definitions

### 2.1 `users`

Extends Supabase `auth.users`. This is the application profile table.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `UUID` PK | No | `auth.uid()` | FK → `auth.users.id` |
| `email` | `TEXT` | No | — | Unique, from auth |
| `display_name` | `TEXT` | No | — | Publicly visible in discussions |
| `full_name` | `TEXT` | No | — | Private — not shown to other users |
| `phone` | `TEXT` | Yes | — | From subscription signup |
| `date_of_birth` | `DATE` | Yes | — | Used for age-gating adult content |
| `mailing_address` | `TEXT` | Yes | — | For physical merch shipment (Premium perk) |
| `tshirt_size` | `tshirt_size_enum` | Yes | — | xs, s, m, l, xl, xxl, xxxl (Premium perk) |
| `avatar_url` | `TEXT` | Yes | — | Profile image (internal use only — not shown to other users) |
| `role` | `user_role_enum` | No | `'reader'` | reader, admin |
| `is_banned` | `BOOLEAN` | No | `false` | Banning removes community access; auto-cancels subscription |
| `ghl_contact_id` | `TEXT` | Yes | — | GoHighLevel contact ID for email sync |
| `stripe_customer_id` | `TEXT` | Yes | — | Stripe Customer ID |
| `created_at` | `TIMESTAMPTZ` | No | `now()` | |
| `updated_at` | `TIMESTAMPTZ` | No | `now()` | |
| `last_active_at` | `TIMESTAMPTZ` | Yes | — | Updated on user activity |
| `deleted_at` | `TIMESTAMPTZ` | Yes | — | Soft delete |

**Privacy rule**: Other users can *only* see `display_name` in discussions. Email, full name, phone, DOB, address, avatar, and all other fields are private.

---

### 2.2 `books`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `UUID` PK | No | `gen_random_uuid()` | |
| `title` | `TEXT` | No | — | |
| `author` | `TEXT` | No | — | Single author per book |
| `illustrator` | `TEXT` | Yes | — | Internal record-keeping only |
| `description` | `TEXT` | Yes | — | |
| `genre` | `genre_enum` | No | — | Fixed list, developer-managed |
| `cover_image_url` | `TEXT` | Yes | — | Supabase Storage URL |
| `book_file_url` | `TEXT` | Yes | — | Original PDF storage path |
| `series_name` | `TEXT` | Yes | — | e.g., "Brute Syndicate" |
| `series_order` | `INTEGER` | Yes | — | e.g., 3 |
| `status` | `book_status_enum` | No | `'draft'` | draft, published |
| `is_age_restricted` | `BOOLEAN` | No | `false` | Requires DOB check |
| `created_at` | `TIMESTAMPTZ` | No | `now()` | |
| `updated_at` | `TIMESTAMPTZ` | No | `now()` | |
| `deleted_at` | `TIMESTAMPTZ` | Yes | — | Soft delete |

**Removed**: `rating`, `page_count`, `published_year`, and `isbn` fields—per owner decision to simplify the catalog and focus exclusively on the core reading experience.

---

### 2.3 `book_variants`

Stores the different purchase options for each book.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `UUID` PK | No | `gen_random_uuid()` | |
| `book_id` | `UUID` FK | No | — | → `books.id` |
| `format` | `book_format_enum` | No | — | ebook, paper_book, komet_card |
| `price` | `NUMERIC(10,2)` | No | — | Price varies by format |
| `is_in_stock` | `BOOLEAN` | No | `true` | When false, shows "Out of Stock" for this variant |
| `created_at` | `TIMESTAMPTZ` | No | `now()` | |
| `updated_at` | `TIMESTAMPTZ` | No | `now()` | |

**Note**: One book record can have up to 3 variants (one of each format).

---

### 2.4 `book_chapters`

Stores extracted text from PDF uploads, one row per chapter.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `UUID` PK | No | `gen_random_uuid()` | |
| `book_id` | `UUID` FK | No | — | → `books.id` |
| `chapter_number` | `INTEGER` | No | — | |
| `title` | `TEXT` | No | — | |
| `content` | `TEXT` | No | — | Full chapter text (extracted from PDF) |
| `word_count` | `INTEGER` | No | `0` | Derived on insert |

---

### 2.5 `book_illustrations`

Stores images extracted from PDFs, displayed as full-page images between chapters/sections.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `UUID` PK | No | `gen_random_uuid()` | |
| `book_id` | `UUID` FK | No | — | → `books.id` |
| `image_url` | `TEXT` | No | — | Supabase Storage URL |
| `display_after_chapter` | `INTEGER` | No | — | Show this image after chapter N (0 = before chapter 1, i.e. frontispiece) |
| `caption` | `TEXT` | Yes | — | Optional alt text / description |
| `sort_order` | `INTEGER` | No | `0` | If multiple illustrations after the same chapter |
| `created_at` | `TIMESTAMPTZ` | No | `now()` | |

---

### 2.6 `user_subscriptions`

One subscription per user. Stripe handles recurring billing.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `UUID` PK | No | `gen_random_uuid()` | |
| `user_id` | `UUID` FK | No | — | → `users.id`, UNIQUE |
| `plan` | `subscription_plan_enum` | No | `'free'` | free, premium |
| `status` | `subscription_status_enum` | No | `'active'` | active, cancelled, expired, past_due |
| `stripe_subscription_id` | `TEXT` | Yes | — | Stripe Subscription ID for recurring billing |
| `initial_fee_paid` | `NUMERIC(10,2)` | Yes | — | $49.99 first month |
| `monthly_rate` | `NUMERIC(10,2)` | Yes | — | $3.99/month starting month 2 |
| `selected_book_ids` | `UUID[]` | Yes | — | 2 books chosen at signup — kept forever |
| `started_at` | `TIMESTAMPTZ` | No | `now()` | |
| `expires_at` | `TIMESTAMPTZ` | Yes | — | |
| `cancelled_at` | `TIMESTAMPTZ` | Yes | — | No pause — cancel only |

**Business rules**:
- $49.99 for the first month, then $3.99/month starting month 2.
- Premium members receive a KANE's T-shirt and a special free gift (not sold in-app).
- No pause option — users can only cancel and re-join later.
- **All books** (purchased, signup freebies, and monthly picks) stay in the user's library **forever**, even after cancellation or ban.
- When a premium member is banned, their subscription is **automatically cancelled** via Stripe.

---

### 2.7 `promo_codes`

Every premium member receives a unique dealer code. Fixed 35% discount.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `UUID` PK | No | `gen_random_uuid()` | |
| `owner_id` | `UUID` FK | No | — | → `users.id` (the dealer/premium member) |
| `code` | `TEXT` | No | — | Unique. Format: `KANE-{NAME}-{PHONE_LAST4}` e.g., `KANE-EVANS-4821` |
| `discount_percent` | `INTEGER` | No | `35` | Always 35% |
| `is_active` | `BOOLEAN` | No | `true` | Deactivated when owner's subscription is cancelled |
| `total_uses` | `INTEGER` | No | `0` | Denormalized counter |
| `created_at` | `TIMESTAMPTZ` | No | `now()` | |

**Unique constraint**: `(code)` — each code must be globally unique.

**Rules**:
- Applies to book purchases at checkout only (not subscription fees).
- Can be used by multiple people, multiple times.
- Deactivated when the owning premium member cancels or is banned.

---

### 2.8 `promo_code_usages`

Tracks every use of a dealer code for dealer credit attribution.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `UUID` PK | No | `gen_random_uuid()` | |
| `promo_code_id` | `UUID` FK | No | — | → `promo_codes.id` |
| `used_by_user_id` | `UUID` FK | No | — | → `users.id` (the buyer who used the code) |
| `order_id` | `UUID` FK | No | — | → `orders.id` |
| `discount_amount` | `NUMERIC(10,2)` | No | — | Actual dollar amount saved |
| `used_at` | `TIMESTAMPTZ` | No | `now()` | |

---

### 2.9 `cart_items`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `UUID` PK | No | `gen_random_uuid()` | |
| `user_id` | `UUID` FK | Yes | — | → `users.id` (NULL for guests) |
| `session_id` | `TEXT` | Yes | — | Unique anonymous session ID for guests |
| `book_id` | `UUID` FK | No | — | → `books.id` |
| `variant_id` | `UUID` FK | No | — | → `book_variants.id` (tracks selected format/price) |
| `quantity` | `INTEGER` | No | `1` | |
| `added_at` | `TIMESTAMPTZ` | No | `now()` | |

**Unique constraint**: `(user_id, book_id, variant_id)`

**Rule**: Cannot add a book that already exists in the user's `user_library` (prevents re-purchasing).

---

### 2.10 `orders`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `UUID` PK | No | `gen_random_uuid()` | |
| `user_id` | `UUID` FK | No | — | → `users.id` |
| `status` | `order_status_enum` | No | `'pending'` | pending, confirmed, fulfilled |
| `subtotal` | `NUMERIC(10,2)` | No | — | Sum of items before discount/tax |
| `discount_amount` | `NUMERIC(10,2)` | No | `0` | From dealer code (35%) |
| `tax_amount` | `NUMERIC(10,2)` | No | — | Flat 5% GST on (subtotal - discount) |
| `total` | `NUMERIC(10,2)` | No | — | subtotal - discount + tax |
| `promo_code_id` | `UUID` FK | Yes | — | → `promo_codes.id` (if dealer code was used) |
| `stripe_payment_intent_id` | `TEXT` | Yes | — | Stripe PaymentIntent ID |
| `shipping_name` | `TEXT` | Yes | — | |
| `shipping_email` | `TEXT` | Yes | — | |
| `shipping_address` | `TEXT` | Yes | — | |
| `shipping_city` | `TEXT` | Yes | — | |
| `shipping_state` | `TEXT` | Yes | — | |
| `shipping_zip` | `TEXT` | Yes | — | |
| `placed_at` | `TIMESTAMPTZ` | No | `now()` | |

**Business rules**:
- All sales are final — no refunds, no cancellations.
- Removed `cancelled` from order status enum.
- A user cannot purchase a book they already own (checked against `user_library`).

---

### 2.11 `order_items`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `UUID` PK | No | `gen_random_uuid()` | |
| `order_id` | `UUID` FK | No | — | → `orders.id` |
| `book_id` | `UUID` FK | No | — | → `books.id` |
| `variant_id` | `UUID` FK | No | — | → `book_variants.id` |
| `format` | `book_format_enum` | No | — | Format snapshot at time of purchase |
| `quantity` | `INTEGER` | No | — | |
| `unit_price` | `NUMERIC(10,2)` | No | — | Price at time of purchase (snapshot) |

---

### 2.12 `user_library`

Tracks which books a user owns/has access to and the source of access.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `UUID` PK | No | `gen_random_uuid()` | |
| `user_id` | `UUID` FK | No | — | → `users.id` |
| `book_id` | `UUID` FK | No | — | → `books.id` |
| `source` | `library_source_enum` | No | — | purchase, subscription_signup, book_club_monthly |
| `is_permanent` | `BOOLEAN` | No | — | `true` for purchases & signup picks; `false` for monthly picks |
| `acquired_at` | `TIMESTAMPTZ` | No | `now()` | |

**Unique constraint**: `(user_id, book_id)`

**Business rules**:
- `purchase` → permanent. Books bought at checkout.
- `subscription_signup` → permanent. The 2 free books picked during signup.
- `book_club_monthly` → **permanent**. Monthly picks remain in library even if subscription cancelled/expired. Users simply stop receiving *new* picks after cancellation.
- **Ebook Only**: Only the `ebook` variant is added to the digital `user_library`. Physical purchases (Paper/Komet Card) are tracked in `orders` but not readable in the app.
- Books acquired from ANY source remain in the library forever, including after a ban.

---

### 2.13 `reading_progress`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `UUID` PK | No | `gen_random_uuid()` | |
| `user_id` | `UUID` FK | No | — | → `users.id` |
| `book_id` | `UUID` FK | No | — | → `books.id` |
| `current_chapter` | `INTEGER` | No | `0` | |
| `progress_percent` | `NUMERIC(5,2)` | No | `0` | 0–100 |
| `last_read_at` | `TIMESTAMPTZ` | No | `now()` | |

**Unique constraint**: `(user_id, book_id)`

Syncs across devices. Debounce client writes to every 30 seconds.

---

### 2.14 `highlights`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `UUID` PK | No | `gen_random_uuid()` | |
| `user_id` | `UUID` FK | No | — | → `users.id` |
| `book_id` | `UUID` FK | No | — | → `books.id` |
| `chapter_index` | `INTEGER` | No | — | |
| `paragraph_index` | `INTEGER` | No | — | |
| `text` | `TEXT` | No | — | Selected text |
| `color` | `highlight_color_enum` | No | `'yellow'` | yellow, green, blue, pink |
| `note` | `TEXT` | Yes | — | Optional annotation |
| `created_at` | `TIMESTAMPTZ` | No | `now()` | |

**Cap**: 10 highlights per book per user. Enforced via app-level check before INSERT.

**Privacy**: Highlights are always private. Never visible to other users.

---

### 2.15 `bookmarks`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `UUID` PK | No | `gen_random_uuid()` | |
| `user_id` | `UUID` FK | No | — | → `users.id` |
| `book_id` | `UUID` FK | No | — | → `books.id` |
| `chapter_index` | `INTEGER` | No | — | |
| `paragraph_index` | `INTEGER` | No | — | |
| `label` | `TEXT` | Yes | — | User-defined label |
| `created_at` | `TIMESTAMPTZ` | No | `now()` | |

**Cap**: 10 bookmarks per book per user. Enforced via app-level check before INSERT.

---

### 2.16 `reading_settings`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `UUID` PK | No | `gen_random_uuid()` | |
| `user_id` | `UUID` FK | No | — | → `users.id`, UNIQUE |
| `font_size` | `INTEGER` | No | `18` | px |
| `font_family` | `TEXT` | No | `'Georgia'` | |
| `theme` | `reading_theme_enum` | No | `'dark'` | dark, light, sepia |
| `line_height` | `NUMERIC(3,1)` | No | `1.8` | |
| `updated_at` | `TIMESTAMPTZ` | No | `now()` | |

---

### 2.17 `book_club_selections`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `UUID` PK | No | `gen_random_uuid()` | |
| `book_id` | `UUID` FK | No | — | → `books.id` |
| `month` | `TEXT` | No | — | e.g., "January" |
| `year` | `INTEGER` | No | — | e.g., 2025 |
| `theme` | `TEXT` | No | — | e.g., "Cyberpunk Dystopias" |
| `description` | `TEXT` | Yes | — | |
| `status` | `selection_status_enum` | No | `'upcoming'` | current, upcoming, past |
| `discussion_date` | `DATE` | Yes | — | |
| `created_at` | `TIMESTAMPTZ` | No | `now()` | |
| `updated_at` | `TIMESTAMPTZ` | No | `now()` | |

**Unique constraint**: `(month, year)` — one selection per month.

**Rule**: When a selection becomes `current`, the selected book is **automatically added** to every active premium member's `user_library` with `source = 'book_club_monthly'`.

---

### 2.18 `book_club_events`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `UUID` PK | No | `gen_random_uuid()` | |
| `title` | `TEXT` | No | — | |
| `description` | `TEXT` | Yes | — | |
| `date` | `DATE` | No | — | |
| `time` | `TEXT` | No | — | e.g., "7:00 PM EST" |
| `location` | `TEXT` | No | — | URL or physical address |
| `type` | `event_type_enum` | No | — | virtual, in_person |
| `cover_image_url` | `TEXT` | Yes | — | |
| `is_public` | `BOOLEAN` | No | `true` | Visible to non-members? |
| `status` | `event_status_enum` | No | `'upcoming'` | upcoming, past, cancelled |
| `attendee_count` | `INTEGER` | No | `0` | Denormalized counter |
| `created_at` | `TIMESTAMPTZ` | No | `now()` | |
| `updated_at` | `TIMESTAMPTZ` | No | `now()` | |

**Rules**: No max capacity. No calendar invites sent.

---

### 2.19 `event_rsvps`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `UUID` PK | No | `gen_random_uuid()` | |
| `event_id` | `UUID` FK | No | — | → `book_club_events.id` |
| `user_id` | `UUID` FK | No | — | → `users.id` (**account required** — no guest RSVPs) |
| `name` | `TEXT` | No | — | |
| `email` | `TEXT` | No | — | |
| `phone` | `TEXT` | Yes | — | |
| `rsvp_status` | `rsvp_status_enum` | No | `'confirmed'` | confirmed, cancelled |
| `created_at` | `TIMESTAMPTZ` | No | `now()` | |

**Unique constraint**: `(event_id, user_id)` — one RSVP per user per event.

---

### 2.20 `discussion_topics`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `UUID` PK | No | `gen_random_uuid()` | |
| `title` | `TEXT` | No | — | |
| `description` | `TEXT` | Yes | — | |
| `category` | `discussion_category_enum` | No | `'General'` | |
| `book_id` | `UUID` FK | Yes | — | → `books.id` (optional link) |
| `is_pinned` | `BOOLEAN` | No | `false` | |
| `is_featured` | `BOOLEAN` | No | `false` | |
| `post_count` | `INTEGER` | No | `0` | Denormalized |
| `member_count` | `INTEGER` | No | `0` | Denormalized |
| `last_activity_at` | `TIMESTAMPTZ` | Yes | — | |
| `created_at` | `TIMESTAMPTZ` | No | `now()` | |
| `updated_at` | `TIMESTAMPTZ` | No | `now()` | |
| `deleted_at` | `TIMESTAMPTZ` | Yes | — | Soft delete |

**Rule**: Only admins can create, edit, pin, feature, or delete topics.

---

### 2.21 `discussion_posts`

Supports threaded comments (self-referencing `parent_id`).

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `UUID` PK | No | `gen_random_uuid()` | |
| `topic_id` | `UUID` FK | No | — | → `discussion_topics.id` |
| `parent_id` | `UUID` FK | Yes | — | → `discussion_posts.id` (null = top-level) |
| `author_id` | `UUID` FK | No | — | → `users.id` |
| `content` | `TEXT` | No | — | |
| `likes` | `INTEGER` | No | `0` | Denormalized net vote count |
| `created_at` | `TIMESTAMPTZ` | No | `now()` | |
| `updated_at` | `TIMESTAMPTZ` | No | `now()` | |
| `deleted_at` | `TIMESTAMPTZ` | Yes | — | Soft delete |

**Business rules**:
- Only premium members can post.
- Users can **edit** their own posts within **15 minutes** of creation (enforced by: `updated_at - created_at ≤ 15 min`).
- Users can **delete** (soft-delete) their own posts at any time.
- Admins can delete any post (manual moderation).
- Only `display_name` of the author is shown to other users.

---

### 2.22 `discussion_votes`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `UUID` PK | No | `gen_random_uuid()` | |
| `post_id` | `UUID` FK | No | — | → `discussion_posts.id` |
| `user_id` | `UUID` FK | No | — | → `users.id` |
| `vote_type` | `vote_type_enum` | No | — | up, down |
| `created_at` | `TIMESTAMPTZ` | No | `now()` | |

**Unique constraint**: `(post_id, user_id)` — one vote per user per post.

---

## 3. Enums & Constants

```sql
-- User & Auth
CREATE TYPE user_role_enum AS ENUM ('reader', 'admin');
CREATE TYPE tshirt_size_enum AS ENUM ('xs', 's', 'm', 'l', 'xl', 'xxl', 'xxxl');

-- Subscription
CREATE TYPE subscription_plan_enum AS ENUM ('free', 'premium');
CREATE TYPE subscription_status_enum AS ENUM ('active', 'cancelled', 'expired', 'past_due');

-- Books
-- PTP = "Prayers, Thoughts, and Poetry"
CREATE TYPE genre_enum AS ENUM ('Crime', 'Children', 'PTP', 'Spiritual', 'Adult', 'Sports', 'Self-Help', 'Cooking');
CREATE TYPE book_status_enum AS ENUM ('draft', 'published');
CREATE TYPE book_format_enum AS ENUM ('ebook', 'paper_book', 'komet_card');

-- Commerce
CREATE TYPE order_status_enum AS ENUM ('pending', 'confirmed', 'fulfilled');
CREATE TYPE library_source_enum AS ENUM ('purchase', 'subscription_signup', 'book_club_monthly');

-- Reading
CREATE TYPE highlight_color_enum AS ENUM ('yellow', 'green', 'blue', 'pink');
CREATE TYPE reading_theme_enum AS ENUM ('dark', 'light', 'sepia');

-- Book Club
CREATE TYPE selection_status_enum AS ENUM ('current', 'upcoming', 'past');
CREATE TYPE event_type_enum AS ENUM ('virtual', 'in_person');
CREATE TYPE event_status_enum AS ENUM ('upcoming', 'past', 'cancelled');
CREATE TYPE rsvp_status_enum AS ENUM ('confirmed', 'cancelled');

-- Community
CREATE TYPE discussion_category_enum AS ENUM ('General', 'Book Club', 'Sci-Fi', 'Fantasy', 'News');
CREATE TYPE vote_type_enum AS ENUM ('up', 'down');
```

**Changes from V1**:
- Removed `cancelled` from `order_status_enum` (all sales are final).
- Split `library_source_enum` into `purchase`, `subscription_signup`, `book_club_monthly` (from generic `subscription`/`book_club`).
- Added PTP documentation in comment.
- Added `book_format_enum`.
- Genres are **fixed** — only a developer can modify this enum.

---

## 4. Relationships & Foreign Keys

```
users 1 ──── 1 user_subscriptions
users 1 ──── * promo_codes (as owner/dealer)
users 1 ──── * cart_items
users 1 ──── * orders
users 1 ──── * user_library
users 1 ──── * reading_progress
users 1 ──── * highlights
users 1 ──── * bookmarks
users 1 ──── 1 reading_settings
users 1 ──── * event_rsvps
users 1 ──── * discussion_posts
users 1 ──── * discussion_votes
users 1 ──── * promo_code_usages (as buyer)

books 1 ──── * book_variants
books 1 ──── * book_chapters
books 1 ──── * book_illustrations
books 1 ──── * user_library
books 1 ──── * reading_progress
books 1 ──── * highlights
books 1 ──── * bookmarks
books 1 ──── * book_club_selections
books 1 ──── * discussion_topics (optional)

book_variants 1 ──── * cart_items
book_variants 1 ──── * order_items

orders 1 ──── * order_items
orders * ──── 1 promo_codes (optional)

promo_codes 1 ──── * promo_code_usages

book_club_events 1 ──── * event_rsvps

discussion_topics 1 ──── * discussion_posts
discussion_posts 1 ──── * discussion_posts (self-ref: replies)
discussion_posts 1 ──── * discussion_votes
```

---

## 5. Indexes

| Table | Index | Type | Rationale |
|---|---|---|---|
| `books` | `(genre, status)` | B-tree | Browse page genre filter |
| `books` | `(published_year DESC)` | B-tree | "Newest" sort |
| `books` | `(series_name, series_order)` | B-tree | Series label & ordering |
| `books` | `GIN(to_tsvector(title || ' ' || author))` | Full-text | Search bar |
| `book_variants` | `(book_id, format)` | Unique | Ensure one format per book |
| `book_variants` | `(book_id, is_in_stock)` | B-tree | Filter available variants for a book |
| `cart_items` | `(user_id)` | B-tree | Cart retrieval |
| `cart_items` | `(user_id, book_id, variant_id)` | Unique | Prevent duplicate items in cart |
| `orders` | `(user_id, placed_at DESC)` | B-tree | Order history |
| `user_library` | `(user_id)` | B-tree | Dashboard library |
| `user_library` | `(user_id, book_id)` | Unique | Prevent duplicate ownership |
| `reading_progress` | `(user_id, book_id)` | Unique | Fast lookup |
| `highlights` | `(user_id, book_id)` | B-tree | Reader sidebar |
| `bookmarks` | `(user_id, book_id)` | B-tree | Reader sidebar |
| `book_club_selections` | `(status)` | B-tree | Current selection lookup |
| `book_club_events` | `(status, date)` | B-tree | Events listing |
| `book_illustrations` | `(book_id, display_after_chapter, sort_order)` | B-tree | Reader illustration loading |
| `discussion_topics` | `(is_pinned DESC, last_activity_at DESC)` | B-tree | Sorted topic list |
| `discussion_posts` | `(topic_id, created_at)` | B-tree | Thread loading |
| `discussion_votes` | `(post_id, user_id)` | Unique | Vote dedup |
| `promo_codes` | `(code)` | Unique | Code lookup at checkout |
| `promo_codes` | `(owner_id)` | B-tree | Find dealer's code |
| `promo_code_usages` | `(promo_code_id)` | B-tree | Usage tracking |
| `users` | `(role)` | B-tree | Admin user filtering |
| `users` | `(email)` | Unique | Login lookup |
| `users` | `(stripe_customer_id)` | B-tree | Stripe webhook handling |

---

## 6. Derived / Computed Fields

| Field | Computation | Strategy |
|---|---|---|
| `book_club_events.attendee_count` | COUNT of `event_rsvps` WHERE `rsvp_status = 'confirmed'` | Trigger on insert/update/delete |
| `discussion_topics.post_count` | COUNT of `discussion_posts` for topic | Trigger on insert/delete |
| `discussion_topics.member_count` | COUNT DISTINCT `author_id` in posts | Trigger or materialized view |
| `discussion_posts.likes` | SUM(CASE vote_type WHEN 'up' THEN 1 ELSE -1 END) from `discussion_votes` | Trigger on vote change |
| `promo_codes.total_uses` | COUNT of `promo_code_usages` for code | Trigger on insert |
| `orders.subtotal` | SUM(`order_items.unit_price * quantity`) | Computed at order creation |
| `orders.discount_amount` | `subtotal * 0.35` if promo code applied, else 0 | Computed at order creation |
| `orders.tax_amount` | `(subtotal - discount_amount) * 0.05` (flat GST) | Computed at order creation |
| `orders.total` | `subtotal - discount_amount + tax_amount` | Computed at order creation |
| `book_chapters.word_count` | COUNT of words in `content` | Computed on insert |

---

## 7. Validation Rules

| Entity | Rule | Implementation |
|---|---|---|
| `book_variants.price` | Must be > 0 | CHECK constraint |
| `books.page_count` | Must be > 0 | CHECK constraint |
| `cart_items.quantity` | Must be ≥ 1 | CHECK constraint |
| `order_items.quantity` | Must be ≥ 1 | CHECK constraint |
| `order_items.unit_price` | Must be ≥ 0 | CHECK constraint |
| `reading_progress.progress_percent` | Must be 0–100 | CHECK constraint |
| `reading_settings.font_size` | Must be 12–32 | CHECK constraint |
| `reading_settings.line_height` | Must be 1.0–3.0 | CHECK constraint |
| `highlights.text` | Must not be empty | CHECK constraint |
| `highlights` | Max 10 per (user_id, book_id) | App-level check before INSERT |
| `bookmarks` | Max 10 per (user_id, book_id) | App-level check before INSERT |
| `user_subscriptions.selected_book_ids` | Array length must be exactly 2 (when premium) | App-level |
| `book_club_selections` | Only one `status = 'current'` at a time | Trigger or app-level |
| `users.email` | Valid email format | Supabase auth handles this |
| `users.date_of_birth` | Required to access `is_age_restricted` books (≥18) | Edge Function |
| `event_rsvps` | One RSVP per user per event | UNIQUE constraint on `(event_id, user_id)` |
| `cart_items` | Cannot add book already in `user_library` | App-level check before INSERT |
| `discussion_posts` (edit) | Can only edit within 15 minutes of `created_at` | Edge Function |
| `discussion_posts` (create) | User must have active premium subscription | Edge Function |
| `promo_codes.code` | Must be unique | UNIQUE constraint |

---

## 8. Permission Boundaries (RLS)

### Readers (authenticated, `role = 'reader'`, free tier)

| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `users` | Own row only | — | Own row only | — |
| `books` | Published only | — | — | — |
| `book_chapters` | Only for owned books (in `user_library`) | — | — | — |
| `book_illustrations` | SELECT for all books currently in their library | — | — | — |
| `cart_items` | Own/Session rows | Own/Session rows | Own/Session rows | Own/Session rows |
| `orders` | Own rows | Own rows | — | — |
| `order_items` | Own order's items | — | — | — |
| `user_library` | Own rows | — | — | — |
| `reading_progress` | Own rows | Own rows | Own rows | — |
| `highlights` | Own rows | Own rows | Own rows | Own rows |
| `bookmarks` | Own rows | Own rows | Own rows | Own rows |
| `reading_settings` | Own row | Own row | Own row | — |
| `user_subscriptions` | Own row | — | — | — |
| `promo_codes` | Own code | — | — | — |
| `book_club_selections` | All | — | — | — |
| `book_club_events` | Public events only | — | — | — |
| `event_rsvps` | — | — | — | — |
| `discussion_topics` | None | — | — | — |
| `discussion_posts` | None | — | — | — |
| `discussion_votes` | — | — | — | — |

### Premium Members (authenticated, `role = 'reader'`, active subscription)

All of the above, **plus**:

| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `book_club_events` | All (public + private) | — | — | — |
| `event_rsvps` | Own rows | Own rows | Own rows | Own rows |
| `discussion_posts` | All non-deleted | Own rows | Own rows (15 min window) | Own rows (soft) |
| `discussion_votes` | Own rows | Own rows | Own rows | Own rows |

### Banned Users (authenticated, `is_banned = true`)

| Table | Access |
|---|---|
| `books` | SELECT published only |
| `book_chapters` | SELECT for **all** books currently in their library |
| `book_illustrations` | SELECT for all books currently in their library |
| `user_library` | SELECT own rows |
| `reading_progress` | SELECT/INSERT/UPDATE own rows |
| `highlights` | SELECT/INSERT/UPDATE/DELETE own rows |
| `bookmarks` | SELECT/INSERT/UPDATE/DELETE own rows |
| `reading_settings` | SELECT/UPDATE own row |
| Everything else | **NO ACCESS** |

### Admins (`role = 'admin'`)

Full CRUD on all tables. No RLS restrictions.

### Guest (unauthenticated)

| Table | Access |
|---|---|
| `books` | SELECT published only (browse page). Out-of-stock books show with label. |
| `book_club_selections` | SELECT all |
| `book_club_events` | SELECT where `is_public = true` |
| `cart_items` | SELECT/INSERT/UPDATE/DELETE (Session-based) |
| `discussion_topics` | None |
| `discussion_posts` | None |

---

## 9. Audit & Soft Delete

### Standard Audit Columns (all tables)

```sql
created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
```

Auto-update trigger:

```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Soft Delete

Applied to: `users`, `books`, `discussion_topics`, `discussion_posts`

```sql
deleted_at  TIMESTAMPTZ  -- NULL = active, non-NULL = soft-deleted
```

All queries filter `WHERE deleted_at IS NULL` by default. RLS policies include this filter.

### Audit Log (for admin actions)

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID` PK | |
| `actor_id` | `UUID` FK | Admin who performed action |
| `action` | `TEXT` | e.g., `user.banned`, `book.deleted`, `subscription.cancelled` |
| `target_table` | `TEXT` | |
| `target_id` | `UUID` | |
| `metadata` | `JSONB` | Before/after snapshot |
| `performed_at` | `TIMESTAMPTZ` | |

---

## 10. Scalability Considerations

| Concern | Recommendation |
|---|---|
| **PDF → Text extraction** | Use a server-side tool (e.g., pdf-parse, pdfjs-dist) in an Edge Function or background job. Extract text per chapter and images per illustration. |
| **Image/file storage** | Use Supabase Storage buckets for cover images, book PDFs, and extracted illustrations. Store only URLs in the database. |
| **Book content storage** | Store chapters as separate rows in `book_chapters` for lazy loading in the reader. |
| **Full-text search** | Use PostgreSQL `tsvector` + GIN index for book search. |
| **Reading data sync** | Debounce reading progress writes from the client (every 30 seconds) to avoid excessive DB writes. |
| **Discussion threading** | Self-referencing `parent_id` works well for 2-level nesting (as implemented). |
| **Denormalized counters** | `attendee_count`, `post_count`, `likes`, `total_uses` — updated via DB triggers. |
| **Pagination** | All list endpoints use cursor-based pagination. |
| **Promo code validation** | Fast lookup via unique index on `code`. |
| **Stripe webhooks** | Use `stripe_customer_id` and `stripe_subscription_id` indexes for fast webhook processing. |
| **GoHighLevel sync** | Store `ghl_contact_id` on users for webhook/API integration. Sync on user creation and order events. |

---

## 11. Business Rules Summary

| Rule | Description |
|---|---|
| **Open registration** | Email + password only. No social login. |
| **Two roles** | `reader` (default) and `admin` (owner + developer). |
| **Premium = Book Club** | Premium members are book club subscribers. They get: discussions, events, monthly picks, dealer codes, a KANE's T-shirt, and a special free gift. |
| **Free/Guest users** | Both can browse books and add to cart. Only logged-in users can checkout. Free readers can also read purchased books and customize reader. Guests/Free users cannot access discussions (hidden), events, or book club perks. |
| **Banning** | Banned users keep **all** books in their library (purchased + picks). Lose community access. Subscription auto-cancelled. |
| **Privacy** | Only `display_name` is public (in discussions). All other profile data is private. |
| **Stripe billing** | $49.99 first month → $3.99/month from month 2. No pause—cancel only. |
| **Dealer codes** | Format: `KANE-{NAME}-{PHONE_LAST4}`. 35% off book purchases. Multi-use, multi-person. Tracks usage for dealer credit. |
| **2 free books** | Picked at signup. Stay in library forever even after cancellation. |
| **Monthly pick** | Auto-added to all premium libraries. **Permanent access** (retained after cancellation). |
| **All sales final** | No refunds on book purchases. |
| **No duplicate purchases** | User cannot buy a book they already own. |
| **Content pipeline** | Admin uploads PDF + standard cover image → extraction tool → chapters stored as text + illustrations stored as images. |
| **Illustrations** | Full-page images shown between chapters in the reader. |
| **Highlight/bookmark cap** | 10 highlights + 10 bookmarks per book per user. |
| **Comment editing** | 15-minute edit window. Delete anytime. |
| **Discussions** | Premium-only. Admin creates topics. Admin-only moderation. Hidden from free users. |
| **Events** | No capacity limit. Account required for RSVP. No calendar invites. |
| **Email** | GoHighLevel handles all outbound emails. No in-app notifications. |
| **Genres** | Fixed list, developer-managed. PTP = "Prayers, Thoughts, and Poetry". |
| **Stock** | Admin-managed boolean per variant. Out-of-stock variants (e.g., Paper Book) are visible but disabled for purchase, while other available variants (e.g., ebook) remain purchasable. |
| **Series** | Label on book card (e.g., "Brute Syndicate #3"). No dedicated series page. |

---

## 12. Entity-Relationship Diagram (Text)

```
┌──────────────────┐
│      users        │
│  id (PK)          │
│  display_name     │
│  email            │
│  role             │
│  is_banned        │
│  stripe_customer  │
│  ghl_contact_id   │
└───────┬──────────┘
        │
        ├──── 1:1 ──── user_subscriptions
        │                 ├── stripe_subscription_id
        │                 ├── plan (free/premium)
        │                 └── selected_book_ids[]
        │
        ├──── 1:* ──── promo_codes (as dealer)
        │                 ├── code (KANE-NAME-PHONE)
        │                 └── 1:* ── promo_code_usages
        │                              ├── used_by_user_id
        │                              └── order_id
        │
        ├──── 1:* ──── cart_items ────── books
        │
        ├──── 1:* ──── orders
        │                 ├── promo_code_id (optional FK)
        │                 ├── stripe_payment_intent_id
        │                 └── 1:* ── order_items ── books
        │
        ├──── 1:* ──── user_library ──── books
        │                 ├── source (purchase/signup/monthly)
        │                 └── is_permanent
        │
        ├──── 1:* ──── reading_progress ── books
        ├──── 1:* ──── highlights ──────── books (max 10/book)
        ├──── 1:* ──── bookmarks ───────── books (max 10/book)
        ├──── 1:1 ──── reading_settings
        │
        ├──── 1:* ──── event_rsvps ────── book_club_events
        │
        ├──── 1:* ──── discussion_posts ── discussion_topics
        │                 └── parent_id (self-ref for replies)
        │
        └──── 1:* ──── discussion_votes ── discussion_posts


┌──────────────────┐
│      books        │
│  id (PK)          │
│  title, author    │
│  illustrator      │
│  series_name      │
│  series_order     │
│  is_in_stock      │
│  is_age_restricted│
└───────┬──────────┘
        │
        ├──── 1:* ──── book_chapters
        ├──── 1:* ──── book_illustrations
        ├──── 1:* ──── book_club_selections
        └──── 1:* ──── discussion_topics (optional FK)
```

---

## Appendix: Frontend → Backend Mapping Summary

| Frontend Feature | localStorage Key / Mock File | Backend Table(s) |
|---|---|---|
| Cart | `komet_cart` | `cart_items` |
| Login state | `komet_subscription_active` | `user_subscriptions` |
| Reading progress | `komet_reading_progress_*` | `reading_progress` |
| Highlights | `komet_highlights_*` | `highlights` |
| Bookmarks | `komet_bookmarks_*` | `bookmarks` |
| Reading settings | `komet_reading_settings` | `reading_settings` |
| Book catalog | `mock-books.ts` | `books` |
| Book content | `mock-book-content.ts` | `book_chapters` + `book_illustrations` |
| User library | `mock-user-data.ts` | `user_library` |
| User admin data | `mock-admin-data.ts` | `users` + `user_subscriptions` |
| Book club data | `mock-book-club-data.ts` | `book_club_selections`, `book_club_events`, `discussion_topics` |
| Checkout | In-component state | `orders`, `order_items`, Stripe PaymentIntent |
| RSVP | Simulated API call | `event_rsvps` |
| Discussion votes | In-component state | `discussion_votes` |
| Subscription signup | `subscription-modal.tsx` | `user_subscriptions`, `user_library`, Stripe Subscription |
| Dealer codes | Not yet in frontend | `promo_codes`, `promo_code_usages` |
| Book illustrations | Not yet in frontend | `book_illustrations` |
| Email notifications | Not yet implemented | GoHighLevel webhook/API integration |
