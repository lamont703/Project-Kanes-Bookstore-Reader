-- Shipping workflow for physical orders.
--
-- There was no way to record that something had left the building, no tracking
-- number, and no timestamps — so the admin dashboard had nothing to act on and
-- every order sat at 'unfulfilled' forever, digital ones included.
--
-- 'shipped' sorts BEFORE 'fulfilled' so the enum's natural order matches the real
-- progression: unfulfilled -> shipped -> fulfilled -> returned. Ordering matters
-- because the orders dashboard sorts by it.
--
-- ── Why this creates the type it was originally written to assume ──────────
--
-- This migration used to open with a bare
--   ALTER TYPE fulfillment_status_enum ADD VALUE ...
-- on the belief that the type and orders.fulfillment_status already existed.
-- They do on staging — but nothing in this directory creates them. Migration
-- 20260331000000 DROPS both (its name says "add", its body is a revert), and
-- every project has it recorded as applied. Staging only has them because they
-- were put back by hand, outside the migrations.
--
-- So this file worked on staging by accident and failed on production with
-- `type "fulfillment_status_enum" does not exist` — as it would on any clean
-- rebuild. Creating what it needs makes it true everywhere instead of true in
-- one place. Both branches are guarded, so the project that already has these
-- is unaffected.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'fulfillment_status_enum') THEN
    -- The four states the admin dashboard knows, in progression order.
    CREATE TYPE fulfillment_status_enum AS ENUM
      ('unfulfilled', 'shipped', 'fulfilled', 'returned');
  END IF;
END $$;

-- No-op where the type was just created with 'shipped' already in it; adds the
-- value where the type predates this migration.
ALTER TYPE fulfillment_status_enum ADD VALUE IF NOT EXISTS 'shipped' BEFORE 'fulfilled';

-- Safe to default in the same transaction that may have created the type:
-- 'unfulfilled' exists on both paths. Postgres only withholds enum values ADDED
-- to a pre-existing type within the transaction, and 'shipped' is not used here.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS fulfillment_status fulfillment_status_enum
    NOT NULL DEFAULT 'unfulfilled';

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS tracking_number  TEXT,
  ADD COLUMN IF NOT EXISTS tracking_carrier TEXT,
  ADD COLUMN IF NOT EXISTS shipped_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS fulfilled_at     TIMESTAMPTZ;

COMMENT ON COLUMN public.orders.tracking_number IS
  'Carrier tracking number, set when an admin marks a physical order shipped.';
COMMENT ON COLUMN public.orders.tracking_carrier IS
  'Free-text carrier name (USPS, UPS, FedEx...). Not an enum — carriers change.';

-- Pull up the queue of physical orders still waiting to go out.
CREATE INDEX IF NOT EXISTS idx_orders_fulfillment_queue
  ON public.orders (fulfillment_status, placed_at DESC)
  WHERE has_physical_items;
