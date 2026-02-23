-- ============================================================
-- Add Book Club Eligibility Flag
-- Allows admins to curate which books are available in the
-- initial subscription signup selection.
-- ============================================================

ALTER TABLE public.books
ADD COLUMN is_book_club_eligible BOOLEAN NOT NULL DEFAULT FALSE;

-- Index for performance when filtering the selection modal
CREATE INDEX idx_books_book_club_eligible ON public.books (is_book_club_eligible) WHERE is_book_club_eligible = TRUE;
