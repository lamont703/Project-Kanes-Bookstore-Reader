-- Shipping workflow for physical orders.
--
-- `fulfillment_status` already exists as (unfulfilled, fulfilled, returned), but
-- there was no way to record that something had left the building, no tracking
-- number, and no timestamps — so the admin dashboard had nothing to act on and
-- every order sat at 'unfulfilled' forever, digital ones included.
--
-- 'shipped' is inserted BEFORE 'fulfilled' so the enum's natural sort order
-- matches the real progression: unfulfilled -> shipped -> fulfilled -> returned.
-- Ordering matters because the orders dashboard sorts by it.

ALTER TYPE fulfillment_status_enum ADD VALUE IF NOT EXISTS 'shipped' BEFORE 'fulfilled';

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
