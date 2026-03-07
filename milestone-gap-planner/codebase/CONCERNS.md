# Codebase Concerns

**Analysis Date:** 2026-03-06

## Tech Debt

**Supabase Function Handler Size:**
- Issue: Functions such as `supabase/functions/stripe-webhook/index.ts` (348 lines) and `app/read/[id]/page.tsx` (713 lines) contain extensive monolithic logic, mixing request handling, business rules, and side‑effects.
- Files: `supabase/functions/stripe-webhook/index.ts`, `app/read/[id]/page.tsx`
- Impact: Hard to test, reason about, and modify; increases risk of regressions.
- Fix approach: Split into smaller, purpose‑focused modules (e.g., separate webhook event processors, extract UI logic to custom hooks, and move data‑fetching to services).

**Overuse of `any` Types:**
- Issue: The codebase contains 64 occurrences of the `any` type across many files, reducing type safety and increasing runtime errors.
- Files: `supabase/functions/stripe-webhook/index.ts`, `supabase/functions/upload-book/pdf-parser.ts`, `lib/book/pdf-processor.ts`, `app/api/checkout/route.ts`, etc.
- Impact: Undetected bugs, harder IDE assistance, and poorer maintainability.
- Fix approach: Introduce strict TypeScript typings, enable `noImplicitAny` in `tsconfig.json`, and progressively replace `any` with concrete interfaces.

**Repeated Environment Variable Access:**
- Issue: Multiple files directly read `process.env` / `Deno.env` inline (e.g., `app/api/admin/process-book/route.ts`, many Supabase functions). This scatters configuration logic.
- Files: `app/api/admin/process-book/route.ts`, `supabase/functions/*`, `app/api/*`
- Impact: Inconsistent handling of missing vars, harder to audit secrets usage.
- Fix approach: Centralise env access in a config helper that validates required vars at startup.

## Known Bugs

**Missing Authorization Fallback:**
- Issue: `app/api/admin/process-book/route.ts` checks `if (secret && authHeader !== `Bearer ${secret}`)`, which allows any request when `INTERNAL_API_SECRET` is undefined.
- File: `app/api/admin/process-book/route.ts`
- Symptoms: Unauthorized callers can invoke PDF processing if the env var is absent.
- Workaround: Ensure the secret env var is always set in production.

## Security Considerations

**Broad `any` for Supabase Client:**
- Risk: Using `any` for the Supabase client bypasses compile‑time checks, potentially allowing unsafe queries.
- Files: All Supabase functions (e.g., `stripe-webhook`, `upload-book`, `process-checkout`).
- Current mitigation: Runtime errors will surface, but no static guarantees.
- Recommendations: Type the client with the generated `Database` types (`supabase/functions/_shared/supabase-client.ts`), enforce row‑level security policies (already present in migrations).

**Empty Fallback for Webhook Secret:**
- Risk: `stripe.webhooks.constructEventAsync(..., Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '')` falls back to an empty string, which will cause signature verification to always fail silently if the secret is missing, potentially leading to unprocessed events.
- File: `supabase/functions/stripe-webhook/index.ts`
- Recommendation: Throw an error at cold start if the secret is undefined.

## Performance Bottlenecks

**Serial Await in Loops:**
- Issue: In `stripe-webhook` handlers, loops such as `for (const item of items) { await supabase.from(...).upsert(...) }` execute DB writes sequentially.
- File: `supabase/functions/stripe-webhook/index.ts`
- Impact: Increased latency for bulk operations (e.g., granting library access for many items).
- Improvement path: Use `Promise.all` to batch writes where order is not critical.

**Large Page Component Rendering:**
- Issue: `app/read/[id]/page.tsx` maintains massive state and performs many side‑effects in a single component, causing re‑renders on every state change.
- File: `app/read/[id]/page.tsx`
- Impact: UI lag on low‑end devices, especially when highlighting or bookmarking frequently.
- Improvement: Extract stateful logic into custom hooks, memoise derived data, and split UI into sub‑components.

## Maintainability

**Duplication of Fetch Logic:**
- Issue: Multiple functions repeat similar Supabase fetch patterns (e.g., fetching user, book metadata, progress) instead of a shared service layer.
- Files: `app/read/[id]/page.tsx`, `app/api/checkout/route.ts`, `app/api/admin/users/route.ts`.
- Impact: Inconsistent error handling, harder updates.
- Fix: Create a reusable `supabaseService.ts` with typed helper functions.

**Mixed Concerns in API Routes:**
- Issue: API route files combine request validation, business logic, and response formatting.
- Files: `app/api/checkout/route.ts`, `app/api/admin/process-book/route.ts`.
- Impact: Hard to unit test; increases coupling.
- Fix: Separate controller, service, and schema validation layers.

---

*Concerns audit: 2026-03-06*