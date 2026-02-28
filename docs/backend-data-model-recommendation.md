# Kane's Komet Book Reader — Backend Data Model (As-Built)

> **Status**: Implemented and deployed  
> **Backend**: Supabase (PostgreSQL 15) — Project `kpafjhkrjipiyfjizyaw`  
> **Payment Provider**: Stripe  
> **Email Provider**: GoHighLevel  
> **Frontend**: Next.js (App Router) — Deployed on Vercel  
> **Last Updated**: February 2026  

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
12. [Migration History](#12-migration-history)

---

## 1. Executive Summary

The Kane's Komet Book Reader is a **digital bookstore + book club platform**.

| Domain | Tables |
|---|---|
| **Users & Auth** | `users`, `user_subscriptions` |
| **Catalog & Content** | `books`, `book_variants`, `book_pages`, `book_illustrations` |
| **Commerce** | `cart_items`, `orders`, `order_items`, `user_library`, `promo_codes`, `promo_code_usages` |
| **Book Club** | `book_club_selections`, `book_club_events`, `event_rsvps` |
| **Community** | `discussion_topics`, `discussion_posts`, `discussion_votes` |
| **Reading Experience** | `reading_progress`, `highlights`, `bookmarks`, `reading_settings` |
| **Admin** | `audit_log` |

**Total: 21 tables**

### Key Business Rules (Implemented)

- **Open registration**: Email + password via Supabase Auth. No social login.
- **Two user tiers**: Free readers and Premium members (book club).
- **Stripe payments**: $49.99 first month via `create-subscription` → $3.99/month recurring via Stripe. Book purchases via `process-checkout`. Fulfilled by `stripe-webhook`.
- **No refunds**: All sales final. `order_status_enum` has no `cancelled` value.
- **GoHighLevel**: All email triggers route through the `email-ops` Edge Function. Contacts synced via `ghl-sync` Edge Function.
- **No Ratings or Reviews**: Completely removed. `rating` field never added.
- **PDF upload**: Admin uploads PDF → `upload-book` Edge Function extracts pages (WebP images), text (for search), and inline illustrations.
- **Book Variants**: `ebook` (digital), `paper_book` (physical), `komet_card` (physical + digital). Komet Card triggers a library entry on fulfillment — currently grants access via webhook for `ebook` format only (Komet Card webhook grant not yet implemented).
- **Shipping**: $5.99 flat-rate for orders with non-ebook items. Ebook-only orders = $0 shipping.
- **Dealer codes**: `KANE-NAME-PHONE` format, 35% off, hybrid DB + Stripe Promotion Code, self-use prevented.
- **Re-subscription**: $49.99 again, 2 new book picks, existing dealer code reactivated.
- **Book Club Eligibility**: `is_book_club_eligible` flag on `books` controls which books appear in the signup modal selector (max 5 shown).
- **Library Sources**: `purchase`, `subscription_signup`, `book_club_monthly`, `admin_gift`.
- **Cascade deletions**: Deleting a book cascades to `order_items`, `user_library`, and `book_club_selections`.
- **Discussion categories**: Extended to include `General`, `Book Club`, `News` in addition to genre-matching categories.

---

## 2. Entity Definitions

### 2.1 `users`

Extends Supabase `auth.users`. This is the application profile table.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `UUID` PK | No | `auth.uid()` | FK → `auth.users.id` ON DELETE CASCADE |
| `email` | `TEXT` | No | — | Unique, from Supabase auth |
| `display_name` | `TEXT` | No | — | Publicly visible in discussions only |
| `full_name` | `TEXT` | No | — | Private — from auth metadata |
| `phone` | `TEXT` | Yes | — | From subscription signup |
| `date_of_birth` | `DATE` | Yes | — | Used for age-gating adult content |
| `mailing_address` | `TEXT` | Yes | — | For physical merch shipment |
| `tshirt_size` | `tshirt_size_enum` | Yes | — | xs–xxxl — Premium perk fulfillment |
| `avatar_url` | `TEXT` | Yes | — | Internal use, not shown to other users |
| `role` | `user_role_enum` | No | `'reader'` | reader, admin |
| `is_banned` | `BOOLEAN` | No | `false` | Auto-cancels subscription on ban |
| `ghl_contact_id` | `TEXT` | Yes | — | GoHighLevel contact ID |
| `stripe_customer_id` | `TEXT` | Yes | — | Stripe Customer ID |
| `created_at` | `TIMESTAMPTZ` | No | `now()` | |
| `updated_at` | `TIMESTAMPTZ` | No | `now()` | Auto-updated by trigger |
| `last_active_at` | `TIMESTAMPTZ` | Yes | — | Updated on user activity |
| `deleted_at` | `TIMESTAMPTZ` | Yes | — | Soft delete |

**Trigger**: `trg_users_updated_at` — auto-updates `updated_at` on every UPDATE.

**User profile creation**: `create_user_profile()` trigger on `auth.users` INSERT automatically creates the `public.users` row using `raw_user_meta_data` for `display_name` and `full_name`. The `ghl-sync` Edge Function is called after signup to create the GHL contact.

---

### 2.2 `books`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `UUID` PK | No | `gen_random_uuid()` | |
| `title` | `TEXT` | No | — | |
| `author` | `TEXT` | No | — | Single author per book |
| `illustrator` | `TEXT` | Yes | — | Public-facing on book detail page |
| `description` | `TEXT` | Yes | — | |
| `genre` | `genre_enum` | No | — | Fixed list |
| `cover_image_url` | `TEXT` | Yes | — | Supabase Storage URL (`book-covers` bucket) |
| `book_file_url` | `TEXT` | Yes | — | Original PDF path (`book-pdfs` bucket) |
| `series_name` | `TEXT` | Yes | — | e.g., "Brute Syndicate" |
| `series_order` | `INTEGER` | Yes | — | e.g., 1, 2, 3 |
| `status` | `book_status_enum` | No | `'draft'` | draft, published |
| `is_age_restricted` | `BOOLEAN` | No | `false` | Requires DOB ≥ 18 check |
| `is_book_club_eligible` | `BOOLEAN` | No | `false` | Controls Book Club signup selector |
| `created_at` | `TIMESTAMPTZ` | No | `now()` | |
| `updated_at` | `TIMESTAMPTZ` | No | `now()` | Auto-updated by trigger |
| `deleted_at` | `TIMESTAMPTZ` | Yes | — | Soft delete |

**Removed**: `rating`, `page_count`, `published_year`, `isbn` — per owner decision.

**Trigger**: `trg_books_updated_at`

---

### 2.3 `book_variants`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `UUID` PK | No | `gen_random_uuid()` | |
| `book_id` | `UUID` FK | No | — | → `books.id` ON DELETE CASCADE |
| `format` | `book_format_enum` | No | — | ebook, paper_book, komet_card |
| `price` | `NUMERIC(10,2)` | No | — | CHECK (price > 0) |
| `is_in_stock` | `BOOLEAN` | No | `true` | "Out of Stock" label when false |
| `created_at` | `TIMESTAMPTZ` | No | `now()` | |
| `updated_at` | `TIMESTAMPTZ` | No | `now()` | Auto-updated by trigger |

**Unique constraint**: `(book_id, format)` — max one of each format per book.

**Trigger**: `trg_book_variants_updated_at`

---

### 2.4 `book_pages`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `UUID` PK | No | `gen_random_uuid()` | |
| `book_id` | `UUID` FK | No | — | → `books.id` ON DELETE CASCADE |
| `page_number` | `INTEGER` | No | — | Corresponds to original PDF page number |
| `page_image_url` | `TEXT` | No | — | Supabase Storage URL (`book-pages` bucket) |
| `content` | `TEXT` | Yes | — | Extracted text — for search indexing only, not displayed |
| `word_count` | `INTEGER` | No | `0` | Computed from `content` on insert |

**Unique constraint**: `(book_id, page_number)`

---

### 2.5 `book_illustrations`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `UUID` PK | No | `gen_random_uuid()` | |
| `book_id` | `UUID` FK | No | — | → `books.id` ON DELETE CASCADE |
| `image_url` | `TEXT` | No | — | Supabase Storage URL (`book-illustrations` bucket) |
| `page_number` | `INTEGER` | No | — | The PDF page this illustration belongs to |
| `position_index` | `INTEGER` | No | `0` | Order within the page (0-based) |
| `caption` | `TEXT` | Yes | — | Optional alt text |
| `width` | `INTEGER` | Yes | — | Original image width in pixels |
| `height` | `INTEGER` | Yes | — | Original image height in pixels |
| `created_at` | `TIMESTAMPTZ` | No | `now()` | |

---

### 2.6 `user_subscriptions`

One subscription per user. Stripe handles recurring billing.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `UUID` PK | No | `gen_random_uuid()` | |
| `user_id` | `UUID` FK | No | — | → `users.id` UNIQUE ON DELETE CASCADE |
| `plan` | `subscription_plan_enum` | No | `'free'` | free, premium |
| `status` | `subscription_status_enum` | No | `'active'` | active, cancelled, expired, past_due |
| `stripe_subscription_id` | `TEXT` | Yes | — | Stripe Subscription ID |
| `initial_fee_paid` | `NUMERIC(10,2)` | Yes | — | $49.99 first month |
| `monthly_rate` | `NUMERIC(10,2)` | Yes | — | $3.99/month from month 2 |
| `selected_book_ids` | `UUID[]` | Yes | — | 2 books chosen at signup |
| `started_at` | `TIMESTAMPTZ` | No | `now()` | |
| `expires_at` | `TIMESTAMPTZ` | Yes | — | |
| `cancelled_at` | `TIMESTAMPTZ` | Yes | — | No pause — cancel only |

---

### 2.7 `promo_codes`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `UUID` PK | No | `gen_random_uuid()` | |
| `owner_id` | `UUID` FK | No | — | → `users.id` (the dealer/premium member) ON DELETE CASCADE |
| `code` | `TEXT` | No | — | UNIQUE. Format: `KANE-{NAME}-{PHONE_LAST4}` |
| `discount_percent` | `INTEGER` | No | `35` | Always 35% |
| `is_active` | `BOOLEAN` | No | `true` | Deactivated on cancel/ban |
| `stripe_promotion_code_id` | `TEXT` | Yes | — | Stripe Promotion Code ID |
| `total_uses` | `INTEGER` | No | `0` | Denormalized counter |
| `created_at` | `TIMESTAMPTZ` | No | `now()` | |

---

### 2.8 `promo_code_usages`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `UUID` PK | No | `gen_random_uuid()` | |
| `promo_code_id` | `UUID` FK | No | — | → `promo_codes.id` ON DELETE CASCADE |
| `used_by_user_id` | `UUID` FK | No | — | → `users.id` ON DELETE CASCADE |
| `order_id` | `UUID` FK | No | — | → `orders.id` ON DELETE CASCADE |
| `discount_amount` | `NUMERIC(10,2)` | No | — | Actual dollar amount saved |
| `used_at` | `TIMESTAMPTZ` | No | `now()` | |

---

### 2.9 `cart_items`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `UUID` PK | No | `gen_random_uuid()` | |
| `user_id` | `UUID` FK | Yes | — | → `users.id` (NULL for guests) ON DELETE CASCADE |
| `session_id` | `TEXT` | Yes | — | Anonymous session ID for guests |
| `book_id` | `UUID` FK | No | — | → `books.id` ON DELETE CASCADE |
| `variant_id` | `UUID` FK | No | — | → `book_variants.id` ON DELETE CASCADE |
| `quantity` | `INTEGER` | No | `1` | CHECK (quantity >= 1) |
| `added_at` | `TIMESTAMPTZ` | No | `now()` | |

**Unique constraint**: `(user_id, book_id, variant_id)`

---

### 2.10 `orders`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `UUID` PK | No | `gen_random_uuid()` | |
| `user_id` | `UUID` FK | No | — | → `users.id` ON DELETE CASCADE |
| `status` | `order_status_enum` | No | `'pending'` | pending, confirmed, fulfilled |
| `subtotal` | `NUMERIC(10,2)` | No | — | Sum of items before discount/tax |
| `discount_amount` | `NUMERIC(10,2)` | No | `0` | 35% from dealer code |
| `shipping_amount` | `NUMERIC(10,2)` | No | `0` | $5.99 if has_physical_items, else $0 |
| `tax_amount` | `NUMERIC(10,2)` | No | — | 5% GST on (subtotal - discount) |
| `total` | `NUMERIC(10,2)` | No | — | subtotal - discount + shipping + tax |
| `has_physical_items` | `BOOLEAN` | No | `false` | Derived at checkout |
| `promo_code_id` | `UUID` FK | Yes | — | → `promo_codes.id` |
| `stripe_payment_intent_id` | `TEXT` | Yes | — | Stripe PaymentIntent ID |
| `shipping_name` | `TEXT` | Yes | — | Required if has_physical_items |
| `shipping_email` | `TEXT` | Yes | — | Required if has_physical_items |
| `shipping_address` | `TEXT` | Yes | — | Required if has_physical_items |
| `shipping_city` | `TEXT` | Yes | — | |
| `shipping_state` | `TEXT` | Yes | — | |
| `shipping_zip` | `TEXT` | Yes | — | |
| `placed_at` | `TIMESTAMPTZ` | No | `now()` | |

---

### 2.11 `order_items`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `UUID` PK | No | `gen_random_uuid()` | |
| `order_id` | `UUID` FK | No | — | → `orders.id` ON DELETE CASCADE |
| `book_id` | `UUID` FK | No | — | → `books.id` ON DELETE CASCADE |
| `variant_id` | `UUID` FK | No | — | → `book_variants.id` ON DELETE RESTRICT |
| `format` | `book_format_enum` | No | — | Snapshot of format at purchase time |
| `quantity` | `INTEGER` | No | — | CHECK (quantity >= 1) |
| `unit_price` | `NUMERIC(10,2)` | No | — | CHECK (unit_price >= 0) |

**Note**: `book_id` was changed to `ON DELETE CASCADE` by migration `20260227200000` to allow admin book deletion without conflict.

---

### 2.12 `user_library`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `UUID` PK | No | `gen_random_uuid()` | |
| `user_id` | `UUID` FK | No | — | → `users.id` ON DELETE CASCADE |
| `book_id` | `UUID` FK | No | — | → `books.id` ON DELETE CASCADE |
| `source` | `library_source_enum` | No | — | purchase, subscription_signup, book_club_monthly, admin_gift |
| `acquired_at` | `TIMESTAMPTZ` | No | `now()` | |

**Unique constraint**: `(user_id, book_id)` — prevents duplicate ownership.

**Digital access sources**: `ebook` purchases AND `komet_card` purchases both add the book to `user_library` (via webhook). Paper Book purchases → `orders` only, no digital access.

---

### 2.13 `reading_progress`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `UUID` PK | No | `gen_random_uuid()` | |
| `user_id` | `UUID` FK | No | — | → `users.id` ON DELETE CASCADE |
| `book_id` | `UUID` FK | No | — | → `books.id` ON DELETE CASCADE |
| `current_page` | `INTEGER` | No | `0` | Corresponds to `book_pages.page_number` |
| `progress_percent` | `NUMERIC(5,2)` | No | `0` | CHECK (0–100) |
| `last_read_at` | `TIMESTAMPTZ` | No | `now()` | |

**Unique constraint**: `(user_id, book_id)`. Client debounces writes to every 5 seconds (reader implementation).

---

### 2.14 `highlights`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `UUID` PK | No | `gen_random_uuid()` | |
| `user_id` | `UUID` FK | No | — | → `users.id` ON DELETE CASCADE |
| `book_id` | `UUID` FK | No | — | → `books.id` ON DELETE CASCADE |
| `page_number` | `INTEGER` | No | — | Corresponds to `book_pages.page_number` |
| `paragraph_index` | `INTEGER` | No | — | Position within the page |
| `text` | `TEXT` | No | — | CHECK (text <> '') |
| `color` | `highlight_color_enum` | No | `'yellow'` | yellow, green, blue, pink |
| `note` | `TEXT` | Yes | — | Optional annotation |
| `created_at` | `TIMESTAMPTZ` | No | `now()` | |

**Cap**: 10 highlights per book per user. Enforced via app-level check before INSERT.

---

### 2.15 `bookmarks`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `UUID` PK | No | `gen_random_uuid()` | |
| `user_id` | `UUID` FK | No | — | → `users.id` ON DELETE CASCADE |
| `book_id` | `UUID` FK | No | — | → `books.id` ON DELETE CASCADE |
| `page_number` | `INTEGER` | No | — | Corresponds to `book_pages.page_number` |
| `label` | `TEXT` | Yes | — | User-defined label |
| `created_at` | `TIMESTAMPTZ` | No | `now()` | |

**Cap**: 10 bookmarks per book per user.

---

### 2.16 `reading_settings`

Since the reader displays **rendered page images** (not re-flowed text), text-formatting settings (font size, font family, line height, text alignment) do **not** apply. Settings are simplified to zoom and theme only.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `UUID` PK | No | `gen_random_uuid()` | |
| `user_id` | `UUID` FK | No | — | → `users.id` UNIQUE ON DELETE CASCADE |
| `zoom` | `INTEGER` | No | `100` | CHECK (zoom IN (75, 100, 125, 150)) |
| `theme` | `reading_theme_enum` | No | `'dark'` | dark, light, sepia |
| `updated_at` | `TIMESTAMPTZ` | No | `now()` | Auto-updated by trigger |

**Removed**: `font_size`, `font_family`, `line_height`, `text_align` — not applicable for page-image rendering.

**Note**: The current reader implementation (`app/read/[id]/page.tsx`) does expose font/display settings in the UI panel (`ReadingSettingsPanel` component). These are stored in `localStorage` via `lib/reading-storage.ts` but are **not** synced to this server-side table. The server-side table only persists zoom and theme.

---

### 2.17 `book_club_selections`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `UUID` PK | No | `gen_random_uuid()` | |
| `book_id` | `UUID` FK | No | — | → `books.id` ON DELETE CASCADE |
| `month` | `TEXT` | No | — | e.g., "January" |
| `year` | `INTEGER` | No | — | e.g., 2026 |
| `theme` | `TEXT` | No | — | e.g., "Cyberpunk Dystopias" |
| `description` | `TEXT` | Yes | — | |
| `status` | `selection_status_enum` | No | `'upcoming'` | current, upcoming, past |
| `discussion_date` | `DATE` | Yes | — | |
| `created_at` | `TIMESTAMPTZ` | No | `now()` | |
| `updated_at` | `TIMESTAMPTZ` | No | `now()` | Auto-updated by trigger |

**Unique constraint**: `(month, year)` — one selection per month.

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
| `updated_at` | `TIMESTAMPTZ` | No | `now()` | Auto-updated by trigger |

---

### 2.19 `event_rsvps`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `UUID` PK | No | `gen_random_uuid()` | |
| `event_id` | `UUID` FK | No | — | → `book_club_events.id` ON DELETE CASCADE |
| `user_id` | `UUID` FK | No | — | → `users.id` ON DELETE CASCADE |
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
| `category` | `discussion_category_enum` | No | `'General'` | General, Book Club, News, or any genre |
| `book_id` | `UUID` FK | Yes | — | → `books.id` (optional link) |
| `is_pinned` | `BOOLEAN` | No | `false` | |
| `is_featured` | `BOOLEAN` | No | `false` | |
| `post_count` | `INTEGER` | No | `0` | Denormalized |
| `member_count` | `INTEGER` | No | `0` | Denormalized |
| `last_activity_at` | `TIMESTAMPTZ` | Yes | — | |
| `created_at` | `TIMESTAMPTZ` | No | `now()` | |
| `updated_at` | `TIMESTAMPTZ` | No | `now()` | Auto-updated by trigger |
| `deleted_at` | `TIMESTAMPTZ` | Yes | — | Soft delete |

---

### 2.21 `discussion_posts`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `UUID` PK | No | `gen_random_uuid()` | |
| `topic_id` | `UUID` FK | No | — | → `discussion_topics.id` ON DELETE CASCADE |
| `parent_id` | `UUID` FK | Yes | — | → `discussion_posts.id` (null = top-level) |
| `author_id` | `UUID` FK | No | — | → `users.id` ON DELETE CASCADE |
| `content` | `TEXT` | No | — | |
| `likes` | `INTEGER` | No | `0` | Denormalized net vote count |
| `created_at` | `TIMESTAMPTZ` | No | `now()` | |
| `updated_at` | `TIMESTAMPTZ` | No | `now()` | Auto-updated by trigger |
| `deleted_at` | `TIMESTAMPTZ` | Yes | — | Soft delete |

---

### 2.22 `discussion_votes`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `UUID` PK | No | `gen_random_uuid()` | |
| `post_id` | `UUID` FK | No | — | → `discussion_posts.id` ON DELETE CASCADE |
| `user_id` | `UUID` FK | No | — | → `users.id` ON DELETE CASCADE |
| `vote_type` | `vote_type_enum` | No | — | up, down |
| `created_at` | `TIMESTAMPTZ` | No | `now()` | |

**Unique constraint**: `(post_id, user_id)` — one vote per user per post.

---

### 2.23 `audit_log`

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID` PK | |
| `actor_id` | `UUID` FK | Admin who performed action → `users.id` |
| `action` | `TEXT` | e.g., `ban_user`, `delete_book` |
| `target_table` | `TEXT` | e.g., `users`, `books` |
| `target_id` | `UUID` | The record affected |
| `metadata` | `JSONB` | Additional context |
| `created_at` | `TIMESTAMPTZ` | When the action occurred |

---

## 3. Enums & Constants

```sql
-- User & Auth
CREATE TYPE user_role_enum AS ENUM ('reader', 'admin');
CREATE TYPE tshirt_size_enum AS ENUM ('xs', 's', 'm', 'l', 'xl', 'xxl', 'xxxl');

-- Subscription
CREATE TYPE subscription_plan_enum AS ENUM ('free', 'premium');
CREATE TYPE subscription_status_enum AS ENUM ('active', 'cancelled', 'expired', 'past_due');

-- Books (PTP = "Prayers, Thoughts, and Poetry")
CREATE TYPE genre_enum AS ENUM ('Crime', 'Children', 'PTP', 'Spiritual', 'Adult', 'Sports', 'Self-Help', 'Cooking');
CREATE TYPE book_status_enum AS ENUM ('draft', 'published');
CREATE TYPE book_format_enum AS ENUM ('ebook', 'paper_book', 'komet_card');

-- Commerce (no 'cancelled' — all sales final)
CREATE TYPE order_status_enum AS ENUM ('pending', 'confirmed', 'fulfilled');
CREATE TYPE library_source_enum AS ENUM ('purchase', 'subscription_signup', 'book_club_monthly');
-- Note: 'admin_gift' added via migration 20260223110000

-- Reading
CREATE TYPE highlight_color_enum AS ENUM ('yellow', 'green', 'blue', 'pink');
CREATE TYPE reading_theme_enum AS ENUM ('dark', 'light', 'sepia');

-- Book Club
CREATE TYPE selection_status_enum AS ENUM ('current', 'upcoming', 'past');
CREATE TYPE event_type_enum AS ENUM ('virtual', 'in_person');
CREATE TYPE event_status_enum AS ENUM ('upcoming', 'past', 'cancelled');
CREATE TYPE rsvp_status_enum AS ENUM ('confirmed', 'cancelled');

-- Community (includes General/Book Club/News + genre-matching categories)
CREATE TYPE discussion_category_enum AS ENUM (
  'General', 'Book Club', 'News',
  'Crime', 'Children', 'PTP', 'Spiritual', 'Adult', 'Sports', 'Self-Help', 'Cooking'
);
CREATE TYPE vote_type_enum AS ENUM ('up', 'down');
```

---

## 4. Relationships & Foreign Keys

```
users 1 ──── 1 user_subscriptions   (UNIQUE user_id)
users 1 ──── 1 reading_settings     (UNIQUE user_id)
users 1 ──── * promo_codes          (as owner/dealer; CASCADE on user delete)
users 1 ──── * cart_items           (CASCADE on user delete)
users 1 ──── * orders               (CASCADE on user delete)
users 1 ──── * user_library         (CASCADE on user delete)
users 1 ──── * reading_progress     (CASCADE on user delete)
users 1 ──── * highlights           (CASCADE on user delete)
users 1 ──── * bookmarks            (CASCADE on user delete)
users 1 ──── * event_rsvps          (CASCADE on user delete)
users 1 ──── * discussion_posts     (CASCADE on user delete)
users 1 ──── * discussion_votes     (CASCADE on user delete)
users 1 ──── * promo_code_usages    (as buyer; CASCADE on user delete)

books 1 ──── * book_variants        (CASCADE on book delete)
books 1 ──── * book_pages           (CASCADE on book delete)
books 1 ──── * book_illustrations   (CASCADE on book delete)
books 1 ──── * user_library         (CASCADE on book delete — added by migration 20260227200000)
books 1 ──── * reading_progress     (CASCADE on book delete)
books 1 ──── * highlights           (CASCADE on book delete)
books 1 ──── * bookmarks            (CASCADE on book delete)
books 1 ──── * book_club_selections (CASCADE on book delete — added by migration 20260227200000)
books 1 ──── * order_items          (CASCADE on book delete — added by migration 20260227200000)
books 1 ──── * discussion_topics    (optional FK)
books 1 ──── * cart_items           (CASCADE on book delete)

book_variants 1 ──── * cart_items   (CASCADE on variant delete)
book_variants 1 ──── * order_items  (RESTRICT on variant delete)

orders 1 ──── * order_items         (CASCADE on order delete)
orders * ──── 1 promo_codes         (optional)

promo_codes 1 ──── * promo_code_usages (CASCADE on code delete)

book_club_events 1 ──── * event_rsvps (CASCADE on event delete)

discussion_topics 1 ──── * discussion_posts (CASCADE on topic delete)
discussion_posts 1 ──── * discussion_posts  (self-ref: replies; parent_id)
discussion_posts 1 ──── * discussion_votes  (CASCADE on post delete)
```

---

## 5. Indexes

| Table | Index | Type | Rationale |
|---|---|---|---|
| `users` | `(role)` | B-tree | Admin user filtering |
| `users` | `(email)` | Unique | Login lookup |
| `users` | `(stripe_customer_id)` | B-tree | Stripe webhook handling |
| `books` | `(genre, status)` | B-tree | Browse page genre filter |
| `books` | `(series_name, series_order)` | B-tree | Series label & ordering |
| `books` | `GIN(to_tsvector(title + author))` | Full-text | Search bar |
| `books` | `(is_book_club_eligible)` WHERE true | Partial B-tree | Book Club selector modal |
| `book_variants` | `(book_id, format)` | Unique | One format per book |
| `book_variants` | `(book_id, is_in_stock)` | B-tree | Filter available variants |
| `book_pages` | `(book_id, page_number)` | Unique + B-tree | Ordered page loading |
| `book_illustrations` | `(book_id, page_number, position_index)` | B-tree | Inline illustration loading |
| `cart_items` | `(user_id)` | B-tree | Cart retrieval |
| `cart_items` | `(user_id, book_id, variant_id)` | Unique | Prevent duplicate items |
| `orders` | `(user_id, placed_at DESC)` | B-tree | Order history |
| `user_library` | `(user_id)` | B-tree | Dashboard library |
| `user_library` | `(user_id, book_id)` | Unique | Prevent duplicate ownership |
| `reading_progress` | `(user_id, book_id)` | Unique | Fast lookup + cross-device sync |
| `highlights` | `(user_id, book_id)` | B-tree | Reader sidebar |
| `bookmarks` | `(user_id, book_id)` | B-tree | Reader sidebar |
| `book_club_selections` | `(status)` | B-tree | Current selection lookup |
| `book_club_events` | `(status, date)` | B-tree | Events listing |
| `discussion_topics` | `(is_pinned DESC, last_activity_at DESC)` | B-tree | Sorted topic list |
| `discussion_posts` | `(topic_id, created_at)` | B-tree | Thread loading |
| `discussion_votes` | `(post_id, user_id)` | Unique | Vote dedup |
| `promo_codes` | `(code)` | Unique | Code lookup at checkout |
| `promo_codes` | `(owner_id)` | B-tree | Find dealer's code |
| `promo_code_usages` | `(promo_code_id)` | B-tree | Usage tracking |

---

## 6. Derived / Computed Fields

| Field | Computation | Strategy |
|---|---|---|
| `book_club_events.attendee_count` | COUNT confirmed RSVPs | Trigger on `event_rsvps` INSERT/UPDATE/DELETE |
| `discussion_topics.post_count` | COUNT posts for topic | Trigger on `discussion_posts` INSERT/DELETE |
| `discussion_topics.member_count` | COUNT DISTINCT author_id | Trigger or app-level |
| `discussion_posts.likes` | SUM(up votes) - SUM(down votes) | Trigger on `discussion_votes` change |
| `promo_codes.total_uses` | COUNT usages | Trigger on `promo_code_usages` INSERT |
| `orders.subtotal` | SUM(unit_price * quantity) | Computed at order creation in `process-checkout` |
| `orders.discount_amount` | subtotal * (discount_percent / 100) | Computed at order creation |
| `orders.shipping_amount` | $5.99 if any non-ebook item, else $0 | Computed at order creation |
| `orders.tax_amount` | (subtotal - discount) * 0.05 | Computed at order creation |
| `orders.total` | subtotal - discount + shipping + tax | Computed at order creation |
| `book_pages.word_count` | Word count of `content` | Computed on insert |

---

## 7. Validation Rules

| Entity | Rule | Implementation |
|---|---|---|
| `book_variants.price` | Must be > 0 | CHECK constraint |
| `cart_items.quantity` | Must be ≥ 1 | CHECK constraint |
| `order_items.quantity` | Must be ≥ 1 | CHECK constraint |
| `order_items.unit_price` | Must be ≥ 0 | CHECK constraint |
| `reading_progress.progress_percent` | Must be 0–100 | CHECK constraint |
| `reading_settings.zoom` | Must be one of: 75, 100, 125, 150 | CHECK constraint |
| `highlights.text` | Must not be empty | CHECK constraint |
| `highlights` | Max 10 per (user_id, book_id) | App-level check before INSERT |
| `bookmarks` | Max 10 per (user_id, book_id) | App-level check before INSERT |
| `user_subscriptions.selected_book_ids` | Array length = 2 (when premium) | App-level |
| `book_club_selections` | Only one `status = 'current'` | App-level or trigger |
| `users.email` | Valid email format | Supabase Auth handles this |
| `users.date_of_birth` | Required to access `is_age_restricted` books | App-level |
| `event_rsvps` | One RSVP per user per event | UNIQUE constraint `(event_id, user_id)` |
| `cart_items` | Cannot add ebook already in `user_library` | App-level check |
| `discussion_posts` (edit) | Within 15 minutes of `created_at` | Edge Function |
| `discussion_posts` (create) | Active premium subscription required | Edge Function |
| `promo_codes` (self-use) | `used_by_user_id ≠ owner_id` | Edge Function check in `process-checkout` |
| `promo_codes.code` | Must be globally unique | UNIQUE constraint |

---

## 8. Permission Boundaries (RLS)

All tables have Row-Level Security enabled (migration `20260221000001_rls_policies.sql` + `20260221100000_reading_rls_policies.sql`).

### Guest (unauthenticated)
| Table | Access |
|---|---|
| `books` | SELECT published only |
| `book_club_selections` | SELECT all |
| `book_club_events` | SELECT where `is_public = true` |
| `cart_items` | Session-based SELECT/INSERT/UPDATE/DELETE |
| All others | No access |

### Free Reader (authenticated, role = 'reader')
| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `users` | Own row | — | Own row | — |
| `books` | Published only | — | — | — |
| `book_pages` | Own library only | — | — | — |
| `book_illustrations` | Own library only | — | — | — |
| `cart_items` | Own rows | Own rows | Own rows | Own rows |
| `orders` | Own rows | Own rows | — | — |
| `order_items` | Own orders' items | — | — | — |
| `user_library` | Own rows | — | — | — |
| `reading_progress` | Own rows | Own rows | Own rows | — |
| `highlights` | Own rows | Own rows | Own rows | Own rows |
| `bookmarks` | Own rows | Own rows | Own rows | Own rows |
| `reading_settings` | Own row | Own row | Own row | — |
| `user_subscriptions` | Own row | — | — | — |
| `promo_codes` | Own code | — | — | — |
| `book_club_selections` | All | — | — | — |
| `book_club_events` | Public only | — | — | — |
| `event_rsvps` | Own rows | Public events only | Own rows | Own rows |
| `discussion_topics` | **None** | — | — | — |
| `discussion_posts` | **None** | — | — | — |

### Premium Member (authenticated, active subscription)
All of the above, **plus**:
| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `book_club_events` | All (public + private) | — | — | — |
| `event_rsvps` | Own rows | All events | Own rows | Own rows |
| `discussion_topics` | All non-deleted | — | — | — |
| `discussion_posts` | All non-deleted | Own rows | Own rows (15-min window) | Own rows (soft) |
| `discussion_votes` | Own rows | Own rows | Own rows | Own rows |

### Banned User
| Table | Access |
|---|---|
| `books` | SELECT published only |
| `book_pages` | SELECT for own library |
| `book_illustrations` | SELECT for own library |
| `user_library` | SELECT own rows |
| `reading_progress` | SELECT/INSERT/UPDATE own rows |
| `highlights` | SELECT/INSERT/UPDATE/DELETE own rows |
| `bookmarks` | SELECT/INSERT/UPDATE/DELETE own rows |
| `reading_settings` | SELECT/UPDATE own row |
| Everything else | **NO ACCESS** |

### Admin (role = 'admin')
Full CRUD on all tables. No RLS restrictions. Admin panel routes protected by `lib/supabase/middleware.ts`.

---

## 9. Audit & Soft Delete

### `updated_at` Auto-Update Trigger

```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

Applied to: `users`, `books`, `book_variants`, `reading_settings`, `book_club_selections`, `book_club_events`, `discussion_topics`, `discussion_posts`.

### Soft Delete

Applied to: `users`, `books`, `discussion_topics`, `discussion_posts`

```sql
deleted_at  TIMESTAMPTZ  -- NULL = active, non-NULL = soft-deleted
```

All RLS policies include `WHERE deleted_at IS NULL` filters.

### Cascade Delete (Books — Hard)

Migration `20260227200000` changed `order_items.book_id`, `user_library.book_id`, and `book_club_selections.book_id` to `ON DELETE CASCADE`. This allows admin book deletion without 409 Conflict errors.

---

## 10. Scalability Considerations

| Design Choice | Rationale |
|---|---|
| **Page images** | Loads one rendered WebP image per page; no full-book loading |
| **Illustrations as separate records** | Loaded on-demand |
| **Debounced reading progress** | Client debounces to 5-second intervals |
| **Denormalized counters** | Post counts, vote totals, attendee counts updated via triggers |
| **`is_book_club_eligible` partial index** | Fast, targeted query for signup modal |
| **Full-text search GIN index** | Instant book title/author search |
| **Cascade deletions** | Clean admin book removal without orphaned records |
| **Stripe + GoHighLevel** | Offloads payment + email complexity to specialized services |

---

## 11. Business Rules Summary

| Rule | Enforcement |
|---|---|
| One ebook format per book in library | UNIQUE `(user_id, book_id)` on `user_library` |
| No re-purchasing an ebook already owned | App-level check in `process-checkout` |
| No self-use of own dealer code | App-level check in `process-checkout` |
| All sales final | No `cancelled` in `order_status_enum` |
| Premium-only discussions | RLS on `discussion_topics` and `discussion_posts` |
| Exactly 2 books at signup | App-level validation in subscription modal |
| Books kept forever after cancellation/ban | `user_library` entries never deleted by business logic |
| Cascade cleanup on book admin-delete | DB-level `ON DELETE CASCADE` |

---

## 12. Migration History

| Migration | Date | Purpose |
|---|---|---|
| `20260221000000_initial_schema.sql` | 2026-02-21 | Full initial schema: all 20 tables, enums, triggers, indexes |
| `20260221000001_rls_policies.sql` | 2026-02-21 | Row-Level Security policies for all tables |
| `20260221000002_user_sync_trigger.sql` | 2026-02-21 | Trigger to auto-create `public.users` on Supabase Auth signup |
| `20260221100000_reading_rls_policies.sql` | 2026-02-21 | Additional RLS policies for reading experience tables |
| `20260221200000_storage_buckets.sql` | 2026-02-21 | Supabase Storage bucket creation + access policies |
| `20260222161000_fix_user_sync_metadata.sql` | 2026-02-22 | Fixed user sync trigger to correctly read auth metadata |
| `20260223101000_add_book_club_eligibility.sql` | 2026-02-23 | Added `is_book_club_eligible` boolean + partial index to `books` |
| `20260223110000_add_library_source_gift.sql` | 2026-02-23 | Added `admin_gift` value to `library_source_enum` |
| `20260227200000_cascade_book_deletion.sql` | 2026-02-27 | Changed FK constraints on `order_items`, `user_library`, `book_club_selections` to `ON DELETE CASCADE` |
