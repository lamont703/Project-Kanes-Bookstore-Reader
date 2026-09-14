-- Extend `books` into a general catalog so admin can sell non-book products
-- (candles, foam soap, apparel) alongside books.
--
-- WHY HERE AND NOT A SEPARATE products TABLE:
-- cart_items, order_items and user_library all carry `book_id UUID NOT NULL
-- REFERENCES books(id)`. Introducing a parallel products table would require
-- making those columns polymorphic and rewriting the checkout Edge Function,
-- cart context, order fulfillment, admin CRUD and the orders dashboard. Keeping
-- one catalog table means every commerce path keeps working untouched, at the
-- cost of a table named `books` that also holds candles.
--
-- SAFETY: existing rows all become product_type='book' and already satisfy the
-- shape constraint (author and genre are currently NOT NULL), so this migration
-- cannot invalidate existing data.

-- ---------------------------------------------------------------- new types
DO $$ BEGIN
  CREATE TYPE product_type_enum AS ENUM ('book', 'merch');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE merch_category_enum AS ENUM ('candle', 'soap', 'apparel', 'accessory');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ------------------------------------------------------------ books columns
ALTER TABLE public.books
  ADD COLUMN IF NOT EXISTS product_type    product_type_enum NOT NULL DEFAULT 'book',
  ADD COLUMN IF NOT EXISTS merch_category  merch_category_enum;

-- A candle has no author and no literary genre.
ALTER TABLE public.books ALTER COLUMN author DROP NOT NULL;
ALTER TABLE public.books ALTER COLUMN genre  DROP NOT NULL;

-- Keep the book contract intact rather than letting the relaxed columns become
-- a licence for half-populated book rows.
ALTER TABLE public.books DROP CONSTRAINT IF EXISTS books_shape_by_product_type;
ALTER TABLE public.books ADD CONSTRAINT books_shape_by_product_type CHECK (
  (product_type = 'book'
     AND author IS NOT NULL
     AND genre IS NOT NULL
     AND merch_category IS NULL)
  OR
  (product_type = 'merch'
     AND merch_category IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_books_product_type
  ON public.books (product_type, status)
  WHERE deleted_at IS NULL;

-- --------------------------------------------------------- variants: sizing
-- Apparel needs one purchasable row per size. Books have no size, so the column
-- is nullable and the uniqueness rule has to treat NULL as a real value —
-- a plain UNIQUE would let duplicate (book_id, 'merch', NULL) rows through.
ALTER TABLE public.book_variants
  ADD COLUMN IF NOT EXISTS size tshirt_size_enum;

DO $$
DECLARE
  con_name TEXT;
BEGIN
  SELECT conname INTO con_name
    FROM pg_constraint
   WHERE conrelid = 'public.book_variants'::regclass
     AND contype = 'u'
     AND pg_get_constraintdef(oid) ILIKE '%(book_id, format)%';
  IF con_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.book_variants DROP CONSTRAINT %I', con_name);
  END IF;
END $$;

-- NULLS NOT DISTINCT (PostgreSQL 15+) makes a NULL size collide with another
-- NULL size, so an unsized product still cannot get duplicate variants.
--
-- The obvious alternative, a functional index over COALESCE(size::TEXT, ''),
-- is rejected outright: casting an enum to text is STABLE rather than
-- IMMUTABLE — enum labels can be renamed — and Postgres refuses to index a
-- non-immutable expression (42P17).
CREATE UNIQUE INDEX IF NOT EXISTS book_variants_unique_sku
  ON public.book_variants (book_id, format, size) NULLS NOT DISTINCT;

-- ------------------------------------------------------------------- notes
-- Library access is already format-gated in supabase/functions/stripe-webhook
-- (`format === 'ebook' || format === 'komet_card'`), so 'merch' purchases will
-- not land in a reader's library. No change needed there.
--
-- RLS is unchanged and already correct: books_select_published exposes any
-- published, non-deleted row, so merch inherits public read access, and
-- book_variants_select_all already permits reading variants.
--
-- Application code must filter book-facing surfaces with product_type='book';
-- see the accompanying commit. Without that, merch appears in /browse,
-- /book/[id], /read/[id], the book club and the subscription modal.

COMMENT ON COLUMN public.books.product_type IS
  'book = a title with author/genre and optional reader content; merch = physical product (candle, soap, apparel).';
COMMENT ON COLUMN public.books.merch_category IS
  'Required when product_type = merch. NULL for books.';
COMMENT ON COLUMN public.book_variants.size IS
  'Apparel sizing. NULL for books and for unsized merch such as candles.';
