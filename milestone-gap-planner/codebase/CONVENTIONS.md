# Coding Conventions

**Analysis Date:** 2026-03-06

## Naming Patterns

**Files:**
- kebab-case for component and utility files, e.g., `site-header.tsx`, `button.tsx`, `utils.ts`
- TypeScript extensions `.ts` for logic, `.tsx` for React components

**Functions:**
- camelCase for regular functions and hooks, e.g., `handleLogin`, `createClient`
- PascalCase for React component functions, e.g., `BrowsePage`, `AuthContent`

**Variables:**
- camelCase, e.g., `supabase`, `searchParams`

**Types & Interfaces:**
- PascalCase, e.g., `Book`, `BrowsePageProps`

## Code Style

**Formatting:**
- No explicit Prettier/ESLint config detected; project relies on default conventions enforced by `next lint` script.
- Indentation: 2 spaces (observed in source files).

**TypeScript Settings:**
- Strict mode enabled (`"strict": true` in `tsconfig.json`).
- `noEmit` true, targeting ES6, JSX set to `react-jsx`.

## Import Organization

**Order observed:**
1. Internal absolute imports using the `@/` alias, e.g., `import { Button } from "@/components/ui/button"`.
2. External package imports (Node modules), e.g., `import React from "react"`, `import { useRouter } from "next/navigation"`.
3. Blank line separates the two groups.

**Path Alias:**
- `@/*` maps to project root as defined in `tsconfig.json`.

## Error Handling

- Server‑side errors are logged with `console.error` and surface minimal messages to UI via `toast.error`.
- UI‑side validation errors are collected in an `errors` object and displayed using the `Alert` component.
- Async operations wrap calls in `try/catch`‑style `if (error)` checks rather than throwing.

## Logging

- `console.error` for backend/API failures.
- `toast` (from `sonner`) for user‑visible notifications (success, error, info).

## Comments

- Inline comments used to separate logical sections (e.g., `// Build the Supabase query on the server`).
- No JSDoc/TSDoc blocks present; type information is provided via TypeScript annotations.

## Function Design

- Functions are concise, often < 30 lines.
- React components are defined as functions returning JSX; pages use `export default async function` for server‑side rendering.
- Parameters are typed; optional props use interface definitions.

## Module Design

- Each component/file exports its primary component as a named export (`export { Button, buttonVariants }`).
- Page routes export a default async component (`export default async function BrowsePage`).
- No barrel (`index.ts`) files observed; imports target specific paths.

---

*Convention analysis: 2026-03-06*