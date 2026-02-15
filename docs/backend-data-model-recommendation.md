# Kane's Komet Book Reader — Backend Data Model Recommendation

> **Generated from**: Full frontend codebase analysis  
> **Target Backend**: Supabase (PostgreSQL + Edge Functions)  
> **Date**: February 2026

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
11. [Open Questions & Risks](#11-open-questions--risks)
12. [Entity-Relationship Diagram (Text)](#12-entity-relationship-diagram-text)

---

## 1. Executive Summary

The Kane's Komet Book Reader frontend surfaces **12 core entities** across five major feature domains:

| Domain | Entities |
|---|---|
| **Catalog & Commerce** | `Book`, `Order`, `OrderItem`, `CartItem` |
| **Users & Auth** | `User`, `UserSubscription` |
| **Book Club** | `BookClubSelection`, `BookClubEvent`, `EventRsvp` |
| **Community** | `DiscussionTopic`, `DiscussionPost` (comments/replies) |
| **Reading Experience** | `ReadingProgress`, `Highlight`, `Bookmark`, `ReadingSettings` |

The frontend currently uses **localStorage** for cart, reading progress, highlights, bookmarks, and settings. The backend must absorb all of these to enable cross-device sync and data durability.

---

## 2. Entity Definitions

### 2.1 `users`

Extends Supabase `auth.users`. This is the application profile table.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `UUID` PK | No | `auth.uid()` | FK → `auth.users.id` |
| `email` | `TEXT` | No | — | Unique, from auth |
| `name` | `TEXT` | No | — | Display name |
| `phone` | `TEXT` | Yes | — | From subscription signup |
| `date_of_birth` | `DATE` | Yes | — | Used for age-gating content |
| `mailing_address` | `TEXT` | Yes | — | For physical merch shipment |
| `tshirt_size` | `tshirt_size_enum` | Yes | — | xs, s, m, l, xl, xxl, xxxl |
| `avatar_url` | `TEXT` | Yes | — | Profile image |
| `role` | `user_role_enum` | No | `'reader'` | reader, admin |
| `is_banned` | `BOOLEAN` | No | `false` | Admin can ban users |
| `created_at` | `TIMESTAMPTZ` | No | `now()` | |
| `updated_at` | `TIMESTAMPTZ` | No | `now()` | |
| `last_active_at` | `TIMESTAMPTZ` | Yes | — | Updated on activity |
| `deleted_at` | `TIMESTAMPTZ` | Yes | — | Soft delete |

**Source**: `login/page.tsx`, `subscription-modal.tsx`, `admin/users/page.tsx`, `mock-admin-data.ts`, `mock-user-data.ts`

---

### 2.2 `books`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `UUID` PK | No | `gen_random_uuid()` | |
| `title` | `TEXT` | No | — | |
| `author` | `TEXT` | No | — | |
| `isbn` | `TEXT` | Yes | — | Displayed in admin catalog |
| `description` | `TEXT` | Yes | — | |
| `price` | `NUMERIC(10,2)` | No | — | |
| `genre` | `genre_enum` | No | — | |
| `cover_image_url` | `TEXT` | Yes | — | |
| `book_file_url` | `TEXT` | Yes | — | PDF/ePub storage path |
| `rating` | `NUMERIC(2,1)` | No | `0.0` | Aggregate or editorial |
| `page_count` | `INTEGER` | No | `0` | |
| `published_year` | `INTEGER` | Yes | — | |
| `series_name` | `TEXT` | Yes | — | From upload form |
| `status` | `book_status_enum` | No | `'draft'` | draft, published |
| `is_age_restricted` | `BOOLEAN` | No | `false` | Age-gate check |
| `created_at` | `TIMESTAMPTZ` | No | `now()` | |
| `updated_at` | `TIMESTAMPTZ` | No | `now()` | |
| `deleted_at` | `TIMESTAMPTZ` | Yes | — | Soft delete |

**Source**: `mock-books.ts`, `admin/books/page.tsx`, `admin/upload/page.tsx`, `book-card.tsx`, `browse/page.tsx`

---

### 2.3 `book_chapters`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `UUID` PK | No | `gen_random_uuid()` | |
| `book_id` | `UUID` FK | No | — | → `books.id` |
| `chapter_number` | `INTEGER` | No | — | |
| `title` | `TEXT` | No | — | |
| `content` | `TEXT` | No | — | Full chapter text |
| `word_count` | `INTEGER` | No | `0` | Derived on insert |

**Source**: `mock-book-content.ts`, `read/[id]/page.tsx`

---

### 2.4 `user_subscriptions`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `UUID` PK | No | `gen_random_uuid()` | |
| `user_id` | `UUID` FK | No | — | → `users.id`, UNIQUE |
| `plan` | `subscription_plan_enum` | No | `'free'` | free, premium |
| `status` | `subscription_status_enum` | No | `'active'` | active, cancelled, expired, past_due |
| `initial_fee_paid` | `NUMERIC(10,2)` | Yes | — | $49.99 one-time |
| `monthly_rate` | `NUMERIC(10,2)` | Yes | — | $3.99/mo |
| `selected_book_ids` | `UUID[]` | Yes | — | 2 books chosen at signup |
| `dealer_code` | `TEXT` | Yes | — | 35% OFF code |
| `started_at` | `TIMESTAMPTZ` | No | `now()` | |
| `expires_at` | `TIMESTAMPTZ` | Yes | — | |
| `cancelled_at` | `TIMESTAMPTZ` | Yes | — | |

**Source**: `subscription-modal.tsx`, `admin/users/page.tsx`, `site-header.tsx`, `book-club/page.tsx`

---

### 2.5 `cart_items`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `UUID` PK | No | `gen_random_uuid()` | |
| `user_id` | `UUID` FK | No | — | → `users.id` |
| `book_id` | `UUID` FK | No | — | → `books.id` |
| `quantity` | `INTEGER` | No | `1` | |
| `added_at` | `TIMESTAMPTZ` | No | `now()` | |

**Unique constraint**: `(user_id, book_id)`

**Source**: `cart-context.tsx`, `cart/page.tsx`

---

### 2.6 `orders`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `UUID` PK | No | `gen_random_uuid()` | |
| `user_id` | `UUID` FK | No | — | → `users.id` |
| `status` | `order_status_enum` | No | `'pending'` | pending, confirmed, fulfilled, cancelled |
| `subtotal` | `NUMERIC(10,2)` | No | — | |
| `tax_amount` | `NUMERIC(10,2)` | No | — | GST 5% |
| `total` | `NUMERIC(10,2)` | No | — | |
| `shipping_name` | `TEXT` | Yes | — | |
| `shipping_email` | `TEXT` | Yes | — | |
| `shipping_address` | `TEXT` | Yes | — | |
| `shipping_city` | `TEXT` | Yes | — | |
| `shipping_state` | `TEXT` | Yes | — | |
| `shipping_zip` | `TEXT` | Yes | — | |
| `payment_method` | `TEXT` | Yes | — | e.g. "Visa ending 4242" |
| `placed_at` | `TIMESTAMPTZ` | No | `now()` | |

**Source**: `checkout/page.tsx`, `cart/page.tsx`

---

### 2.7 `order_items`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `UUID` PK | No | `gen_random_uuid()` | |
| `order_id` | `UUID` FK | No | — | → `orders.id` |
| `book_id` | `UUID` FK | No | — | → `books.id` |
| `quantity` | `INTEGER` | No | — | |
| `unit_price` | `NUMERIC(10,2)` | No | — | Price at time of purchase |

**Source**: `checkout/page.tsx`

---

### 2.8 `user_library`

Tracks which books a user owns/has access to.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `UUID` PK | No | `gen_random_uuid()` | |
| `user_id` | `UUID` FK | No | — | → `users.id` |
| `book_id` | `UUID` FK | No | — | → `books.id` |
| `source` | `library_source_enum` | No | — | purchase, subscription, book_club |
| `acquired_at` | `TIMESTAMPTZ` | No | `now()` | |

**Unique constraint**: `(user_id, book_id)`

**Source**: `dashboard/page.tsx`, `mock-user-data.ts`

---

### 2.9 `reading_progress`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `UUID` PK | No | `gen_random_uuid()` | |
| `user_id` | `UUID` FK | No | — | → `users.id` |
| `book_id` | `UUID` FK | No | — | → `books.id` |
| `current_chapter` | `INTEGER` | No | `0` | |
| `progress_percent` | `NUMERIC(5,2)` | No | `0` | 0–100 |
| `last_read_at` | `TIMESTAMPTZ` | No | `now()` | |

**Unique constraint**: `(user_id, book_id)`

**Source**: `reading-storage.ts`, `read/[id]/page.tsx`, `mock-book-content.ts`

---

### 2.10 `highlights`

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

**Source**: `mock-book-content.ts`, `read/[id]/page.tsx`, `reading-sidebar.tsx`

---

### 2.11 `bookmarks`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `UUID` PK | No | `gen_random_uuid()` | |
| `user_id` | `UUID` FK | No | — | → `users.id` |
| `book_id` | `UUID` FK | No | — | → `books.id` |
| `chapter_index` | `INTEGER` | No | — | |
| `paragraph_index` | `INTEGER` | No | — | |
| `label` | `TEXT` | Yes | — | User-defined label |
| `created_at` | `TIMESTAMPTZ` | No | `now()` | |

**Source**: `mock-book-content.ts`, `read/[id]/page.tsx`, `reading-sidebar.tsx`

---

### 2.12 `reading_settings`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `UUID` PK | No | `gen_random_uuid()` | |
| `user_id` | `UUID` FK | No | — | → `users.id`, UNIQUE |
| `font_size` | `INTEGER` | No | `18` | px |
| `font_family` | `TEXT` | No | `'Georgia'` | |
| `theme` | `reading_theme_enum` | No | `'dark'` | dark, light, sepia |
| `line_height` | `NUMERIC(3,1)` | No | `1.8` | |
| `updated_at` | `TIMESTAMPTZ` | No | `now()` | |

**Source**: `reading-storage.ts`, `reading-settings-panel.tsx`

---

### 2.13 `book_club_selections`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `UUID` PK | No | `gen_random_uuid()` | |
| `book_id` | `UUID` FK | No | — | → `books.id` |
| `month` | `TEXT` | No | — | e.g. "January" |
| `year` | `INTEGER` | No | — | e.g. 2025 |
| `theme` | `TEXT` | No | — | e.g. "Cyberpunk Dystopias" |
| `description` | `TEXT` | Yes | — | |
| `status` | `selection_status_enum` | No | `'upcoming'` | current, upcoming, past |
| `discussion_date` | `DATE` | Yes | — | |
| `created_at` | `TIMESTAMPTZ` | No | `now()` | |
| `updated_at` | `TIMESTAMPTZ` | No | `now()` | |

**Unique constraint**: `(month, year)` — one selection per month

**Source**: `mock-book-club-data.ts`, `book-club/page.tsx`, `admin/book-club/page.tsx`, `book-club-selection-card.tsx`

---

### 2.14 `book_club_events`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `UUID` PK | No | `gen_random_uuid()` | |
| `title` | `TEXT` | No | — | |
| `description` | `TEXT` | Yes | — | |
| `date` | `DATE` | No | — | |
| `time` | `TEXT` | No | — | e.g. "7:00 PM EST" |
| `location` | `TEXT` | No | — | URL or physical address |
| `type` | `event_type_enum` | No | — | virtual, in_person |
| `cover_image_url` | `TEXT` | Yes | — | |
| `is_public` | `BOOLEAN` | No | `true` | Visible to non-members? |
| `status` | `event_status_enum` | No | `'upcoming'` | upcoming, past, cancelled |
| `attendee_count` | `INTEGER` | No | `0` | Denormalized counter |
| `created_at` | `TIMESTAMPTZ` | No | `now()` | |
| `updated_at` | `TIMESTAMPTZ` | No | `now()` | |

**Source**: `mock-book-club-data.ts`, `book-club/events/page.tsx`, `admin/events/page.tsx`

---

### 2.15 `event_rsvps`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `UUID` PK | No | `gen_random_uuid()` | |
| `event_id` | `UUID` FK | No | — | → `book_club_events.id` |
| `user_id` | `UUID` FK | Yes | — | → `users.id` (null if guest) |
| `name` | `TEXT` | No | — | |
| `email` | `TEXT` | No | — | |
| `phone` | `TEXT` | Yes | — | |
| `rsvp_status` | `rsvp_status_enum` | No | `'confirmed'` | confirmed, cancelled |
| `created_at` | `TIMESTAMPTZ` | No | `now()` | |

**Unique constraint**: `(event_id, email)`

**Source**: `book-club/events/rsvp-modal.tsx`

---

### 2.16 `discussion_topics`

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

**Source**: `mock-book-club-data.ts`, `book-club/discussions/page.tsx`, `admin/discussions/page.tsx`

---

### 2.17 `discussion_posts`

Supports threaded comments (self-referencing `parent_id`).

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `UUID` PK | No | `gen_random_uuid()` | |
| `topic_id` | `UUID` FK | No | — | → `discussion_topics.id` |
| `parent_id` | `UUID` FK | Yes | — | → `discussion_posts.id` (null = top-level) |
| `author_id` | `UUID` FK | No | — | → `users.id` |
| `content` | `TEXT` | No | — | |
| `likes` | `INTEGER` | No | `0` | Denormalized |
| `created_at` | `TIMESTAMPTZ` | No | `now()` | |
| `updated_at` | `TIMESTAMPTZ` | No | `now()` | |
| `deleted_at` | `TIMESTAMPTZ` | Yes | — | Soft delete |

**Source**: `discussion-thread-client.tsx`

---

### 2.18 `discussion_votes`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `UUID` PK | No | `gen_random_uuid()` | |
| `post_id` | `UUID` FK | No | — | → `discussion_posts.id` |
| `user_id` | `UUID` FK | No | — | → `users.id` |
| `vote_type` | `vote_type_enum` | No | — | up, down |
| `created_at` | `TIMESTAMPTZ` | No | `now()` | |

**Unique constraint**: `(post_id, user_id)` — one vote per user per post

**Source**: `discussion-thread-client.tsx`

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
CREATE TYPE genre_enum AS ENUM ('Crime', 'Children', 'PTP', 'Spiritual', 'Adult', 'Sports', 'Self-Help', 'Cooking');
CREATE TYPE book_status_enum AS ENUM ('draft', 'published');

-- Commerce
CREATE TYPE order_status_enum AS ENUM ('pending', 'confirmed', 'fulfilled', 'cancelled');
CREATE TYPE library_source_enum AS ENUM ('purchase', 'subscription', 'book_club');

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

---

## 4. Relationships & Foreign Keys

```
users 1 ──── * cart_items
users 1 ──── * orders
users 1 ──── * user_library
users 1 ──── 1 user_subscriptions
users 1 ──── * reading_progress
users 1 ──── * highlights
users 1 ──── * bookmarks
users 1 ──── 1 reading_settings
users 1 ──── * event_rsvps
users 1 ──── * discussion_posts
users 1 ──── * discussion_votes

books 1 ──── * book_chapters
books 1 ──── * cart_items
books 1 ──── * order_items
books 1 ──── * user_library
books 1 ──── * reading_progress
books 1 ──── * highlights
books 1 ──── * bookmarks
books 1 ──── * book_club_selections
books 1 ──── * discussion_topics (optional)

orders 1 ──── * order_items

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
| `books` | `(rating DESC)` | B-tree | "Rating" sort |
| `books` | `(price)` | B-tree | Price sort |
| `books` | `GIN(to_tsvector(title \|\| author))` | Full-text | Search bar |
| `cart_items` | `(user_id)` | B-tree | Cart retrieval |
| `orders` | `(user_id, placed_at DESC)` | B-tree | Order history |
| `user_library` | `(user_id)` | B-tree | Dashboard library |
| `reading_progress` | `(user_id, book_id)` | Unique | Fast lookup |
| `highlights` | `(user_id, book_id)` | B-tree | Reader sidebar |
| `bookmarks` | `(user_id, book_id)` | B-tree | Reader sidebar |
| `book_club_selections` | `(status)` | B-tree | Current selection lookup |
| `book_club_events` | `(status, date)` | B-tree | Events listing |
| `discussion_topics` | `(is_pinned DESC, last_activity_at DESC)` | B-tree | Sorted topic list |
| `discussion_posts` | `(topic_id, created_at)` | B-tree | Thread loading |
| `discussion_votes` | `(post_id, user_id)` | Unique | Vote dedup |
| `users` | `(role)` | B-tree | Admin user filtering |
| `users` | `(email)` | Unique | Login lookup |

---

## 6. Derived / Computed Fields

| Field | Computation | Strategy |
|---|---|---|
| `books.rating` | AVG of future `book_reviews.rating` | Trigger or periodic job |
| `book_club_events.attendee_count` | COUNT of `event_rsvps` WHERE `rsvp_status = 'confirmed'` | Trigger on insert/delete |
| `discussion_topics.post_count` | COUNT of `discussion_posts` for topic | Trigger on insert/delete |
| `discussion_topics.member_count` | COUNT DISTINCT `author_id` in posts | Trigger or materialized view |
| `discussion_posts.likes` | SUM(CASE vote_type WHEN 'up' THEN 1 ELSE -1 END) from `discussion_votes` | Trigger on vote change |
| `orders.subtotal` | SUM(`order_items.unit_price * quantity`) | Computed at order creation |
| `orders.tax_amount` | `subtotal * 0.05` (GST) | Computed at order creation |
| `orders.total` | `subtotal + tax_amount` | Computed at order creation |
| User `books_owned` count | COUNT of `user_library` rows | Query-time or view |
| User `stats` (books read, etc.) | Aggregate from `reading_progress` | Query-time or view |

---

## 7. Validation Rules

| Entity | Rule | Implementation |
|---|---|---|
| `books.price` | Must be ≥ 0 | CHECK constraint |
| `books.rating` | Must be 0.0–5.0 | CHECK constraint |
| `books.page_count` | Must be > 0 | CHECK constraint |
| `cart_items.quantity` | Must be ≥ 1 | CHECK constraint |
| `order_items.quantity` | Must be ≥ 1 | CHECK constraint |
| `order_items.unit_price` | Must be ≥ 0 | CHECK constraint |
| `reading_progress.progress_percent` | Must be 0–100 | CHECK constraint |
| `reading_settings.font_size` | Must be 12–32 | CHECK constraint |
| `reading_settings.line_height` | Must be 1.0–3.0 | CHECK constraint |
| `highlights.text` | Must not be empty | CHECK constraint |
| `user_subscriptions.selected_book_ids` | Array length must be exactly 2 | CHECK or app-level |
| `book_club_selections` | Only one `status = 'current'` at a time | Trigger or app-level |
| `users.email` | Valid email format | App-level + Supabase auth |
| `users.date_of_birth` | Used to gate `is_age_restricted` books (≥18) | App-level Edge Function |
| `event_rsvps` | One RSVP per email per event | UNIQUE constraint |

---

## 8. Permission Boundaries (RLS)

### Readers (authenticated, `role = 'reader'`)

| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `users` | Own row only | — | Own row only | — |
| `books` | Published only | — | — | — |
| `book_chapters` | Owned books only | — | — | — |
| `cart_items` | Own rows | Own rows | Own rows | Own rows |
| `orders` | Own rows | Own rows | — | — |
| `user_library` | Own rows | — | — | — |
| `reading_progress` | Own rows | Own rows | Own rows | — |
| `highlights` | Own rows | Own rows | Own rows | Own rows |
| `bookmarks` | Own rows | Own rows | Own rows | Own rows |
| `reading_settings` | Own row | Own row | Own row | — |
| `user_subscriptions` | Own row | — | — | — |
| `book_club_selections` | All | — | — | — |
| `book_club_events` | Public or member | — | — | — |
| `event_rsvps` | Own rows | Own rows | Own rows | Own rows |
| `discussion_topics` | All non-deleted | — | — | — |
| `discussion_posts` | All non-deleted | Own rows | Own rows | Own rows (soft) |
| `discussion_votes` | Own rows | Own rows | Own rows | Own rows |

### Admins (`role = 'admin'`)

Full CRUD on all tables. No RLS restrictions.

### Guest (unauthenticated)

| Table | Access |
|---|---|
| `books` | SELECT published only (browse page) |
| `book_club_selections` | SELECT all |
| `book_club_events` | SELECT where `is_public = true` |
| `discussion_topics` | SELECT all non-deleted |
| `discussion_posts` | SELECT all non-deleted |

---

## 9. Audit & Soft Delete

### Standard Audit Columns (all tables)

```sql
created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
```

Use a trigger to auto-update `updated_at`:

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

All queries should filter `WHERE deleted_at IS NULL` by default. RLS policies should include this filter.

### Sensitive Operations Audit Log (optional)

For admin actions (ban user, delete book, change subscription), consider a dedicated `audit_log` table:

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID` PK | |
| `actor_id` | `UUID` FK | Admin who performed action |
| `action` | `TEXT` | e.g. `user.banned`, `book.deleted` |
| `target_table` | `TEXT` | |
| `target_id` | `UUID` | |
| `metadata` | `JSONB` | Before/after snapshot |
| `performed_at` | `TIMESTAMPTZ` | |

---

## 10. Scalability Considerations

| Concern | Recommendation |
|---|---|
| **Book content storage** | Store chapters as separate rows in `book_chapters` rather than a single large blob. Enables lazy loading in the reader. |
| **Full-text search** | Use PostgreSQL `tsvector` + GIN index for book search. Migrate to a dedicated search service (e.g., Typesense) if catalog exceeds ~10K books. |
| **Image/file storage** | Use Supabase Storage buckets for cover images and book PDFs. Store only URLs in the database. |
| **Reading data sync** | Debounce reading progress writes from the client (e.g., every 30 seconds) to avoid excessive DB writes. |
| **Discussion threading** | Self-referencing `parent_id` works well for 2-level nesting (as implemented). For deeper nesting, consider materialized paths or closure tables. |
| **Denormalized counters** | `attendee_count`, `post_count`, `likes` should be updated via DB triggers for consistency, not application-level increments. |
| **Pagination** | All list endpoints (books, orders, discussions) should use cursor-based pagination. The admin books page already shows "Previous/Next" buttons. |
| **Cart → Server migration** | Currently localStorage-only. Backend cart enables cross-device persistence and abandoned-cart recovery. |
| **Rate limiting** | Edge Functions should enforce rate limits on: discussion posts, votes, RSVP submissions. |

---

## 11. Open Questions & Risks

### Open Questions

1. **Payment integration**: The subscription modal and checkout page simulate payments. Which payment processor will be used? (Stripe recommended for Supabase). This affects `orders` and `user_subscriptions` schemas.

2. **Book content format**: Will books be stored as structured chapter text (current mock approach) or as PDFs rendered in-browser? This determines whether `book_chapters` is needed or if a single `book_file_url` suffices.

3. **Review/rating system**: The `rating` field on books exists but there is no review UI. Is this an editorial rating or will user reviews be added? If user reviews, a `book_reviews` table is needed.

4. **Notification system**: Events and discussions imply notifications (RSVP confirmations, new replies). Is email notification needed? This would add a `notifications` table and background job infrastructure.

5. **Multi-author support**: Books currently have a single `author` TEXT field. Should this support multiple authors or link to an `authors` table?

6. **Dealer code functionality**: The subscription modal mentions a "Kane Dealer Code (35% OFF)". How should discount codes be validated and tracked? Consider a `promo_codes` table.

### Risks

| Risk | Mitigation |
|---|---|
| **localStorage → DB migration** for existing users | Provide a one-time sync endpoint that imports localStorage data on first authenticated session |
| **Age-gating bypass** | Enforce `date_of_birth` check server-side in Edge Functions, not just client-side |
| **Denormalized counter drift** | Use database triggers (not app code) for counter updates; add periodic reconciliation job |
| **Large chapter content** | Consider streaming/chunked delivery for very long chapters; add max content length validation |
| **Single `current` selection** | Enforce via trigger or scheduled job that transitions statuses on month boundaries |

---

## 12. Entity-Relationship Diagram (Text)

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────┐
│    users      │────<│   cart_items      │>────│    books      │
│              │     └──────────────────┘     │              │
│  id (PK)     │                              │  id (PK)     │
│  email       │     ┌──────────────────┐     │  title       │
│  name        │────<│   orders          │     │  author      │
│  role        │     │  id (PK)         │     │  genre       │
│  is_banned   │     │  user_id (FK)    │     │  price       │
│  ...         │     │  status          │     │  status      │
└──────┬───────┘     │  total           │     │  ...         │
       │             └────────┬─────────┘     └──────┬───────┘
       │                      │                      │
       │             ┌────────┴─────────┐            │
       │             │   order_items     │────────────┘
       │             │  order_id (FK)   │
       │             │  book_id (FK)    │
       │             │  quantity        │
       │             │  unit_price      │
       │             └──────────────────┘
       │
       │  ┌───────────────────┐     ┌──────────────────┐
       ├─<│  user_library      │>────│    books          │
       │  └───────────────────┘     └──────────────────┘
       │
       │  ┌───────────────────┐
       ├──│ user_subscriptions │
       │  └───────────────────┘
       │
       │  ┌───────────────────┐     ┌──────────────────┐
       ├─<│ reading_progress   │>────│    books          │
       │  └───────────────────┘     └──────────────────┘
       │
       │  ┌───────────────────┐     ┌──────────────────┐
       ├─<│   highlights       │>────│    books          │
       │  └───────────────────┘     └──────────────────┘
       │
       │  ┌───────────────────┐     ┌──────────────────┐
       ├─<│   bookmarks        │>────│    books          │
       │  └───────────────────┘     └──────────────────┘
       │
       │  ┌───────────────────┐
       ├──│ reading_settings   │
       │  └───────────────────┘
       │
       │  ┌───────────────────┐     ┌──────────────────┐
       ├─<│  event_rsvps       │>────│ book_club_events  │
       │  └───────────────────┘     └──────────────────┘
       │
       │  ┌───────────────────┐     ┌──────────────────┐
       ├─<│ discussion_posts   │>────│discussion_topics  │
       │  │  parent_id (self)  │     │  book_id (FK?)   │
       │  └───────────────────┘     └──────────────────┘
       │
       │  ┌───────────────────┐
       └─<│ discussion_votes   │>──── discussion_posts
          └───────────────────┘

    books 1──* book_chapters
    books 1──* book_club_selections
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
| Book content | `mock-book-content.ts` | `book_chapters` |
| User library | `mock-user-data.ts` | `user_library` |
| User admin data | `mock-admin-data.ts` | `users` + `user_subscriptions` |
| Book club data | `mock-book-club-data.ts` | `book_club_selections`, `book_club_events`, `discussion_topics` |
| Checkout | In-component state | `orders`, `order_items` |
| RSVP | Simulated API call | `event_rsvps` |
| Discussion votes | In-component state | `discussion_votes` |
| Subscription signup | `subscription-modal.tsx` | `user_subscriptions`, `user_library` |
