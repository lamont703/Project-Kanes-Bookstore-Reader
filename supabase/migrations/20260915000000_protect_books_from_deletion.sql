-- Make a deleted book recoverable, and make an accidental hard delete impossible.
--
-- On 2026-09-15 two books were destroyed by a code path that meant well: the
-- upload-book rollback, written to clean up after a failed UPLOAD, ran on an
-- EDIT and deleted a book that had been on sale for months. Nothing malicious,
-- nothing exotic — one `.delete()` reached by a path nobody had walked.
--
-- books.deleted_at already existed and nothing used it. Everything below exists
-- to make that column the only way a book ever leaves the catalogue.
--
-- Why a trigger and not just discipline: deleting a book CASCADEs into
-- order_items, user_library, bookmarks, highlights, reading_progress,
-- cart_items, book_pages, book_variants and book_illustrations. So a single
-- stray DELETE does not just remove a product — it rewrites sales history and
-- silently takes books out of customers' libraries. That is not something to
-- leave to whoever writes the next cleanup routine.

-- ───────────────────────────────────────────────────────────────────────────
-- 1. Refuse hard deletes.
-- ───────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.books_block_hard_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  -- A deliberate purge is still possible, but it has to say so out loud and it
  -- only lasts for the transaction that sets it:
  --
  --   BEGIN;
  --   SET LOCAL app.allow_book_delete = 'on';
  --   DELETE FROM public.books WHERE id = '…';
  --   COMMIT;
  --
  -- Nothing can set this by accident, and no application code sets it at all.
  IF current_setting('app.allow_book_delete', true) = 'on' THEN
    RETURN OLD;
  END IF;

  RAISE EXCEPTION
    'Refusing to hard-delete book % (%). Set deleted_at instead — deleting cascades into order_items and user_library. See migration 20260915000000.',
    OLD.id, OLD.title
    USING ERRCODE = 'restrict_violation';
END;
$$;

COMMENT ON FUNCTION public.books_block_hard_delete() IS
  'Blocks DELETE on books unless app.allow_book_delete is set for the transaction. Books are retired with deleted_at; a hard delete cascades into sales history and customer libraries.';

DROP TRIGGER IF EXISTS trg_books_block_hard_delete ON public.books;
CREATE TRIGGER trg_books_block_hard_delete
  BEFORE DELETE ON public.books
  FOR EACH ROW
  EXECUTE FUNCTION public.books_block_hard_delete();

-- ───────────────────────────────────────────────────────────────────────────
-- 2. Make "the live catalogue" cheap to ask for.
--    Every listing gains `deleted_at IS NULL`; this keeps that free.
-- ───────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS books_active_idx
  ON public.books (product_type, created_at DESC)
  WHERE deleted_at IS NULL;

COMMENT ON COLUMN public.books.deleted_at IS
  'Retired from the catalogue when set. The ONLY supported way to remove a book: the row, its variants, its pages and its Storage files all survive, so it can be brought back with a single UPDATE. Hard deletes are blocked by trg_books_block_hard_delete.';
