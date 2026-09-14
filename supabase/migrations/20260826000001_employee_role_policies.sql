-- ============================================================
-- Employee role — part 2 of 2: policies
-- Depends on: 20260826000000_add_employee_role.sql
-- ============================================================
-- Employees may add, edit and publish books and merchandise. They may not
-- delete.
--
-- Deleting a book is the specific hazard being designed around: migration
-- 20260227200000 deliberately widened the cascades off public.books so admin
-- deletions would stop 409-ing, which means one delete now takes order_items,
-- user_library and book_club_selections with it. That is purchase history.
--
-- Every policy below is additive. The existing *_all_admin policies are left
-- exactly as they are; permissive policies OR together, so admins keep the
-- access they had and employees gain a strictly smaller slice. DELETE is
-- granted by no policy here, so for employees it stays denied by default.
-- ============================================================

-- Admin or employee. Named for the capability rather than the roles so the
-- policies below read as what they permit.
CREATE OR REPLACE FUNCTION is_catalog_editor()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
      AND role IN ('admin', 'employee')
      AND deleted_at IS NULL
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- books
-- Merchandise lives in this table too (product_type = 'merch', migration
-- 20260811000001), so the policies below cover both catalogues and no
-- product_type predicate is needed.
-- ============================================================

-- Drafts included: books_select_published stops at status = 'published', and an
-- editor who cannot see a draft cannot finish it.
DROP POLICY IF EXISTS books_select_catalog_editor ON public.books;
CREATE POLICY books_select_catalog_editor ON public.books
  FOR SELECT USING (is_catalog_editor());

DROP POLICY IF EXISTS books_insert_catalog_editor ON public.books;
CREATE POLICY books_insert_catalog_editor ON public.books
  FOR INSERT WITH CHECK (is_catalog_editor());

DROP POLICY IF EXISTS books_update_catalog_editor ON public.books;
CREATE POLICY books_update_catalog_editor ON public.books
  FOR UPDATE USING (is_catalog_editor()) WITH CHECK (is_catalog_editor());

-- No DELETE policy, deliberately. See the header.

-- ============================================================
-- book_variants
-- ============================================================
-- SELECT is already open to everyone (book_variants_select_all).

DROP POLICY IF EXISTS book_variants_insert_catalog_editor ON public.book_variants;
CREATE POLICY book_variants_insert_catalog_editor ON public.book_variants
  FOR INSERT WITH CHECK (is_catalog_editor());

DROP POLICY IF EXISTS book_variants_update_catalog_editor ON public.book_variants;
CREATE POLICY book_variants_update_catalog_editor ON public.book_variants
  FOR UPDATE USING (is_catalog_editor()) WITH CHECK (is_catalog_editor());

-- The one DELETE an employee gets, and it is not a loophole.
--
-- Saving a merchandise product replaces its variants wholesale — sizes get
-- added and withdrawn and the unique index is on (book_id, format, size), so
-- components/admin/product-form.tsx deletes the set and reinserts it. Without
-- this, "employees may edit products" would be false: every save of an existing
-- product would fail.
--
-- It cannot reach purchase history. order_items.variant_id is ON DELETE
-- RESTRICT, so Postgres refuses to remove any variant that has ever been
-- ordered — the guarantee is in the foreign key, not in this policy. Live carts
-- do cascade, which is the same thing an admin edit already does today.
DROP POLICY IF EXISTS book_variants_delete_catalog_editor ON public.book_variants;
CREATE POLICY book_variants_delete_catalog_editor ON public.book_variants
  FOR DELETE USING (is_catalog_editor());

-- ============================================================
-- book_pages / book_illustrations
-- ============================================================
-- Deliberately nothing.
--
-- Both tables are written by the ingestion pipeline (supabase/functions/upload-book
-- and lib/book/pdf-batch-processor.ts), which runs with the service role and
-- bypasses RLS, so uploads work without a write policy. And no admin screen
-- reads them — book_pages is queried in exactly one place, app/read/[id],
-- where RLS gates it on user_library.
--
-- So a SELECT grant here would buy nothing and cost something: it would hand
-- every employee the full text of every book without buying it. If a "did this
-- PDF process" panel is ever added to the book editor, give it a service-role
-- endpoint rather than opening these tables up.

-- ============================================================
-- Storage
-- ============================================================
-- book-covers only, INSERT and UPDATE.
--
-- That is the whole of what the browser writes on an employee's behalf: the
-- cover upload in components/admin/product-form.tsx. book-pdfs, book-pages and
-- book-illustrations are written by the ingestion pipeline under the service
-- role, which RLS does not apply to, so granting employees anything there would
-- be privilege nobody spends.
--
-- book-pdfs in particular stays closed. It is the only private bucket of the
-- four and it holds the original book files, so a read grant would be a way to
-- take a copy of every title in the catalogue.
--
-- page-images is not here either: it belongs to the site page editor (migration
-- 20260823000001), and employees have no access to site pages.
--
-- No DELETE, on any bucket.

DROP POLICY IF EXISTS "catalog_editor_insert_covers" ON storage.objects;
CREATE POLICY "catalog_editor_insert_covers"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'book-covers' AND public.is_catalog_editor());

-- Covers are uploaded with upsert: true, which is an UPDATE when the path
-- already exists.
DROP POLICY IF EXISTS "catalog_editor_update_covers" ON storage.objects;
CREATE POLICY "catalog_editor_update_covers"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'book-covers' AND public.is_catalog_editor())
  WITH CHECK (bucket_id = 'book-covers' AND public.is_catalog_editor());
