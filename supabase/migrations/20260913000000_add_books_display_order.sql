-- Manual display order for merchandise on /morefunk.
--
-- The shop groups products into one section per merch category and, inside each
-- section, ordered them alphabetically by title. So the only way to influence
-- the running order was to rename a product. This column is what the drag
-- handles in the More Funk page editor write.
--
-- Nullable on purpose. NULL means "never arranged", and the page sorts
-- NULLS LAST and then by title, so every product that exists today keeps exactly
-- the position it has now, and a product added later lands at the end of its
-- section instead of jumping to the front. The editor assigns 1..n across a
-- whole category the first time any of its products is dragged, so a category is
-- either fully arranged or not arranged at all — there is no half state where
-- some products sort ahead of the alphabetical remainder for no visible reason.
--
-- On books rather than a side table: merch_category already lives on this row,
-- the row is what the shop reads, and a join would buy nothing. The column is
-- catalog-wide rather than merch-only because books.product_type already
-- discriminates, and /browse simply does not read it — its order comes from the
-- shopper's own sort control, which a fixed order would fight.

ALTER TABLE public.books ADD COLUMN IF NOT EXISTS display_order INTEGER;

COMMENT ON COLUMN public.books.display_order IS
  'Manual position within a merchandise category on /morefunk. NULL means unarranged; the page sorts NULLS LAST then by title. Set by the More Funk page editor.';

-- The only read pattern is "this category, in order".
CREATE INDEX IF NOT EXISTS books_merch_display_order_idx
  ON public.books (merch_category, display_order)
  WHERE product_type = 'merch';
