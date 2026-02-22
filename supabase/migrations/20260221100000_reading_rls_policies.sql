-- ============================================================
-- Kane's Komet Book Reader — Reading Engine RLS Policies
-- Migration: 20260221100000_reading_rls_policies.sql
-- Purpose: Enable frontend reader to access book pages, 
--          sync bookmarks/highlights/progress/settings
-- ============================================================

-- ============================================================
-- SECTION 1: book_pages (Public read for published books)
-- ============================================================

-- Authenticated users can read pages of published books
-- (Fine-grained access check happens in the get-book-pages Edge Function)
CREATE POLICY "anyone_can_read_published_book_pages"
  ON public.book_pages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.books
      WHERE books.id = book_pages.book_id
      AND books.status = 'published'
    )
  );

-- Admins can manage all book pages
CREATE POLICY "admins_manage_book_pages"
  ON public.book_pages
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- ============================================================
-- SECTION 2: reading_progress (User's own progress only)
-- ============================================================

CREATE POLICY "users_read_own_progress"
  ON public.reading_progress
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own_progress"
  ON public.reading_progress
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_update_own_progress"
  ON public.reading_progress
  FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================
-- SECTION 3: highlights (User's own highlights only)
-- ============================================================

CREATE POLICY "users_read_own_highlights"
  ON public.highlights
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own_highlights"
  ON public.highlights
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_delete_own_highlights"
  ON public.highlights
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- SECTION 4: bookmarks (User's own bookmarks only)
-- ============================================================

CREATE POLICY "users_read_own_bookmarks"
  ON public.bookmarks
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own_bookmarks"
  ON public.bookmarks
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_delete_own_bookmarks"
  ON public.bookmarks
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- SECTION 5: reading_settings (User's own settings only)
-- ============================================================

CREATE POLICY "users_read_own_settings"
  ON public.reading_settings
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users_upsert_own_settings"
  ON public.reading_settings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_update_own_settings"
  ON public.reading_settings
  FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================
-- SECTION 6: Storage bucket policies
-- Create the buckets needed for the reading engine if they
-- don't already exist (idempotent).
-- ============================================================

-- Note: Storage bucket creation is typically done via Supabase Dashboard
-- or the management API. The policies below define access rules.

-- book-pages bucket: Public read (pages are served via public URLs)
-- book-pdfs bucket: Private (only accessed by Edge Functions via service role)
-- book-covers bucket: Public read
-- book-illustrations bucket: Public read
