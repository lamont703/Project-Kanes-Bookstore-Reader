/**
 * Pagination options for /browse.
 *
 * These live in a plain module rather than in the client component that uses
 * them. Exporting a constant from a "use client" module and importing it into a
 * Server Component does not give you the value — Next turns client-module
 * exports into client references, so the server sees a proxy. That surfaced as
 * "PER_PAGE_OPTIONS.includes is not a function" during render.
 *
 * The sizes are multiples of 12 so every page fills the grid evenly at each
 * breakpoint — the layout is 2, 3 or 4 columns, and 12 divides by all of them,
 * so no page ends on a ragged part-row.
 */
export const PER_PAGE_OPTIONS = [12, 24, 36, 60] as const
export const DEFAULT_PER_PAGE = 12
