-- Inventory tracking for purchasable variants.
--
-- Until now `is_in_stock` was a manual boolean: an admin flipped it by hand, it
-- never changed on purchase, and nothing stopped the same last candle being sold
-- to ten people. This adds a real count.
--
-- NULL vs 0 is the important distinction:
--   NULL -> not inventory-tracked. Ebooks are infinitely reproducible, so the
--           concept does not apply. Every existing row starts here, which is why
--           this migration cannot change the behaviour of anything already sold.
--   0    -> tracked, and none left.
--
-- `is_in_stock` is deliberately kept rather than derived. It stays the single
-- flag every existing query already reads (browse, product pages, checkout), so
-- nothing has to learn about counts to keep working; the count drives the flag
-- rather than replacing it.

ALTER TABLE public.book_variants
  ADD COLUMN IF NOT EXISTS stock_quantity INTEGER;

ALTER TABLE public.book_variants
  DROP CONSTRAINT IF EXISTS book_variants_stock_quantity_non_negative;
ALTER TABLE public.book_variants
  ADD CONSTRAINT book_variants_stock_quantity_non_negative
  CHECK (stock_quantity IS NULL OR stock_quantity >= 0);

COMMENT ON COLUMN public.book_variants.stock_quantity IS
  'Units on hand. NULL means this variant is not inventory-tracked (e.g. ebooks).';

-- Find tracked variants that have run out.
CREATE INDEX IF NOT EXISTS idx_book_variants_stock_quantity
  ON public.book_variants (stock_quantity)
  WHERE stock_quantity IS NOT NULL;

-- ---------------------------------------------------------------- decrement
-- Atomic stock decrement, called once per order item at fulfilment.
--
-- Read-then-write from the application would let two concurrent webhook
-- deliveries both read "1 left" and both sell it. The row is locked FOR UPDATE
-- so the second caller waits and then sees the decremented value.
--
-- Raises rather than clamping: overselling should surface as a failed
-- fulfilment an admin can see, not as a silent negative that the CHECK
-- constraint would reject anyway.
CREATE OR REPLACE FUNCTION public.decrement_variant_stock(
  p_variant_id UUID,
  p_quantity   INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_stock INTEGER;
BEGIN
  IF p_quantity IS NULL OR p_quantity < 1 THEN
    RAISE EXCEPTION 'decrement_variant_stock: quantity must be a positive integer, got %', p_quantity;
  END IF;

  SELECT stock_quantity INTO current_stock
  FROM public.book_variants
  WHERE id = p_variant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'decrement_variant_stock: no variant with id %', p_variant_id;
  END IF;

  -- Untracked variant: nothing to decrement, and not an error.
  IF current_stock IS NULL THEN
    RETURN NULL;
  END IF;

  IF current_stock < p_quantity THEN
    RAISE EXCEPTION 'decrement_variant_stock: insufficient stock for variant % (have %, need %)',
      p_variant_id, current_stock, p_quantity;
  END IF;

  UPDATE public.book_variants
     SET stock_quantity = current_stock - p_quantity,
         -- Only ever flip the flag off. Flipping it on would override an admin
         -- who deliberately marked a variant unavailable while stock remains.
         is_in_stock = CASE
           WHEN current_stock - p_quantity <= 0 THEN FALSE
           ELSE is_in_stock
         END
   WHERE id = p_variant_id;

  RETURN current_stock - p_quantity;
END;
$$;

-- Fulfilment runs as the service role inside the Stripe webhook. No browser
-- client has any reason to move stock.
REVOKE ALL ON FUNCTION public.decrement_variant_stock(UUID, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.decrement_variant_stock(UUID, INTEGER) FROM anon;
REVOKE ALL ON FUNCTION public.decrement_variant_stock(UUID, INTEGER) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.decrement_variant_stock(UUID, INTEGER) TO service_role;
