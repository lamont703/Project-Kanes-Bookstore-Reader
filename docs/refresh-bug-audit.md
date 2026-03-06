# 🔄 Refresh Bug Audit — "Why Users Must Refresh for Pages to Render"

**Branch:** `refresh-bug`
**Date:** 2026-03-04
**Status:** Analysis Complete — Awaiting Fixes

---

## Executive Summary

After a full scan of every page, component, context provider, Supabase client, and middleware file in the frontend codebase, I've identified **7 root-cause categories** that explain why users are frequently needing to refresh pages to see data and components render correctly. These issues range from architectural race conditions to stale-cache problems inherent to the Next.js Server/Client data flow.

---

## Table of Contents

1. [🔴 Critical: Supabase Client Singleton Not Being Used](#1--critical-supabase-client-singleton-not-being-used)
2. [🔴 Critical: Auth Context Race Condition — `getSession()` vs `getUser()`](#2--critical-auth-context-race-condition--getsession-vs-getuser)
3. [🟠 High: Server Components Serve Stale/Cached Data on Navigation](#3--high-server-components-serve-stalecached-data-on-navigation)
4. [🟠 High: `isMounted` Guard Returns `null` — Causes Flash of Empty Content](#4--high-ismounted-guard-returns-null--causes-flash-of-empty-content)
5. [🟡 Medium: Auth State Not Synced After Login/Signup (Hard Redirect Workaround)](#5--medium-auth-state-not-synced-after-loginsignup-hard-redirect-workaround)
6. [🟡 Medium: Discussion Thread Client Doesn't Receive Real-Time Updates](#6--medium-discussion-thread-client-doesnt-receive-real-time-updates)
7. [🟡 Medium: Book Detail Page Uses `createStaticClient()` — Never Sees Auth Cookies](#7--medium-book-detail-page-uses-createstaticclient--never-sees-auth-cookies)

---

## 1. 🔴 Critical: Supabase Client Singleton Not Being Used

### The Problem

The browser-side Supabase client (`lib/supabase/client.ts`) creates a **new client instance on every call** to `createClient()`. Several components handle this differently, leading to inconsistent behavior:

| File | Pattern | Risk |
|------|---------|------|
| `context/auth-context.tsx` | `useState(() => createClient())` — ✅ Singleton per component lifecycle | Low |
| `app/browse/page.tsx` | `useMemo(() => createClient(), [])` — ✅ Memoized, stable | Low |
| `app/cart/page.tsx` | `useMemo(() => createClient(), [])` — ✅ Memoized, stable | Low |
| `components/dashboard-content.tsx` | `useMemo(() => createClient(), [])` — ✅ Memoized, stable | Low |
| **`components/subscription-modal.tsx`** | **`const supabase = createClient()` — ❌ New client on EVERY RENDER** | **HIGH** |
| **`app/login/page.tsx`** | **`const supabase = createClient()` — ❌ New client on EVERY RENDER** | **HIGH** |
| **`app/book-club/discussions/discussion-thread-client.tsx`** | **`const supabase = createClient()` — ❌ New client on EVERY RENDER** | **HIGH** |

### Why This Causes Refresh Bugs

When a new Supabase client is created on every render, the auth session may not be immediately available on that new instance. The `@supabase/ssr` `createBrowserClient` does internally cache via cookies, but creating multiple instances can lead to:
- **Auth tokens not being shared** across instances in the same page load.
- **Session refresh races** where one instance refreshes the token while another uses the stale one.
- Inconsistent reads — one instance may see the user as logged in, another may not.

### Affected Pages
- **Subscription Modal** (on Book Club page) — user may appear logged out when trying to subscribe
- **Login page** — the auth client used for login may not be the same one the `AuthProvider` uses, causing a desync
- **Discussion Thread** — data mutations (posting, voting) may silently fail or lose auth

### Recommended Fix
Create a module-level singleton for the browser client:

```ts
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

let client: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
    if (!client) {
        client = createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )
    }
    return client
}
```

---

## 2. 🔴 Critical: Auth Context Race Condition — `getSession()` vs `getUser()`

### The Problem

In `context/auth-context.tsx`, the initial session check uses `supabase.auth.getSession()`:

```ts
const getInitialSession = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    setSession(session)
    const currentUser = session?.user ?? null
    setUser(currentUser)
    // ...
    setIsLoading(false)
}
```

**`getSession()` reads from local storage/memory and does NOT validate the token with the server.** Per the [Supabase docs](https://supabase.com/docs/reference/javascript/auth-getsession), this can return an **expired or invalid session**, especially after:
- The browser has been idle (token expired)
- Cookies were updated by middleware but the client cache wasn't
- Navigation back to the app from an external page

Meanwhile, the middleware (`lib/supabase/middleware.ts`) correctly uses `getUser()` for server-side checks. This creates a **split-brain** scenario:
- **Middleware** says: "user is logged in" → allows access to protected pages
- **AuthContext** says: "session is null" → header shows "Sign In", premium features hidden

**This is the single most likely cause of the "I need to refresh to see my logged-in state" bug.**

### Affected Components
- `components/site-header.tsx` — Nav links for Dashboard, Discussions, Admin don't show until refresh
- `components/book-club-content.tsx` — "Active Member" badge doesn't appear
- `components/dashboard-content.tsx` — Profile/subscription data may show stale state
- Any component using `useAuth()` — ALL of them are affected

### Recommended Fix
Replace `getSession()` with `getUser()` for the initial auth check:

```ts
const getInitialSession = async () => {
    const { data: { user: currentUser } } = await supabase.auth.getUser()

    if (currentUser) {
        // Now fetch the session for token info
        const { data: { session } } = await supabase.auth.getSession()
        setSession(session)
        setUser(currentUser)
        await fetchUserData(currentUser.id)
    } else {
        setSession(null)
        setUser(null)
        setProfile(null)
        setSubscription(null)
    }

    setIsLoading(false)
}
```

---

## 3. 🟠 High: Server Components Serve Stale/Cached Data on Navigation

### The Problem

Several critical pages use **Next.js Server Components** to fetch data:

| Page | Type | Fetches |
|------|------|---------|
| `/dashboard` | Server Component | Profile, Library, Orders, Subscription |
| `/book-club` | Server Component | Selections, Events, Subscription, Eligible Books |
| `/book-club/discussions` | Server Component | Topics list |
| `/book-club/discussions/[id]` | Server Component | Thread posts, votes |
| `/book/[id]` | Server Component (ISR, 5 min) | Book details + variants |

When a user performs a client-side navigation (e.g., clicking "My Library" in the header), **Next.js may serve a cached RSC payload** from its client-side Router Cache. This means:

1. User subscribes to the Book Club → clicks "My Library" → **sees old data** (no subscription reflected)
2. User purchases a book → navigates to Dashboard → **book not in library** until refresh
3. User posts in a discussion → goes back to discussion list → **post count is stale**

The **Router Cache** in Next.js App Router caches RSC payloads for **30 seconds** (dynamic pages) or **5 minutes** (static pages by default), meaning navigating via `<Link>` or `router.push()` won't re-fetch server data.

### Why This is Especially Bad Here

- The Dashboard page fetches ALL data server-side and passes it as `initialUser`, `initialLibrary`, `initialOrders`, `initialSubscription` props. The client component (`DashboardContent`) has no mechanism to re-fetch this data.
- The Book Club page similarly pre-fetches everything. After subscribing via SubscriptionModal, the `isMember` flag is stale.
- The Book Detail page (`/book/[id]`) uses `revalidate = 300` (ISR), meaning data can be up to 5 minutes old.

### Recommended Fixes

**Option A: Add `router.refresh()` after mutations** — Force Next.js to re-fetch Server Component data:
```ts
// After successful subscription, checkout, etc.
import { useRouter } from 'next/navigation'
const router = useRouter()
router.refresh() // Re-runs all Server Components on the current page
```

**Option B: Hybrid approach** — Keep server-side initial fetch, but add client-side "freshness check" to DashboardContent and BookClubContent. On mount, silently re-fetch critical data client-side and update local state if different.

**Option C: Convert critical pages to client-side fetching** — For pages like Dashboard where staleness is very visible, fetch data client-side with loading states.

---

## 4. 🟠 High: `isMounted` Guard Returns `null` — Causes Flash of Empty Content

### The Problem

Multiple pages use the `isMounted` pattern to avoid SSR hydration mismatches:

```tsx
// app/browse/page.tsx
const [isMounted, setIsMounted] = useState(false)
useEffect(() => { setIsMounted(true) }, [])
if (!isMounted) return null  // ← Returns NOTHING on server & first render
```

**Affected Pages:**
- `/browse` — `if (!isMounted) return null`
- `/cart` — `if (!isMounted) return null`
- `/checkout` — `if (!isMounted) return null`
- `/read/[id]` — `if (!isMounted) return null` (implicitly, via loading state)

### Why This Causes "Blank Page Until Refresh"

1. On initial server render, the page returns `null` (nothing).
2. On client hydration, React must reconcile `null` → full page content.
3. If hydration is slow, delayed, or interrupted (slow network, large JS bundle), the user sees a **blank white screen** that may persist for seconds.
4. In some edge cases (especially on slower devices or with suspense boundaries), the `useEffect` that sets `isMounted` may fire late, making users think the page is broken.

### Recommended Fix

Instead of returning `null`, return a **skeleton/loading state** that matches the eventual layout:

```tsx
if (!isMounted) {
    return (
        <div className="min-h-screen">
            <SiteHeader />
            <div className="container mx-auto px-4 py-8">
                <Skeleton className="h-12 w-64 mb-8" />
                <div className="grid grid-cols-4 gap-6">
                    {[1,2,3,4].map(i => <Skeleton key={i} className="aspect-[2/3]" />)}
                </div>
            </div>
        </div>
    )
}
```

---

## 5. 🟡 Medium: Auth State Not Synced After Login/Signup (Hard Redirect Workaround)

### The Problem

The login page currently uses `window.location.href = redirectPath` after successful login:

```ts
// app/login/page.tsx (line 66-67)
// Use window.location.href for a full refresh to ensure cookies and state are synced
window.location.href = redirectPath
```

This is a **workaround** for the fact that the auth context doesn't properly pick up the new session. The comment even admits it: "to ensure cookies and state are synced". Similarly, the subscription modal uses `window.location.reload()` after completing a subscription.

### Why This is a Problem

- `window.location.href` triggers a **full page reload** — all React state is destroyed and rebuilt.
- This is slow and jarring for users (flash of white, re-download of JS, re-render everything).
- It masks the root cause: the `AuthContext` and middleware aren't properly syncing after auth state changes.

### The Real Fix

Once issues #1 and #2 (singleton client + `getUser()`) are fixed, the `onAuthStateChange` listener in `AuthContext` should properly detect login/signup events. At that point, you can replace:

```ts
window.location.href = redirectPath
```

with:

```ts
router.push(redirectPath)
router.refresh()
```

This gives a smooth SPA navigation while still refreshing server data.

---

## 6. 🟡 Medium: Discussion Thread Client Doesn't Receive Real-Time Updates

### The Problem

`discussion-thread-client.tsx` receives `initialPosts` from the server and stores them in local state. However, **there is no Supabase Realtime subscription** to listen for new posts from other users. The component only updates when the *current user* posts (via optimistic local updates).

### Implications

- If User A posts a comment and User B is already on the same thread, User B **won't see the new comment** until they refresh.
- The post count shown in the header (`{totalPosts} Transmissions`) goes stale.
- Vote counts from other users are never updated.

### Recommended Fix

Add a Supabase Realtime subscription to the discussion thread:

```ts
useEffect(() => {
    const channel = supabase
        .channel(`discussion-${topic.id}`)
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'discussion_posts',
            filter: `topic_id=eq.${topic.id}`
        }, (payload) => {
            // Fetch the full post with user info and add to state
        })
        .subscribe()

    return () => { supabase.removeChannel(channel) }
}, [topic.id])
```

---

## 7. 🟡 Medium: Book Detail Page Uses `createStaticClient()` — Never Sees Auth Cookies

### The Problem

`app/book/[id]/page.tsx` uses `createStaticClient()` instead of `createClient()`:

```ts
export default async function BookDetailPage({ params }) {
    const { id } = await params
    const supabase = createStaticClient()  // ← No cookies, no auth
    // ...
}
```

The `createStaticClient()` function (`lib/supabase/server.ts`) creates a plain Supabase client **without cookie handling**. This means:

1. The book detail page can never know if the user is logged in.
2. Any RLS policies on `books` or `book_variants` that filter by authenticated user won't work.
3. If you later want to show "You own this book" or "Add to Library" states, the server component won't have the auth info.

### Why This Was Done

This was likely done because the page uses `generateStaticParams()` for ISR, which runs at build time when there are no cookies. The `createStaticClient` was a valid workaround for `generateStaticParams`, but the actual page render at request time should use the cookie-aware `createClient()`.

### Recommended Fix

Use `createStaticClient` only in `generateStaticParams()` and the cookie-aware `createClient()` for the page itself:

```ts
export async function generateStaticParams() {
    const supabase = createStaticClient()  // ✅ Fine for build-time
    // ...
}

export default async function BookDetailPage({ params }) {
    const supabase = await createClient()  // ✅ Cookie-aware at request time
    // ...
}
```

---

## Summary of All Issues by Severity

| # | Severity | Issue | Pages Affected | Fix Complexity |
|---|----------|-------|----------------|----------------|
| 1 | 🔴 Critical | Supabase client not singleton — multiple instances per page | Subscription Modal, Login, Discussions | Easy |
| 2 | 🔴 Critical | Auth context uses `getSession()` instead of `getUser()` — stale/expired sessions | ALL authenticated pages | Easy |
| 3 | 🟠 High | Server Components serve stale cached data on navigation | Dashboard, Book Club, Discussions | Medium |
| 4 | 🟠 High | `isMounted` guard returns `null` — blank page flash | Browse, Cart, Checkout | Easy |
| 5 | 🟡 Medium | Hard redirects (`window.location.href`) used as auth sync workaround | Login, Subscription Modal | Easy (after #1 & #2) |
| 6 | 🟡 Medium | No Realtime subscriptions for discussion threads | Discussion Thread | Medium |
| 7 | 🟡 Medium | Book Detail uses `createStaticClient()` — no auth context | Book Detail (`/book/[id]`) | Easy |

---

## Recommended Fix Order

1. **Fix #1** (Singleton client) — This is a 1-line change that fixes the foundation.
2. **Fix #2** (Auth context `getUser()`) — This is the single biggest impact fix.
3. **Fix #4** (Skeleton loading states) — Quick win, immediately improves perceived reliability.
4. **Fix #5** (Replace `window.location.href` with `router.push()` + `router.refresh()`) — Smooth navigation after login.
5. **Fix #3** (Server Component cache invalidation) — Add `router.refresh()` calls after mutations.
6. **Fix #7** (Book Detail auth-aware client) — Low effort, future-proofs the page.
7. **Fix #6** (Realtime subscriptions) — Bigger lift, lower priority for the "refresh bug" itself.

---

## Files to Modify

| File | Changes |
|------|---------|
| `lib/supabase/client.ts` | Convert to singleton pattern |
| `context/auth-context.tsx` | Replace `getSession()` with `getUser()`, add error handling |
| `components/subscription-modal.tsx` | Use `useMemo` for client; replace `window.location.reload()` with `router.refresh()` |
| `app/login/page.tsx` | Use `useMemo` for client; replace `window.location.href` with `router.push()` + `router.refresh()` |
| `app/book-club/discussions/discussion-thread-client.tsx` | Use `useMemo` for client |
| `components/site-header.tsx` | Replace `window.location.href` with `router.push()` + `router.refresh()` |
| `app/browse/page.tsx` | Replace `return null` with skeleton loading |
| `app/cart/page.tsx` | Replace `return null` with skeleton loading |
| `app/checkout/page.tsx` | Replace `return null` with skeleton loading |
| `app/book/[id]/page.tsx` | Use `createClient()` for page render (keep `createStaticClient()` for `generateStaticParams` only) |
| `components/dashboard-content.tsx` | Add client-side refresh mechanism after mutations |
| `app/book-club/discussions/discussion-thread-client.tsx` | Add Realtime subscription for live updates |


we create a discussion in the http://localhost:3000/admin/discussions page and linked it to a volume book but it did not update the UI in the book club page with the discussion for the chat button. the chat button still shows no chat. what is the issue here


on our http://localhost:3000/book-club page in the monthly book selection and past monthly selection there is a chat button on the component that should be able to open the discussion linked to that chat. are you able to see what i'm referring to? when users click the chat button on the monthly selections they should navigate to the chat for that book if there is a discussion created for it. let me know what you see and i'll let you know if we should execute