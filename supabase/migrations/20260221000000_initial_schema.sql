-- ============================================================
-- Kane's Komet Book Reader — Initial Schema
-- Migration: 20260221000000_initial_schema.sql
-- Generated from: docs/backend-data-model-recommendation.md
-- Target: Supabase (PostgreSQL 15)
-- ============================================================

-- ============================================================
-- SECTION 1: ENUMS
-- ============================================================

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
-- Note: 'cancelled' intentionally excluded — all sales are final.
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
-- Categories match the book genres exactly.
-- 'General' and 'Book Club' and 'News' are admin-only topics.
CREATE TYPE discussion_category_enum AS ENUM (
  'General', 'Book Club', 'News',
  'Crime', 'Children', 'PTP', 'Spiritual', 'Adult', 'Sports', 'Self-Help', 'Cooking'
);
CREATE TYPE vote_type_enum AS ENUM ('up', 'down');

-- ============================================================
-- SECTION 2: SHARED AUTO-UPDATE TRIGGER
-- Applied to every table with an updated_at column.
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- SECTION 3: TABLES
-- ============================================================

-- ------------------------------------------------------------
-- 3.1  users
-- Extends Supabase auth.users. Application profile table.
-- ------------------------------------------------------------
CREATE TABLE public.users (
  id                UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email             TEXT NOT NULL UNIQUE,
  display_name      TEXT NOT NULL,
  full_name         TEXT NOT NULL,
  phone             TEXT,
  date_of_birth     DATE,
  mailing_address   TEXT,
  tshirt_size       tshirt_size_enum,
  avatar_url        TEXT,
  role              user_role_enum NOT NULL DEFAULT 'reader',
  is_banned         BOOLEAN NOT NULL DEFAULT FALSE,
  ghl_contact_id    TEXT,
  stripe_customer_id TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_active_at    TIMESTAMPTZ,
  deleted_at        TIMESTAMPTZ
);

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Privacy: RLS will ensure only display_name is visible to other users.
-- Indexes
CREATE INDEX idx_users_role ON public.users (role);
CREATE UNIQUE INDEX idx_users_email ON public.users (email);
CREATE INDEX idx_users_stripe_customer_id ON public.users (stripe_customer_id);

-- ------------------------------------------------------------
-- 3.2  books
-- ------------------------------------------------------------
CREATE TABLE public.books (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title            TEXT NOT NULL,
  author           TEXT NOT NULL,
  illustrator      TEXT,                        -- Shown publicly on book detail page
  description      TEXT,
  genre            genre_enum NOT NULL,
  cover_image_url  TEXT,
  book_file_url    TEXT,                        -- Original PDF storage path
  series_name      TEXT,
  series_order     INTEGER,
  status           book_status_enum NOT NULL DEFAULT 'draft',
  is_age_restricted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at       TIMESTAMPTZ
  -- Removed: rating, page_count, published_year, isbn
);

CREATE TRIGGER trg_books_updated_at
  BEFORE UPDATE ON public.books
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Indexes
CREATE INDEX idx_books_genre_status ON public.books (genre, status);
CREATE INDEX idx_books_series ON public.books (series_name, series_order);
CREATE INDEX idx_books_fts ON public.books
  USING GIN (to_tsvector('english', title || ' ' || COALESCE(author, '')));

-- ------------------------------------------------------------
-- 3.3  book_variants
-- Purchase options for each book (ebook / paper_book / komet_card).
-- ------------------------------------------------------------
CREATE TABLE public.book_variants (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id      UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  format       book_format_enum NOT NULL,
  price        NUMERIC(10,2) NOT NULL CHECK (price > 0),
  is_in_stock  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (book_id, format)
);

CREATE TRIGGER trg_book_variants_updated_at
  BEFORE UPDATE ON public.book_variants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Indexes
CREATE INDEX idx_book_variants_stock ON public.book_variants (book_id, is_in_stock);

-- ------------------------------------------------------------
-- 3.4  book_pages
-- One row per PDF page. Page image preserves exact PDF layout.
-- ------------------------------------------------------------
CREATE TABLE public.book_pages (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id        UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  page_number    INTEGER NOT NULL,
  page_image_url TEXT NOT NULL,     -- Supabase Storage URL — preserves PDF layout
  content        TEXT,              -- Extracted plain text — for search indexing only
  word_count     INTEGER NOT NULL DEFAULT 0,
  UNIQUE (book_id, page_number)
);

-- Indexes
CREATE INDEX idx_book_pages_order ON public.book_pages (book_id, page_number);

-- ------------------------------------------------------------
-- 3.5  book_illustrations
-- Inline images extracted from PDFs, displayed at their original positions.
-- ------------------------------------------------------------
CREATE TABLE public.book_illustrations (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id        UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  image_url      TEXT NOT NULL,
  page_number    INTEGER NOT NULL,
  position_index INTEGER NOT NULL DEFAULT 0,
  caption        TEXT,
  width          INTEGER,
  height         INTEGER,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_book_illustrations_pos ON public.book_illustrations (book_id, page_number, position_index);

-- ------------------------------------------------------------
-- 3.6  user_subscriptions
-- One subscription record per user. Stripe handles billing.
-- ------------------------------------------------------------
CREATE TABLE public.user_subscriptions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  plan                    subscription_plan_enum NOT NULL DEFAULT 'free',
  status                  subscription_status_enum NOT NULL DEFAULT 'active',
  stripe_subscription_id  TEXT,
  initial_fee_paid        NUMERIC(10,2),          -- $49.99 first month
  monthly_rate            NUMERIC(10,2),          -- $3.99/month from month 2
  selected_book_ids       UUID[],                 -- 2 free books chosen at signup
  started_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at              TIMESTAMPTZ,
  cancelled_at            TIMESTAMPTZ
);

-- ------------------------------------------------------------
-- 3.7  promo_codes
-- Dealer codes: unique per premium member, 35% discount at checkout.
-- Hybrid: tracked here + synced to Stripe Promotion Codes.
-- ------------------------------------------------------------
CREATE TABLE public.promo_codes (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id                UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  code                    TEXT NOT NULL UNIQUE,   -- Format: KANE-{NAME}-{PHONE_LAST4}
  discount_percent        INTEGER NOT NULL DEFAULT 35,
  is_active               BOOLEAN NOT NULL DEFAULT TRUE,
  stripe_promotion_code_id TEXT,
  total_uses              INTEGER NOT NULL DEFAULT 0,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE UNIQUE INDEX idx_promo_codes_code ON public.promo_codes (code);
CREATE INDEX idx_promo_codes_owner ON public.promo_codes (owner_id);

-- ------------------------------------------------------------
-- 3.8  promo_code_usages
-- Tracks every use of a dealer code for attribution.
-- ------------------------------------------------------------
CREATE TABLE public.promo_code_usages (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id    UUID NOT NULL REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  used_by_user_id  UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  order_id         UUID NOT NULL,                -- FK added after orders table is created below
  discount_amount  NUMERIC(10,2) NOT NULL,
  used_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_promo_code_usages_code ON public.promo_code_usages (promo_code_id);

-- ------------------------------------------------------------
-- 3.9  cart_items
-- Supports both authenticated users and anonymous guests (session_id).
-- ------------------------------------------------------------
CREATE TABLE public.cart_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES public.users(id) ON DELETE CASCADE,
  session_id  TEXT,                              -- For guest carts
  book_id     UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  variant_id  UUID NOT NULL REFERENCES public.book_variants(id) ON DELETE CASCADE,
  quantity    INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 1),
  added_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, book_id, variant_id)
);

-- Indexes
CREATE INDEX idx_cart_items_user ON public.cart_items (user_id);

-- ------------------------------------------------------------
-- 3.10  orders
-- ------------------------------------------------------------
CREATE TABLE public.orders (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status                   order_status_enum NOT NULL DEFAULT 'pending',
  subtotal                 NUMERIC(10,2) NOT NULL,
  discount_amount          NUMERIC(10,2) NOT NULL DEFAULT 0,
  shipping_amount          NUMERIC(10,2) NOT NULL DEFAULT 0,  -- $5.99 if has_physical_items
  tax_amount               NUMERIC(10,2) NOT NULL,            -- 5% GST on (subtotal - discount)
  total                    NUMERIC(10,2) NOT NULL,
  has_physical_items       BOOLEAN NOT NULL DEFAULT FALSE,
  promo_code_id            UUID REFERENCES public.promo_codes(id),
  stripe_payment_intent_id TEXT,
  shipping_name            TEXT,
  shipping_email           TEXT,
  shipping_address         TEXT,
  shipping_city            TEXT,
  shipping_state           TEXT,
  shipping_zip             TEXT,
  placed_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_orders_user ON public.orders (user_id, placed_at DESC);

-- Now we can add the FK from promo_code_usages.order_id -> orders.id
ALTER TABLE public.promo_code_usages
  ADD CONSTRAINT fk_promo_code_usages_order
  FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;

-- ------------------------------------------------------------
-- 3.11  order_items
-- ------------------------------------------------------------
CREATE TABLE public.order_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  book_id     UUID NOT NULL REFERENCES public.books(id) ON DELETE RESTRICT,
  variant_id  UUID NOT NULL REFERENCES public.book_variants(id) ON DELETE RESTRICT,
  format      book_format_enum NOT NULL,          -- Snapshot of format at purchase time
  quantity    INTEGER NOT NULL CHECK (quantity >= 1),
  unit_price  NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0)
);

-- ------------------------------------------------------------
-- 3.12  user_library
-- All library entries are permanent — books are never removed.
-- "is_permanent" field intentionally excluded (all entries are permanent by design).
-- ------------------------------------------------------------
CREATE TABLE public.user_library (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  book_id      UUID NOT NULL REFERENCES public.books(id) ON DELETE RESTRICT,
  source       library_source_enum NOT NULL,
  acquired_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, book_id)
);

-- Indexes
CREATE INDEX idx_user_library_user ON public.user_library (user_id);

-- ------------------------------------------------------------
-- 3.13  reading_progress
-- Syncs across devices. Client debounces writes to every 30 seconds.
-- ------------------------------------------------------------
CREATE TABLE public.reading_progress (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  book_id          UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  current_page     INTEGER NOT NULL DEFAULT 0,
  progress_percent NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (progress_percent BETWEEN 0 AND 100),
  last_read_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, book_id)
);

-- Indexes
CREATE UNIQUE INDEX idx_reading_progress_lookup ON public.reading_progress (user_id, book_id);

-- ------------------------------------------------------------
-- 3.14  highlights
-- Page-level highlights with optional note. Max 10 per book per user.
-- ------------------------------------------------------------
CREATE TABLE public.highlights (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  book_id         UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  page_number     INTEGER NOT NULL,
  paragraph_index INTEGER NOT NULL,
  text            TEXT NOT NULL CHECK (text <> ''),
  color           highlight_color_enum NOT NULL DEFAULT 'yellow',
  note            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_highlights_user_book ON public.highlights (user_id, book_id);

-- ------------------------------------------------------------
-- 3.15  bookmarks
-- Page-level bookmarks. Max 10 per book per user.
-- ------------------------------------------------------------
CREATE TABLE public.bookmarks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  book_id     UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,
  label       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_bookmarks_user_book ON public.bookmarks (user_id, book_id);

-- ------------------------------------------------------------
-- 3.16  reading_settings
-- Simplified to zoom + theme only (page-image reader, no text reflow).
-- Removed: font_size, font_family, line_height.
-- ------------------------------------------------------------
CREATE TABLE public.reading_settings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  zoom        INTEGER NOT NULL DEFAULT 100 CHECK (zoom IN (75, 100, 125, 150)),
  theme       reading_theme_enum NOT NULL DEFAULT 'dark',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_reading_settings_updated_at
  BEFORE UPDATE ON public.reading_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ------------------------------------------------------------
-- 3.17  book_club_selections
-- Monthly Book Club picks. One per month.
-- ------------------------------------------------------------
CREATE TABLE public.book_club_selections (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id          UUID NOT NULL REFERENCES public.books(id) ON DELETE RESTRICT,
  month            TEXT NOT NULL,
  year             INTEGER NOT NULL,
  theme            TEXT NOT NULL,
  description      TEXT,
  status           selection_status_enum NOT NULL DEFAULT 'upcoming',
  discussion_date  DATE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (month, year)
);

CREATE TRIGGER trg_book_club_selections_updated_at
  BEFORE UPDATE ON public.book_club_selections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Indexes
CREATE INDEX idx_book_club_selections_status ON public.book_club_selections (status);

-- ------------------------------------------------------------
-- 3.18  book_club_events
-- Public or members-only events. No max capacity.
-- ------------------------------------------------------------
CREATE TABLE public.book_club_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  description     TEXT,
  date            DATE NOT NULL,
  time            TEXT NOT NULL,
  location        TEXT NOT NULL,
  type            event_type_enum NOT NULL,
  cover_image_url TEXT,
  is_public       BOOLEAN NOT NULL DEFAULT TRUE,
  status          event_status_enum NOT NULL DEFAULT 'upcoming',
  attendee_count  INTEGER NOT NULL DEFAULT 0,    -- Denormalized; updated by trigger
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_book_club_events_updated_at
  BEFORE UPDATE ON public.book_club_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Indexes
CREATE INDEX idx_book_club_events_status ON public.book_club_events (status, date);

-- ------------------------------------------------------------
-- 3.19  event_rsvps
-- Account required to RSVP. Free users → public events only.
-- Premium users → all events.
-- ------------------------------------------------------------
CREATE TABLE public.event_rsvps (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    UUID NOT NULL REFERENCES public.book_club_events(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  phone       TEXT,
  rsvp_status rsvp_status_enum NOT NULL DEFAULT 'confirmed',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);

-- ------------------------------------------------------------
-- 3.20  discussion_topics
-- Admin-created only. Soft-deletable.
-- ------------------------------------------------------------
CREATE TABLE public.discussion_topics (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  description     TEXT,
  category        discussion_category_enum NOT NULL DEFAULT 'General',
  book_id         UUID REFERENCES public.books(id) ON DELETE SET NULL,
  is_pinned       BOOLEAN NOT NULL DEFAULT FALSE,
  is_featured     BOOLEAN NOT NULL DEFAULT FALSE,
  post_count      INTEGER NOT NULL DEFAULT 0,    -- Denormalized; updated by trigger
  member_count    INTEGER NOT NULL DEFAULT 0,    -- Denormalized; updated by trigger
  last_activity_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE TRIGGER trg_discussion_topics_updated_at
  BEFORE UPDATE ON public.discussion_topics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Indexes
CREATE INDEX idx_discussion_topics_sort ON public.discussion_topics (is_pinned DESC, last_activity_at DESC);

-- ------------------------------------------------------------
-- 3.21  discussion_posts
-- Threaded (self-referencing parent_id). Premium members only.
-- ------------------------------------------------------------
CREATE TABLE public.discussion_posts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id    UUID NOT NULL REFERENCES public.discussion_topics(id) ON DELETE CASCADE,
  parent_id   UUID REFERENCES public.discussion_posts(id) ON DELETE CASCADE,  -- NULL = top-level
  author_id   UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  likes       INTEGER NOT NULL DEFAULT 0,     -- Denormalized net vote count
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);

CREATE TRIGGER trg_discussion_posts_updated_at
  BEFORE UPDATE ON public.discussion_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Indexes
CREATE INDEX idx_discussion_posts_topic ON public.discussion_posts (topic_id, created_at);

-- ------------------------------------------------------------
-- 3.22  discussion_votes
-- One vote per user per post.
-- ------------------------------------------------------------
CREATE TABLE public.discussion_votes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    UUID NOT NULL REFERENCES public.discussion_posts(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  vote_type  vote_type_enum NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);

-- Indexes
CREATE UNIQUE INDEX idx_discussion_votes_dedup ON public.discussion_votes (post_id, user_id);

-- ------------------------------------------------------------
-- 3.23  audit_log
-- Records significant admin actions for accountability.
-- ------------------------------------------------------------
CREATE TABLE public.audit_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id     UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action       TEXT NOT NULL,       -- e.g., 'user.banned', 'book.deleted'
  target_table TEXT NOT NULL,
  target_id    UUID NOT NULL,
  metadata     JSONB,               -- Additional context (before/after values, etc.)
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- SECTION 4: TRIGGERS FOR DENORMALIZED COUNTERS
-- ============================================================

-- 4.1  Auto-update attendee_count on book_club_events
CREATE OR REPLACE FUNCTION sync_event_attendee_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.book_club_events
    SET attendee_count = (
      SELECT COUNT(*) FROM public.event_rsvps
      WHERE event_id = COALESCE(NEW.event_id, OLD.event_id)
        AND rsvp_status = 'confirmed'
    )
  WHERE id = COALESCE(NEW.event_id, OLD.event_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_event_rsvp_count
  AFTER INSERT OR UPDATE OR DELETE ON public.event_rsvps
  FOR EACH ROW EXECUTE FUNCTION sync_event_attendee_count();

-- 4.2  Auto-update post_count on discussion_topics
CREATE OR REPLACE FUNCTION sync_topic_post_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.discussion_topics
    SET post_count    = (
          SELECT COUNT(*) FROM public.discussion_posts
          WHERE topic_id = COALESCE(NEW.topic_id, OLD.topic_id)
            AND deleted_at IS NULL
        ),
        member_count  = (
          SELECT COUNT(DISTINCT author_id) FROM public.discussion_posts
          WHERE topic_id = COALESCE(NEW.topic_id, OLD.topic_id)
            AND deleted_at IS NULL
        ),
        last_activity_at = now()
  WHERE id = COALESCE(NEW.topic_id, OLD.topic_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_discussion_post_count
  AFTER INSERT OR UPDATE OR DELETE ON public.discussion_posts
  FOR EACH ROW EXECUTE FUNCTION sync_topic_post_count();

-- 4.3  Auto-update likes (net votes) on discussion_posts
CREATE OR REPLACE FUNCTION sync_post_likes()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.discussion_posts
    SET likes = (
      SELECT
        COALESCE(SUM(CASE vote_type WHEN 'up' THEN 1 ELSE -1 END), 0)
      FROM public.discussion_votes
      WHERE post_id = COALESCE(NEW.post_id, OLD.post_id)
    )
  WHERE id = COALESCE(NEW.post_id, OLD.post_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_post_likes
  AFTER INSERT OR UPDATE OR DELETE ON public.discussion_votes
  FOR EACH ROW EXECUTE FUNCTION sync_post_likes();

-- 4.4  Auto-update total_uses on promo_codes
CREATE OR REPLACE FUNCTION sync_promo_code_uses()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.promo_codes
    SET total_uses = (
      SELECT COUNT(*) FROM public.promo_code_usages
      WHERE promo_code_id = COALESCE(NEW.promo_code_id, OLD.promo_code_id)
    )
  WHERE id = COALESCE(NEW.promo_code_id, OLD.promo_code_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_promo_code_uses
  AFTER INSERT OR DELETE ON public.promo_code_usages
  FOR EACH ROW EXECUTE FUNCTION sync_promo_code_uses();

-- ============================================================
-- SECTION 5: ROW LEVEL SECURITY — ENABLE ON ALL TABLES
-- Actual policies will be defined in the next migration.
-- ============================================================

ALTER TABLE public.users               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_variants       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_pages          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_illustrations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_codes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_code_usages   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_library        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_progress    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.highlights          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_settings    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_club_selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_club_events    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_rsvps         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussion_topics   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussion_posts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussion_votes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log           ENABLE ROW LEVEL SECURITY;
