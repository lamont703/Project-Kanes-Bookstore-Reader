/**
 * Pagination options for /browse.
 *
 * These live in a plain module rather than in the client component that uses
 * them. Exporting a constant from a "use client" module and importing it into a
 * Server Component does not give you the value — Next turns client-module
 * exports into client references, so the server sees a proxy. That surfaced as
 * "PER_PAGE_OPTIONS.includes is not a function" during render.
 */
export const PER_PAGE_OPTIONS = [10, 20, 30, 50] as const
export const DEFAULT_PER_PAGE = 10
