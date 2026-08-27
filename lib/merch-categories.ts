/**
 * Merchandise categories.
 *
 * Rows in public.merch_categories since migration 20260827000000, not a Postgres
 * enum — which is what lets an admin add one without a schema change.
 */
export interface MerchCategoryRow {
    /** The value stored in books.merch_category. */
    name: string
    /** What the shop and the admin show. */
    label: string
    sort_order: number
    is_active: boolean
    /** True when products here are sold per size, which the product form keys off. */
    is_sized: boolean
}

/**
 * The four categories that existed as enum values, used to paint the pickers
 * before the real rows arrive so the field is never briefly empty. Kept in the
 * same order the enum had.
 */
export const FALLBACK_MERCH_CATEGORIES: MerchCategoryRow[] = [
    { name: "candle", label: "Candles", sort_order: 1, is_active: true, is_sized: false },
    { name: "soap", label: "Foam Soap", sort_order: 2, is_active: true, is_sized: false },
    { name: "apparel", label: "Apparel", sort_order: 3, is_active: true, is_sized: true },
    { name: "accessory", label: "Accessories", sort_order: 4, is_active: true, is_sized: false },
]

/**
 * Turn a typed label into the key stored on the product.
 *
 * The seeded four keep their original keys, so this only ever names new
 * categories — nothing already filed under 'candle' has to move.
 */
export function slugifyCategory(label: string): string {
    return label
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 40)
}
