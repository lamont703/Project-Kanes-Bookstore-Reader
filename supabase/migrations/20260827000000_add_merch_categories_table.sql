-- Merchandise categories as data instead of a Postgres enum.
--
-- Exactly the change migration 20260825000000 made for book categories, and for
-- the same reason: books.merch_category was merch_category_enum, so adding a
-- category meant ALTER TYPE — a schema migration, which an application must not
-- issue at runtime. That is what made "let the admin add a category" impossible
-- rather than merely unbuilt.
--
-- The column becomes TEXT with a foreign key to this table. The FK keeps the
-- guarantee the enum gave (a product cannot carry a category that does not
-- exist) while letting the set of categories change through ordinary INSERTs,
-- and ON DELETE RESTRICT means a category still in use cannot be deleted out
-- from under its products — the delete fails and the admin UI reports it.
--
-- merch_category_enum itself is left in place, as genre_enum was. Nothing
-- references it after this, but dropping a type is not worth the risk of an
-- unnoticed cast somewhere.

CREATE TABLE IF NOT EXISTS public.merch_categories (
  name        TEXT PRIMARY KEY,
  label       TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  -- Apparel is sold per size; a candle is one SKU. This drove the product form
  -- through a hardcoded `category === "apparel"`, which a custom category could
  -- never satisfy, so the answer has to travel with the category itself.
  is_sized    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.merch_categories IS
  'Merchandise categories. Referenced by books.merch_category; is_active hides one from the pickers without invalidating existing products.';
COMMENT ON COLUMN public.merch_categories.is_sized IS
  'True when products in this category are sold per size (S/M/L), which switches the product form to per-size pricing.';

-- Seed the four enum values, with the display labels the UI was hardcoding.
INSERT INTO public.merch_categories (name, label, sort_order, is_sized) VALUES
  ('candle',    'Candles',     1, FALSE),
  ('soap',      'Foam Soap',   2, FALSE),
  ('apparel',   'Apparel',     3, TRUE),
  ('accessory', 'Accessories', 4, FALSE)
ON CONFLICT (name) DO NOTHING;

-- Any value already on a product but missing above would break the FK.
INSERT INTO public.merch_categories (name, label, sort_order)
SELECT DISTINCT b.merch_category::TEXT, initcap(b.merch_category::TEXT), 999
FROM public.books b
WHERE b.merch_category IS NOT NULL
ON CONFLICT (name) DO NOTHING;

-- The shape constraint names merch_category, so it blocks the type change.
-- Dropped and restored verbatim (see 20260811000001).
ALTER TABLE public.books DROP CONSTRAINT IF EXISTS books_shape_by_product_type;

-- Enum -> text. The USING clause preserves every existing value verbatim.
ALTER TABLE public.books
  ALTER COLUMN merch_category TYPE TEXT USING merch_category::TEXT;

ALTER TABLE public.books ADD CONSTRAINT books_shape_by_product_type CHECK (
  (product_type = 'book'
     AND author IS NOT NULL
     AND genre IS NOT NULL
     AND merch_category IS NULL)
  OR
  (product_type = 'merch'
     AND merch_category IS NOT NULL)
);

ALTER TABLE public.books DROP CONSTRAINT IF EXISTS books_merch_category_fkey;
ALTER TABLE public.books
  ADD CONSTRAINT books_merch_category_fkey FOREIGN KEY (merch_category)
  REFERENCES public.merch_categories(name) ON UPDATE CASCADE ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_merch_categories_active
  ON public.merch_categories (is_active, sort_order, name);

-- ------------------------------------------------------------------- RLS
ALTER TABLE public.merch_categories ENABLE ROW LEVEL SECURITY;

-- The category list is on the public /morefunk shop; there is nothing to hide.
DROP POLICY IF EXISTS merch_categories_public_read ON public.merch_categories;
CREATE POLICY merch_categories_public_read ON public.merch_categories
  FOR SELECT USING (TRUE);

-- Adding and renaming a category is catalogue work, so employees get it too
-- (see 20260826000001). Deleting stays with admins, matching the rule that an
-- employee removes nothing.
DROP POLICY IF EXISTS merch_categories_write_catalog_editor ON public.merch_categories;
CREATE POLICY merch_categories_write_catalog_editor ON public.merch_categories
  FOR INSERT WITH CHECK (is_catalog_editor());

DROP POLICY IF EXISTS merch_categories_update_catalog_editor ON public.merch_categories;
CREATE POLICY merch_categories_update_catalog_editor ON public.merch_categories
  FOR UPDATE USING (is_catalog_editor()) WITH CHECK (is_catalog_editor());

DROP POLICY IF EXISTS merch_categories_delete_admin ON public.merch_categories;
CREATE POLICY merch_categories_delete_admin ON public.merch_categories
  FOR DELETE USING (is_admin());
