-- ============================================================
-- Kane's Komet Book Reader — Storage Bucket Setup
-- Run this in the Supabase Dashboard SQL Editor
-- (Dashboard → SQL Editor → New Query → Paste → Run)
-- ============================================================

-- 1. Create the book-covers bucket (PUBLIC — cover images are publicly accessible)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'book-covers',
  'book-covers',
  TRUE,
  5242880,  -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO NOTHING;

-- 2. Create the book-pdfs bucket (PRIVATE — only accessed by admin/service role)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'book-pdfs',
  'book-pdfs',
  FALSE,
  104857600,  -- 100MB limit
  ARRAY['application/pdf']
) ON CONFLICT (id) DO NOTHING;

-- 3. Create the book-pages bucket (PUBLIC — rendered page images are displayed in the reader)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'book-pages',
  'book-pages',
  TRUE,
  10485760,  -- 10MB limit per page image
  ARRAY['image/png', 'image/webp', 'image/svg+xml']
) ON CONFLICT (id) DO NOTHING;

-- 4. Create the book-illustrations bucket (PUBLIC — inline art displayed in reader)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'book-illustrations',
  'book-illustrations',
  TRUE,
  10485760,  -- 10MB limit
  ARRAY['image/png', 'image/webp', 'image/jpeg']
) ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- Storage RLS Policies
-- ============================================================

-- ── book-covers: Anyone can view, only admins can upload ────────

-- Public read access for book covers
CREATE POLICY "public_read_covers"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'book-covers');

-- Admins can upload/update/delete covers
CREATE POLICY "admin_manage_covers"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'book-covers'
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "admin_update_covers"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'book-covers'
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "admin_delete_covers"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'book-covers'
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ── book-pdfs: Only admins can manage (private bucket) ──────────

CREATE POLICY "admin_manage_pdfs"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'book-pdfs'
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "admin_read_pdfs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'book-pdfs'
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "admin_update_pdfs"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'book-pdfs'
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "admin_delete_pdfs"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'book-pdfs'
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ── book-pages: Public read, admin manage ──────────────────────

CREATE POLICY "public_read_pages"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'book-pages');

CREATE POLICY "admin_manage_pages"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'book-pages'
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "admin_update_pages"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'book-pages'
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "admin_delete_pages"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'book-pages'
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ── book-illustrations: Public read, admin manage ──────────────

CREATE POLICY "public_read_illustrations"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'book-illustrations');

CREATE POLICY "admin_manage_illustrations"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'book-illustrations'
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "admin_update_illustrations"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'book-illustrations'
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "admin_delete_illustrations"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'book-illustrations'
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
