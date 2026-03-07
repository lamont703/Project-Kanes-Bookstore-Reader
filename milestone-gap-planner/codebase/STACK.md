# Technology Stack

**Analysis Date:** 2026-03-06

## Languages

**Primary:**
- TypeScript (used throughout `src/`, `app/`, `supabase/functions/`)
- JavaScript (legacy files, if any)

**Secondary:**
- Deno (runtime for edge functions under `supabase/functions/`)

## Runtime

**Environment:**
- Node.js (used by Next.js front‑end) – version not pinned in repo
- Deno (used by Supabase edge functions) – version not pinned in repo

**Package Manager:**
- npm (detected `package-lock.json` lockfile)
- Lockfile: present (`package-lock.json`)

## Frameworks

**Core:**
- Next.js 16.0.10 – full‑stack React framework (`next` dependency in `package.json`, scripts `next dev`, `next build`)
- React 19.2.0 – UI library used across `app/` and components

**Testing:**
- Not detected (no Jest/Vitest config found)

**Build/Dev:**
- Tailwind CSS 4.1.9 – utility‑first CSS (`tailwindcss` devDependency, `postcss.config.mjs`)
- PostCSS 8.5 – CSS processing (`postcss` devDependency)
- Typescript 5 – static typing (`typescript` devDependency)

## Key Dependencies

**Critical:**
- `@stripe/react-stripe-js` ^5.6.0 – Stripe client for payment UI (used in front‑end components)
- `@stripe/stripe-js` ^8.8.0 – Stripe JavaScript SDK
- `@supabase/supabase-js` ^2.97.0 – Supabase client for data/API access
- `stripe` ^20.3.1 – Stripe server SDK used in Supabase edge functions (`supabase/functions/_shared/stripe-client.ts`)
- `@supabase/ssr` ^0.8.0 – Supabase SSR helper

**Infrastructure:**
- `autoprefixer` ^10.4.20 – CSS autoprefixing
- `postcss` ^8.5 – CSS processing
- `tailwindcss` ^4.1.9 – styling
- `date-fns` 4.1.0 – date utilities
- `zod` 3.25.76 – schema validation

## Configuration

**Environment:**
- Configuration via `.env*` files (presence noted, contents omitted for security) – provides `STRIPE_SECRET_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` etc.
- `next.config.mjs` enables unoptimized images and experimental server component external packages (e.g., `mupdf`).

**Build:**
- `next.config.mjs`, `postcss.config.mjs`, `tsconfig.json` drive build and type‑checking.

## Platform Requirements

**Development:**
- Node.js (compatible with Next.js 16) and npm.
- Deno runtime for Supabase edge functions.

**Production:**
- Vercel (default hosting for Next.js) or any Node‑compatible platform.

---

*Stack analysis: 2026-03-06*