-- Admin-controlled dealer discount: a settable default, and a guard rail.
--
-- The per-code rate already worked: promo_codes.discount_percent is read at
-- checkout (supabase/functions/process-checkout), so changing a row changes what
-- that dealer's code takes off. What was missing was any way to change it, and
-- any way to change what a NEW code is issued at — the stripe-webhook wrote a
-- literal 35, and the column default is 35, so 35 was the only rate the system
-- could ever produce.
--
-- The default lives in a settings row rather than in the column default because
-- an admin cannot issue DDL: changing a column default means ALTER TABLE, which
-- is a migration, which is exactly what made this unbuildable before.
--
-- app_settings is deliberately generic (key -> jsonb). It is the first of these,
-- but "a value an admin sets that the backend reads" is a shape this app will
-- want again, and a single-purpose table would have to be replaced the first
-- time it does.

CREATE TABLE IF NOT EXISTS public.app_settings (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Who last changed it. ON DELETE SET NULL: losing the admin account must not
  -- take the site's configuration with it.
  updated_by  UUID REFERENCES public.users(id) ON DELETE SET NULL
);

COMMENT ON TABLE public.app_settings IS
  'Operator-set values the backend reads at runtime. Key/value so a new setting needs no migration.';

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Admins only. Everything that reads this from the server side (the Stripe
-- webhook issuing a code) uses the service role, which bypasses RLS entirely, so
-- there is no need to expose it to anonymous or ordinary logged-in readers.
DROP POLICY IF EXISTS app_settings_all_admin ON public.app_settings;
CREATE POLICY app_settings_all_admin ON public.app_settings
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Seed at the rate in force today, so nothing changes until an admin changes it.
INSERT INTO public.app_settings (key, value)
VALUES ('dealer_discount_default', '35'::JSONB)
ON CONFLICT (key) DO NOTHING;

-- A percentage outside 0..100 is not a discount, it is a bug — and this column
-- now takes values typed into an admin form rather than one hardcoded constant.
-- Every existing row is 35, so this validates cleanly.
ALTER TABLE public.promo_codes DROP CONSTRAINT IF EXISTS promo_codes_discount_percent_range;
ALTER TABLE public.promo_codes ADD CONSTRAINT promo_codes_discount_percent_range
  CHECK (discount_percent >= 0 AND discount_percent <= 100);
