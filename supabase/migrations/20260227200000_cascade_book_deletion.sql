-- ============================================================
-- Kane's Komet Book Reader — Cascade Deletion for Books
-- Migration: 20260227200000_cascade_book_deletion.sql
-- Goal: Fix 409 Conflict when deleting books from UI
-- ============================================================

-- 1. Update order_items to cascade (or set null - but CASCADE better for "cleanup")
ALTER TABLE public.order_items
  DROP CONSTRAINT order_items_book_id_fkey,
  ADD CONSTRAINT order_items_book_id_fkey
  FOREIGN KEY (book_id) REFERENCES public.books(id) ON DELETE CASCADE;

-- 2. Update user_library to cascade
ALTER TABLE public.user_library
  DROP CONSTRAINT user_library_book_id_fkey,
  ADD CONSTRAINT user_library_book_id_fkey
  FOREIGN KEY (book_id) REFERENCES public.books(id) ON DELETE CASCADE;

-- 3. Update book_club_selections to cascade
ALTER TABLE public.book_club_selections
  DROP CONSTRAINT book_club_selections_book_id_fkey,
  ADD CONSTRAINT book_club_selections_book_id_fkey
  FOREIGN KEY (book_id) REFERENCES public.books(id) ON DELETE CASCADE;
