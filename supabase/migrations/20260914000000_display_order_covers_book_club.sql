-- books.display_order now orders the book club free picks too.
--
-- Migration 20260913000000 added the column for the merchandise sections on
-- /morefunk and said so in its comment. The book club's free-pick list has the
-- same problem and the same shape — a hand-picked run of books an admin wants in
-- a deliberate order — so it reuses the column rather than growing a second one.
--
-- The two uses cannot collide: merch rows are product_type = 'merch' and free
-- picks are product_type = 'book', so no row is ever in both lists. What the
-- number means is "position in whichever list this row appears in".
--
-- This migration changes no data and no structure. It corrects a comment that
-- would otherwise send the next reader looking for a merch-only column, which is
-- exactly the kind of quiet wrongness that makes a schema untrustworthy.
--
-- No index for the book club case on purpose: the filtered set is single digits
-- out of a few hundred books, so an index would cost more to maintain than the
-- sort it saves. The merch partial index from 20260913000000 stands.

COMMENT ON COLUMN public.books.display_order IS
  'Manual position within the list this book or product appears in: a merchandise category on /morefunk, or the book club free picks on /book-club. NULL means unarranged; both pages sort NULLS LAST then by title. Set by the More Funk and Book Club page editors.';
