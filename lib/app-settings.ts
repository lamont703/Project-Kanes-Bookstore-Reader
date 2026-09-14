/**
 * Keys in public.app_settings (migration 20260913000001).
 *
 * Shared so the admin API, the admin UI and the Stripe webhook that issues a
 * dealer code all name the same string. A typo here is silent — a misspelled key
 * reads as "unset" and quietly falls back — so it is worth the one constant.
 */

/** Percent a newly issued Kane dealer code is created at. */
export const DEALER_DISCOUNT_DEFAULT_KEY = "dealer_discount_default"

/**
 * What to use when the setting has never been written.
 *
 * 35 because that is the rate the app issued codes at before it was
 * configurable, so an unseeded database behaves exactly as it did.
 */
export const FALLBACK_DEALER_DISCOUNT = 35
