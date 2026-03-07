# Codebase Structure

**Analysis Date:** 2026-03-06

## Directory Layout

```
project-root/
├── .planning/                     # Planning artefacts (this directory)
│   └── codebase/                  # Generated architecture docs
├── app/                           # Next.js App Router pages and layout
│   ├── admin/                    # Admin UI routes
│   ├── book-club/                 # Book club pages
│   ├── browse/                    # Browse catalogue
│   ├── cart/                      # Shopping cart UI
│   ├── checkout/                  # Checkout flow UI
│   ├── dashboard/                 # User dashboard UI
│   ├── layout.tsx                 # Root layout, sets providers & analytics
│   └── page.tsx                   # Landing page (entry point)
├── components/                    # Re‑usable UI components
│   ├── admin/                     # Admin‑specific components
│   ├── checkout/                  # Checkout UI pieces
│   ├── ui/                        # Primitive UI (buttons, cards, etc.)
│   └── providers.tsx              # Wraps AuthProvider & CartProvider
├── context/                       # React context for global state
│   ├── auth-context.tsx           # Authentication context
│   └── cart-context.tsx           # Shopping cart context
├── lib/                           # Helper libraries
│   ├── supabase/                  # Supabase client wrappers
│   │   ├── client.ts              # Browser client singleton
│   │   └── server.ts              # SSR‑aware server client
│   └── ...                         # Other utility libraries (e.g., PDF processor)
├── supabase/                      # Supabase backend assets
│   ├── migrations/                # PostgreSQL schema migrations
│   │   ├── 20260221000000_initial_schema.sql
│   │   └── 20260221000001_rls_policies.sql
│   └── functions/                 # Edge Functions (Deno runtime)
│       ├── _shared/               # Shared helpers (CORS, errors, SDK clients)
│       ├── create-subscription/   # Subscription creation flow
│       ├── cancel-subscription/   # Cancel flow
│       ├── stripe-webhook/         # Stripe webhook handler
│       └── ...
├── scripts/                       # Development and utility scripts
│   ├── check-books.mjs
│   ├── debug-checkout.ts
│   └── test-pdf/                  # PDF processing test harness
├── public/                        # Static assets (images, favicons)
├── next.config.mjs                # Next.js configuration
├── package.json                   # npm manifest (frontend dependencies)
└── tsconfig.json                  # TypeScript configuration
```

## Directory Purposes

**`app/`**
- Purpose: Houses all Next.js routes using the App Router. Contains server and client components, page definitions, and layout hierarchy.
- Key files: `app/layout.tsx` (root layout), `app/page.tsx` (landing page).

**`components/`**
- Purpose: Reusable UI building blocks, organized by feature area.
- Key files: `components/ui/button.tsx`, `components/providers.tsx`.

**`context/`**
- Purpose: Global React state management via Context API.
- Key files: `context/auth-context.tsx`, `context/cart-context.tsx`.

**`lib/`**
- Purpose: Utility libraries and wrappers around external services.
- Key files: `lib/supabase/client.ts`, `lib/supabase/server.ts`.

**`supabase/`**
- Purpose: Backend infrastructure – database migrations and serverless edge functions.
- Key files: `supabase/migrations/20260221000000_initial_schema.sql`, `supabase/functions/create-subscription/index.ts`.

**`scripts/`**
- Purpose: Development scripts for maintenance, testing, and PDF processing.
- Key files: `scripts/debug-checkout.ts`.

## Key File Locations

**Entry Points:**
- `app/layout.tsx`: Sets up global providers and analytics.
- `app/page.tsx`: Main landing page rendering.
- `supabase/functions/<function>/index.ts`: HTTP entry points for each Edge Function.

**Configuration:**
- `next.config.mjs`: Next.js build and runtime configuration.
- `package.json`: Front‑end package dependencies.
- `tsconfig.json`: TypeScript compiler options.

**Core Logic:**
- UI components in `components/` and page logic in `app/`.
- Supabase client helpers in `lib/supabase/`.
- Business logic in Edge Functions under `supabase/functions/`.

**Testing:**
- No dedicated test folder detected; test scripts reside in `scripts/`.

## Naming Conventions

**Files:**
- PascalCase for React components (`*.tsx`), kebab‑case for utility scripts (`*.ts`, `*.mjs`).

**Directories:**
- Feature‑focused grouping (e.g., `components/ui/`, `supabase/functions/`).

## Where to Add New Code

**New Feature (frontend):**
- Primary implementation: `app/<feature>/` (add page or route).
- UI components: `components/<feature>/`.
- State concerns: add context in `context/` if global.
- Tests (if added later): place alongside component or under a dedicated `tests/` folder.

**New Edge Function:**
- Create a subfolder under `supabase/functions/` with `index.ts` and share utils via `_shared/`.
- Add corresponding migration in `supabase/migrations/` if DB changes required.

**Utility Script:**
- Place in `scripts/` with a descriptive name, e.g., `scripts/cleanup-old-data.ts`.

## Special Directories

**`.planning/`**
- Generated planning artefacts; not part of production build. Committed for documentation purposes.

---

*Structure analysis: 2026-03-06*