-- Storage for images an admin uploads while editing pages.
--
-- Separate from book-covers on purpose: that bucket is keyed by book id and is
-- cleaned up when a book is deleted (see admin-books-content.tsx). Site imagery
-- has no owning row and must not be swept up by that logic.
--
-- Public read, because these are pictures on a public marketing site. Writes are
-- admin-only.

INSERT INTO storage.buckets (id, name, public)
VALUES ('page-images', 'page-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "page images are publicly readable" ON storage.objects;
CREATE POLICY "page images are publicly readable" ON storage.objects
  FOR SELECT USING (bucket_id = 'page-images');

DROP POLICY IF EXISTS "admins upload page images" ON storage.objects;
CREATE POLICY "admins upload page images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'page-images'
    AND EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "admins update page images" ON storage.objects;
CREATE POLICY "admins update page images" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'page-images'
    AND EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "admins delete page images" ON storage.objects;
CREATE POLICY "admins delete page images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'page-images'
    AND EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );
