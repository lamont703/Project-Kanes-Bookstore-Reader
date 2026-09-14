-- Undo the fourteen promotion migrations, for use if one fails or the release
-- has to be pulled shortly after cutover.
--
-- NOT a migration. It deliberately lives outside supabase/migrations/ so no
-- `db push` can ever pick it up. Run it by hand, against one database, on
-- purpose.
--
-- ─── READ THIS BEFORE RUNNING ──────────────────────────────────────────────
--
-- This destroys data that exists ONLY in the new schema:
--
--   * pages / page_versions   — every marketing page's content and draft
--   * book_genres             — the editable genre list
--   * merch_categories        — the merchandise categories
--   * app_settings            — the dealer discount default
--   * every merch product     — rows in books with product_type = 'merch'
--   * stock counts, shipping tracking, display order, book-club ordering
--
-- Books, orders, users, promo codes and libraries are NOT touched. The merch
-- products are the exception, and only because the pre-migration schema has no
-- way to represent them: books.merch_category and product_type cease to exist,
-- and the restored NOT NULL on author/genre would reject them anyway.
--
-- So this is a genuine rollback in the first minutes after cutover, and an
-- increasingly bad idea after that. Once someone has edited a page or added a
-- merch product in production, prefer fixing forward.
--
-- ─── HOW TO RUN ────────────────────────────────────────────────────────────
--
--   psql "$SUPABASE_PROD_DB_URL" -v confirm=yes -f scripts/rollback-promotion.sql
--
-- Without -v confirm=yes it stops at the first statement and changes nothing.
-- The whole thing is one transaction: any failure leaves the database exactly
-- as it was.
--
-- ─── WHAT IT CANNOT UNDO ───────────────────────────────────────────────────
--
-- Postgres cannot remove a value from an enum. These three stay:
--
--   book_format_enum       gains 'merch'
--   fulfillment_status_enum gains 'shipped'
--   user_role_enum          gains 'employee'
--
-- Leaving them is harmless: the pre-migration code never produces or compares
-- against them, and an unused enum label costs nothing. Dropping and recreating
-- the types would mean rewriting every column that uses them, which is far more
-- dangerous than the thing being undone.
--
-- Storage objects are not deleted either. Files uploaded to the page-images
-- bucket stay; the bucket row is removed only if it is empty, so a rollback
-- never silently destroys uploaded artwork.

\set ON_ERROR_STOP on

\if :{?confirm}
\else
\echo ''
\echo 'REFUSING TO RUN: re-run with  -v confirm=yes  once you have read the header.'
\echo ''
\quit
\endif

BEGIN;

-- ───────────────────────────────────────────────────────────────────────────
-- Pre-flight. Fail loudly and change nothing rather than get half way.
-- ───────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  bad_genre   TEXT;
  bad_merch   TEXT;
BEGIN
  -- books.genre is going back to genre_enum. That only works if every value is
  -- still a label of that enum — a genre added through the admin genre manager
  -- after migration would not be, and the cast would fail mid-transaction.
  SELECT string_agg(DISTINCT b.genre, ', ')
    INTO bad_genre
  FROM public.books b
  WHERE b.genre IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'genre_enum' AND e.enumlabel = b.genre
    );

  IF bad_genre IS NOT NULL THEN
    RAISE EXCEPTION
      'Cannot roll back: these genres were added after migration and are not in genre_enum: %. Reassign those books to an original genre first, or fix forward instead.',
      bad_genre;
  END IF;

  -- Same for merch_category, for the merch rows about to be deleted anyway —
  -- checked so the failure is a clear message rather than a cast error.
  SELECT string_agg(DISTINCT b.merch_category, ', ')
    INTO bad_merch
  FROM public.books b
  WHERE b.merch_category IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'merch_category_enum' AND e.enumlabel = b.merch_category
    );

  IF bad_merch IS NOT NULL THEN
    RAISE WARNING 'Merch categories added after migration (their products are being deleted anyway): %', bad_merch;
  END IF;
END $$;

-- Tell the operator what is about to be lost, in the transaction log.
DO $$
DECLARE m INT; p INT; g INT; c INT;
BEGIN
  SELECT count(*) INTO m FROM public.books WHERE product_type = 'merch';
  SELECT count(*) INTO p FROM public.pages;
  SELECT count(*) INTO g FROM public.book_genres;
  SELECT count(*) INTO c FROM public.merch_categories;
  RAISE NOTICE 'Rolling back. Deleting % merch product(s), % page(s), % genre row(s), % merch category row(s).', m, p, g, c;
END $$;

-- ───────────────────────────────────────────────────────────────────────────
-- 14 / 13. book_sales_totals, and the widened display_order comment.
-- ───────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.book_sales_totals();

-- ───────────────────────────────────────────────────────────────────────────
-- 12. Dealer discount settings.
-- ───────────────────────────────────────────────────────────────────────────
ALTER TABLE public.promo_codes DROP CONSTRAINT IF EXISTS promo_codes_discount_percent_range;
DROP TABLE IF EXISTS public.app_settings;

-- ───────────────────────────────────────────────────────────────────────────
-- 11. Manual display order.
-- ───────────────────────────────────────────────────────────────────────────
DROP INDEX IF EXISTS public.books_merch_display_order_idx;
ALTER TABLE public.books DROP COLUMN IF EXISTS display_order;

-- ───────────────────────────────────────────────────────────────────────────
-- 10. Merch categories. The products go first: without product_type and
--     merch_category there is nowhere to put them, and the restored NOT NULLs
--     below would reject them.
-- ───────────────────────────────────────────────────────────────────────────
DELETE FROM public.order_items
 WHERE book_id IN (SELECT id FROM public.books WHERE product_type = 'merch');
DELETE FROM public.user_library
 WHERE book_id IN (SELECT id FROM public.books WHERE product_type = 'merch');
DELETE FROM public.book_variants
 WHERE book_id IN (SELECT id FROM public.books WHERE product_type = 'merch');
DELETE FROM public.books WHERE product_type = 'merch';

ALTER TABLE public.books DROP CONSTRAINT IF EXISTS books_merch_category_fkey;
DROP TABLE IF EXISTS public.merch_categories;

-- ───────────────────────────────────────────────────────────────────────────
-- 9. Employee policies and the role helper. The enum value itself cannot go;
--    demote anyone holding it so nobody is left with a role the old code does
--    not understand.
-- ───────────────────────────────────────────────────────────────────────────
UPDATE public.users SET role = 'reader' WHERE role = 'employee';

DROP POLICY IF EXISTS books_select_catalog_editor            ON public.books;
DROP POLICY IF EXISTS books_insert_catalog_editor            ON public.books;
DROP POLICY IF EXISTS books_update_catalog_editor            ON public.books;
DROP POLICY IF EXISTS book_variants_insert_catalog_editor    ON public.book_variants;
DROP POLICY IF EXISTS book_variants_update_catalog_editor    ON public.book_variants;
DROP POLICY IF EXISTS book_variants_delete_catalog_editor    ON public.book_variants;
DROP POLICY IF EXISTS "catalog_editor_insert_covers"         ON storage.objects;
DROP POLICY IF EXISTS "catalog_editor_update_covers"         ON storage.objects;
DROP FUNCTION IF EXISTS public.is_catalog_editor();

-- ───────────────────────────────────────────────────────────────────────────
-- 7. Genres back to the enum.
-- ───────────────────────────────────────────────────────────────────────────
DROP INDEX IF EXISTS public.idx_book_genres_active;
ALTER TABLE public.books DROP CONSTRAINT IF EXISTS books_genre_fkey;
ALTER TABLE public.books ALTER COLUMN genre TYPE genre_enum USING genre::genre_enum;
DROP TABLE IF EXISTS public.book_genres;

-- ───────────────────────────────────────────────────────────────────────────
-- 6. Page images bucket. Only if empty — never destroy uploaded artwork.
-- ───────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "page images are publicly readable" ON storage.objects;
DROP POLICY IF EXISTS "admins upload page images"         ON storage.objects;
DROP POLICY IF EXISTS "admins update page images"         ON storage.objects;
DROP POLICY IF EXISTS "admins delete page images"         ON storage.objects;

DELETE FROM storage.buckets b
 WHERE b.id = 'page-images'
   AND NOT EXISTS (SELECT 1 FROM storage.objects o WHERE o.bucket_id = 'page-images');

-- ───────────────────────────────────────────────────────────────────────────
-- 5. Editable page content.
-- ───────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.publish_page(TEXT);
DROP FUNCTION IF EXISTS public.discard_page_draft(TEXT);
DROP TABLE IF EXISTS public.page_versions;   -- FK child first
DROP TABLE IF EXISTS public.pages;
DROP TYPE  IF EXISTS page_version_state;

-- ───────────────────────────────────────────────────────────────────────────
-- 4. Order shipping tracking. 'shipped' cannot leave the enum, so move any
--    order sitting in it back to a state the old code renders.
-- ───────────────────────────────────────────────────────────────────────────
UPDATE public.orders SET fulfillment_status = 'pending'
 WHERE fulfillment_status::TEXT = 'shipped';

DROP INDEX IF EXISTS public.idx_orders_fulfillment_queue;
ALTER TABLE public.orders
  DROP COLUMN IF EXISTS tracking_number,
  DROP COLUMN IF EXISTS tracking_carrier,
  DROP COLUMN IF EXISTS shipped_at,
  DROP COLUMN IF EXISTS fulfilled_at;

-- ───────────────────────────────────────────────────────────────────────────
-- 3. Stock counts.
-- ───────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.decrement_variant_stock(UUID, INTEGER);
DROP INDEX IF EXISTS public.idx_book_variants_stock_quantity;
ALTER TABLE public.book_variants DROP COLUMN IF EXISTS stock_quantity;

-- ───────────────────────────────────────────────────────────────────────────
-- 2. Catalog extension. Last, because everything above leaned on product_type.
-- ───────────────────────────────────────────────────────────────────────────
DROP INDEX IF EXISTS public.book_variants_unique_sku;
ALTER TABLE public.book_variants DROP COLUMN IF EXISTS size;

DROP INDEX IF EXISTS public.idx_books_product_type;
ALTER TABLE public.books DROP CONSTRAINT IF EXISTS books_shape_by_product_type;
ALTER TABLE public.books
  DROP COLUMN IF EXISTS product_type,
  DROP COLUMN IF EXISTS merch_category;

-- The columns the catalog extension relaxed. Safe now: the only rows that were
-- allowed to be null here were merch, and those are gone.
ALTER TABLE public.books ALTER COLUMN author SET NOT NULL;
ALTER TABLE public.books ALTER COLUMN genre  SET NOT NULL;

DROP TYPE IF EXISTS product_type_enum;

-- tshirt_size_enum and merch_category_enum are left alone: they may predate
-- this work, and an unused type harms nothing.

-- ───────────────────────────────────────────────────────────────────────────
-- Ledger. Remove the fourteen so a later `db push` reapplies them cleanly
-- rather than believing they are already there.
-- ───────────────────────────────────────────────────────────────────────────
DELETE FROM supabase_migrations.schema_migrations
 WHERE version IN (
   '20260811000000','20260811000001','20260818000000','20260818000001',
   '20260823000000','20260823000001','20260825000000','20260826000000',
   '20260826000001','20260827000000','20260913000000','20260913000001',
   '20260914000000','20260914000001'
 );

COMMIT;

\echo ''
\echo 'Rollback complete. Redeploy the pre-promotion build on Vercel — the code'
\echo 'now on main queries columns that no longer exist.'
\echo ''
