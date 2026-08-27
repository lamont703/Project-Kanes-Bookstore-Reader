/**
 * Price for display, with thousands separators.
 *
 * Grouping is the only thing this adds. Decimals are left exactly as the value
 * carries them, so $18 stays "18" rather than becoming "18.00" — the price tags
 * on /browse are deliberately terse and padding them would change how every
 * ordinary book looks in order to fix the rare expensive one.
 *
 *   18      -> "18"
 *   18.5    -> "18.5"
 *   18.99   -> "18.99"
 *   999     -> "999"
 *   1000    -> "1,000"
 *   24000   -> "24,000"
 *
 * Does not include the currency symbol; callers own that, because several of
 * them render a range and want one symbol rather than two.
 */
export function formatPrice(value: number): string {
    if (!Number.isFinite(value)) return "0"
    return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value)
}
