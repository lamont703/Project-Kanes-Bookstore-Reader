-- Book categories as data instead of a Postgres enum.
--
-- `books.genre` was genre_enum, so adding a category meant ALTER TYPE — a schema
-- migration, which an application must not issue at runtime. That is what made
-- "let the admin add a category" impossible rather than merely unbuilt.
--
-- The column becomes TEXT with a foreign key to this table. The FK is the point:
-- it keeps the guarantee the enum gave (a book cannot carry a category that does
-- not exist) while letting the set of categories change through ordinary INSERTs.
-- It also means a category still in use cannot be deleted out from under its
-- books — the delete fails rather than silently orphaning them, and the admin UI
-- reports that.
--
-- genre_enum itself is left in place. Nothing references it after this, but
-- dropping a type is not worth the risk of an unnoticed cast somewhere.

CREATE TABLE IF NOT EXISTS public.book_genres (
  name        TEXT PRIMARY KEY,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.book_genres IS
  'Book categories. Referenced by books.genre; is_active hides one from the filters without deleting it.';
COMMENT ON COLUMN public.book_genres.is_active IS
  'False retires a category from the browse filters and the upload form while leaving existing books valid.';

-- Seed from the enum so nothing changes meaning, ordered as the enum was.
INSERT INTO public.book_genres (name, sort_order)
SELECT e.enumlabel, e.enumsortorder::INTEGER
FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
WHERE t.typname = 'genre_enum'
ON CONFLICT (name) DO NOTHING;

-- Any value already on a book but missing from the enum would break the FK.
INSERT INTO public.book_genres (name, sort_order)
SELECT DISTINCT b.genre::TEXT, 999 FROM public.books b WHERE b.genre IS NOT NULL
ON CONFLICT (name) DO NOTHING;

-- Enum -> text. The USING clause preserves every existing value verbatim.
ALTER TABLE public.books
  ALTER COLUMN genre TYPE TEXT USING genre::TEXT;

ALTER TABLE public.books DROP CONSTRAINT IF EXISTS books_genre_fkey;
ALTER TABLE public.books
  ADD CONSTRAINT books_genre_fkey FOREIGN KEY (genre)
  REFERENCES public.book_genres(name) ON UPDATE CASCADE ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_book_genres_active
  ON public.book_genres (is_active, sort_order, name);

-- ------------------------------------------------------------------- RLS
ALTER TABLE public.book_genres ENABLE ROW LEVEL SECURITY;

-- The category list is on a public page; there is nothing to hide.
DROP POLICY IF EXISTS book_genres_public_read ON public.book_genres;
CREATE POLICY book_genres_public_read ON public.book_genres
  FOR SELECT USING (true);

DROP POLICY IF EXISTS book_genres_admin_write ON public.book_genres;
CREATE POLICY book_genres_admin_write ON public.book_genres
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );
