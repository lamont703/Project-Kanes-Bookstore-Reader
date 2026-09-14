-- Public sales totals, so /browse can offer a "most purchased" sort.
--
-- order_items is readable only by the customer who owns the order or an admin
-- (order_items_select_own / order_items_all_admin), which is correct — an order
-- line names what a specific person bought. But a bestseller list needs the sum
-- across everyone, and a shopper browsing the catalogue is neither of those.
--
-- SECURITY DEFINER, deliberately and narrowly. The function returns two columns:
-- a book id and how many units it has sold. No order, no customer, no date, no
-- price — nothing that could identify a purchaser or reconstruct an order.
-- Aggregate popularity is what a storefront publishes on purpose; that is the
-- whole point of a bestseller shelf.
--
-- Written as a function rather than a view because a SECURITY DEFINER view
-- carries its owner's rights implicitly and reads as an oversight; a function
-- says what it is doing.
--
-- search_path is pinned. A SECURITY DEFINER routine that resolves unqualified
-- names through the caller's search_path can be tricked into running the
-- caller's objects with the owner's privileges.

CREATE OR REPLACE FUNCTION public.book_sales_totals()
RETURNS TABLE (book_id UUID, units BIGINT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  -- Paid orders only. 'pending' is a checkout that has not completed, and
  -- counting those would let anyone inflate a book's ranking by filling a cart.
  -- order_status_enum has no cancelled value — all sales are final by design —
  -- so confirmed and fulfilled are every order that represents real money.
  SELECT oi.book_id, SUM(oi.quantity)::BIGINT AS units
  FROM public.order_items oi
  JOIN public.orders o ON o.id = oi.order_id
  WHERE o.status IN ('confirmed', 'fulfilled')
  GROUP BY oi.book_id
$$;

COMMENT ON FUNCTION public.book_sales_totals() IS
  'Units sold per book across all paid orders. SECURITY DEFINER so the public catalogue can sort by popularity without reading order_items, which is owner-scoped. Returns aggregates only — no customer or order detail.';

GRANT EXECUTE ON FUNCTION public.book_sales_totals() TO anon, authenticated;
