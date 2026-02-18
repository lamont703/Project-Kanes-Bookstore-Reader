# Phase 1: Frontend Audit — Technical Specification

**Project:** Kane's Komet Book Reader  
**Phase:** 1 of 6 — Frontend Audit  
**Date:** 2026-02-18  
**Stack:** Next.js 14+ (App Router), React, TypeScript, TailwindCSS, localStorage  

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Application Architecture Overview](#2-application-architecture-overview)
3. [Route Map & Page Inventory](#3-route-map--page-inventory)
4. [Component Inventory](#4-component-inventory)
5. [Data Models (Frontend Interfaces)](#5-data-models-frontend-interfaces)
6. [User Interactions & Event Catalog](#6-user-interactions--event-catalog)
7. [Forms & Validation Logic](#7-forms--validation-logic)
8. [Dynamic Data Displays](#8-dynamic-data-displays)
9. [State Management & Client Storage](#9-state-management--client-storage)
10. [Authentication & Authorization](#10-authentication--authorization)
11. [Backend Data Requirements Summary](#11-backend-data-requirements-summary)
12. [API Endpoint Recommendations](#12-api-endpoint-recommendations)
13. [Identified Gaps & Risks](#13-identified-gaps--risks)

---

## 1. Executive Summary

The Kane's Komet Book Reader is a Next.js-based book commerce and reading platform with the following primary feature domains:

- **E-Commerce:** Browse catalog, view book details, select format variants (ebook / paper book / Komet Card), add to cart, checkout with shipping & payment, order confirmation.
- **Book Club Subscription:** Multi-step subscription sign-up flow ($49.99 initial + $3.99/mo), including personal info collection, book selection (2 of 5), t-shirt size, and payment.
- **Digital Reader:** Full in-browser chapter-by-chapter reader with highlights, bookmarks, notes, reading progress tracking, and customizable display settings.
- **Community:** Discussion forums, events calendar with RSVP.
- **User Dashboard:** Personal library showing purchased & reading books with progress indicators.
- **Admin Panel:** Full CRUD management for catalog, book club monthly selections, discussion topics, events, and user management.

**Current State:** All data is served from static mock data files and persisted to `localStorage`. There is **no backend, no API, and no real authentication**. The frontend is the single source of truth for the current data model.

---

## 2. Application Architecture Overview

### 2.1 Framework & Rendering

| Concern | Implementation |
|---|---|
| Framework | Next.js (App Router) |
| Language | TypeScript |
| Rendering | Mix of Server Components (SSG for static pages like book detail) and Client Components (`"use client"`) |
| Styling | TailwindCSS + CSS custom properties for theming |
| Fonts | Google Fonts: Geist, Geist_Mono, Bebas_Neue (`--font-display`), Montserrat (`--font-hero`) |
| Icons | Lucide React |
| UI Components | Radix UI primitives (Dialog, DropdownMenu, Select, Switch, Tabs) wrapped in shadcn/ui component library |
| Analytics | Vercel Analytics (`@vercel/analytics/next`) |
| Notifications | Sonner toast library |

### 2.2 Directory Structure

```
app/
├── page.tsx                    # Landing page (SSC)
├── layout.tsx                  # Root layout
├── globals.css                 # Global styles / theme tokens
├── login/page.tsx              # Auth (Login/Register) — Client
├── browse/page.tsx             # Book catalog — Client
├── book/[id]/page.tsx          # Book detail — SSG
├── cart/page.tsx                # Shopping cart — Client
├── checkout/page.tsx           # Checkout — Client
├── dashboard/page.tsx          # User library — SSC
├── read/[id]/page.tsx          # Digital reader — Client
├── book-club/
│   ├── page.tsx                # Book Club landing — Client
│   ├── discussions/page.tsx    # Discussion list — SSC
│   ├── discussions/[id]/page.tsx # Discussion thread
│   └── events/page.tsx         # Events list — SSC
└── admin/
    ├── layout.tsx              # Admin shell (sidebar + mobile header) — Client
    ├── page.tsx                # Admin dashboard — SSC
    ├── books/page.tsx          # Catalog management — Client
    ├── books/new/page.tsx      # Add new book — Client
    ├── books/[id]/edit/page.tsx # Edit book — Client
    ├── book-club/page.tsx      # Monthly selection management — Client
    ├── discussions/page.tsx    # Discussion topic management — Client
    ├── events/page.tsx         # Event management — Client
    ├── users/page.tsx          # User management — Client
    └── upload/page.tsx         # Upload page

components/
├── site-header.tsx             # Global navigation header
├── admin-sidebar.tsx           # Admin navigation sidebar
├── book-card.tsx               # Book card for browse grid
├── book-club-selection-card.tsx # Book club selection card
├── book-purchase-section.tsx   # Book detail format selector + add to cart
├── add-to-cart-button.tsx      # Reusable CTA add-to-cart
├── library-book-card.tsx       # User library book card with progress
├── reading-settings-panel.tsx  # Reader display settings
├── reading-sidebar.tsx         # Reader highlights/bookmarks sidebar
├── subscription-modal.tsx      # Multi-step subscription sign-up modal
├── stat-card.tsx               # Generic stat display card
├── providers.tsx               # Client providers wrapper
├── theme-provider.tsx          # Theme context provider
├── admin/book-form.tsx         # Admin book create/edit form
└── ui/                         # shadcn/ui primitives (alert, button, card, dialog, dropdown-menu, input, label, select, switch, tabs, textarea)

context/
└── cart-context.tsx            # Shopping cart React Context + localStorage

lib/
├── mock-books.ts               # Book data & type definitions
├── mock-book-club-data.ts      # Book club selections, discussions, events
├── mock-book-content.ts        # Reader chapter content
├── mock-user-data.ts           # User library & stats
├── mock-admin-data.ts          # Admin user data
├── reading-storage.ts          # localStorage CRUD for reader state
└── utils.ts                    # Utility functions (cn)
```

---

## 3. Route Map & Page Inventory

| Route | Description | Rendering | Auth Required | Key Data Sources |
|---|---|---|---|---|
| `/` | Landing page — hero, feature cards, how-it-works | Server | No | Static content |
| `/login` | Login/Register tabbed form | Client | No | N/A (mock auth) |
| `/browse` | Book catalog grid with search, genre filter, sort | Client | No | `mockBooks`, `GENRES` |
| `/book/[id]` | Book detail with format variants & add-to-cart | SSG | No | `mockBooks` (static params) |
| `/cart` | Shopping cart with order summary | Client | No (checkout requires login) | `CartContext` (localStorage) |
| `/checkout` | Shipping form + payment + order summary | Client | Yes (redirect if not) | `CartContext`, localStorage auth |
| `/dashboard` | User's personal library & reading progress | Server | Yes (conditionally shown via header) | `mockUserLibrary`, `mockBooks` |
| `/read/[id]` | In-browser digital reader | Client | Implicit (page accessible) | `mockChapters`, `reading-storage` |
| `/book-club` | Book club landing — hero, pricing, current/past/upcoming selections, benefits, collection, events | Client | No (subscribe CTA if not member) | `mockBookClubSelections`, `mockBooks`, `mockSubscription`, `bookClubBenefits`, `mockEvents` |
| `/book-club/discussions` | Discussion thread list | Server | Yes (nav hidden if not logged in) | `mockDiscussions` |
| `/book-club/discussions/[id]` | Single discussion thread | — | Yes | `mockDiscussions` |
| `/book-club/events` | Events calendar with RSVP | Server | Yes (nav hidden if not logged in) | `mockEvents` |
| `/admin` | Admin dashboard — nav cards + community snapshot | Server | Yes (nav hidden if not logged in) | `mockAdminUsers`, `mockBooks`, `mockBookClubSelections` |
| `/admin/books` | Catalog management table with CRUD | Client | Yes | `mockBooks`, `GENRES` |
| `/admin/books/new` | Create new book form | Client | Yes | Book form |
| `/admin/books/[id]/edit` | Edit existing book form | Client | Yes | `mockBooks` |
| `/admin/book-club` | Monthly selection management | Client | Yes | `mockBookClubSelections`, `mockBooks` |
| `/admin/discussions` | Discussion topic management | Client | Yes | `mockDiscussionTopics`, `mockBooks` |
| `/admin/events` | Event management | Client | Yes | `mockEvents` |
| `/admin/users` | User management table | Client | Yes | `mockAdminUsers` |
| `/admin/upload` | Upload page | Client | Yes | — |

---

## 4. Component Inventory

### 4.1 Layout Components

| Component | File | Description | Props |
|---|---|---|---|
| `SiteHeader` | `components/site-header.tsx` | Global sticky header with responsive nav. Shows different links based on login state. Contains cart icon with badge count. | None |
| `AdminSidebar` | `components/admin-sidebar.tsx` | Left sidebar for admin panel. Links: Dashboard, Catalog, Monthly Selection, Discussions, Events, Users. | `onClose?: () => void` |
| `AdminLayout` | `app/admin/layout.tsx` | Admin page shell with sidebar + mobile drawer overlay + mobile header. | `children` |
| `Providers` | `components/providers.tsx` | Wraps children in `CartProvider`. | `children` |

### 4.2 Feature Components

| Component | File | Description | Key Props |
|---|---|---|---|
| `BookCard` | `components/book-card.tsx` | Browse-grid card: cover image, title, author, genre, format variant selector, price badge, add-to-cart button with confirmation animation. | `book: Book` |
| `BookPurchaseSection` | `components/book-purchase-section.tsx` | Book detail page format selector grid (ebook/paper/komet card) with large price display and add-to-cart. | `book: Book` |
| `AddToCartButton` | `components/add-to-cart-button.tsx` | Reusable button that calls `addToCart` from context and shows a 2-second "Added to Cart" confirmation state. | `book: {id, title, price, coverImage, format}`, `disabled?: boolean` |
| `BookClubSelectionCard` | `components/book-club-selection-card.tsx` | Displays a book club monthly selection (current/upcoming/past) with book cover, theme, description, discussion date, and action buttons. | `selection: BookClubSelection`, `book: Book`, `isMember?: boolean` |
| `LibraryBookCard` | `components/library-book-card.tsx` | Dashboard library card showing book cover, progress bar, reading status icon, and "Continue Reading" / "Start Reading" CTA. | `book: Book`, `userBook: UserLibraryBook` |
| `SubscriptionModal` | `components/subscription-modal.tsx` | 4-step modal dialog for Book Club subscription: (1) User Details form, (2) Book Selection (pick 2 of 5), (3) Payment + Order Summary, (4) Success confirmation. | `isOpen: boolean`, `onClose: () => void` |
| `ReadingSettingsPanel` | `components/reading-settings-panel.tsx` | Reader settings sidebar: font size (12-32px), font family (serif/sans/mono), line height (1.2-2.5), text alignment (left/justify), theme (dark/light/sepia). | `settings: ReadingSettings`, `onSettingsChange` |
| `ReadingSidebar` | `components/reading-sidebar.tsx` | Reader sidebar listing all highlights and bookmarks for the current book, with click-to-navigate and delete functionality. | `bookId, highlights, bookmarks, currentChapter, onHighlightClick, onBookmarkClick, onDeleteHighlight, onDeleteBookmark` |
| `StatCard` | `components/stat-card.tsx` | Generic stat card with label and value display. | `label, value, icon?` |

### 4.3 UI Primitives (shadcn/ui)

`Alert`, `Button`, `Card`, `Dialog`, `DropdownMenu`, `Input`, `Label`, `Select`, `Switch`, `Tabs`, `Textarea`

---

## 5. Data Models (Frontend Interfaces)

### 5.1 `Book` (lib/mock-books.ts)

```typescript
type BookFormat = "ebook" | "paper_book" | "komet_card"

interface Book {
  id: string
  title: string
  author: string
  coverImage: string
  price: number          // Default/base price (ebook)
  genre: string
  description: string
  variants: {
    format: BookFormat
    price: number
    available: boolean
  }[]
}
```

**GENRES constant:** `["Crime", "Children", "PTP", "Spiritual", "Adult", "Sports", "Self-Help", "Cooking"]`

### 5.2 `CartItem` (context/cart-context.tsx)

```typescript
interface CartItem {
  id: string
  title: string
  price: number
  coverImage: string
  quantity: number
  format: BookFormat
}
```

### 5.3 `BookClubSelection` (lib/mock-book-club-data.ts)

```typescript
interface BookClubSelection {
  id: string
  month: string
  year: number
  bookId: string
  theme: string
  description: string
  discussionDate: Date
  status: "upcoming" | "current" | "past"
}
```

### 5.4 `BookClubSubscription`

```typescript
interface BookClubSubscription {
  isActive: boolean
  startDate: Date
  nextBillingDate: Date
  memberSince: string
  booksReceived: number
}
```

### 5.5 `DiscussionTopic`

```typescript
interface DiscussionTopic {
  id: string
  title: string
  description: string
  category: "General" | "Book Club" | "Sci-Fi" | "Fantasy" | "News"
  bookId?: string
  isPinned: boolean
  isFeatured: boolean
  postCount: number
  memberCount: number
  lastActivity: Date
  createdAt: Date
}
```

### 5.6 `BookClubEvent`

```typescript
interface BookClubEvent {
  id: string
  title: string
  description: string
  date: Date
  time: string
  location: string
  type: "virtual" | "in-person"
  coverImage?: string
  attendees: number
  status: "upcoming" | "past"
  isPublic?: boolean
}
```

### 5.7 `UserLibraryBook` (lib/mock-user-data.ts)

```typescript
interface UserLibraryBook {
  bookId: string
  purchaseDate: Date
  lastRead?: Date
  progress: number       // 0–100 percentage
  status: "not-started" | "reading" | "finished"
}
```

### 5.8 `UserStats`

```typescript
interface UserStats {
  booksOwned: number
  booksRead: number
  currentStreak: number
  totalReadingTime: number  // in minutes
  favoriteGenre: string
}
```

### 5.9 `AdminUser` (lib/mock-admin-data.ts)

```typescript
interface AdminUser {
  id: string
  name: string
  email: string
  joinDate: Date
  subscription: "free" | "premium"
  booksOwned: number
  lastActive: Date
}
```

### 5.10 `UserAnalytics`

```typescript
interface UserAnalytics {
  totalUsers: number
  activeSubscribers: number
  newUsersThisMonth: number
  churnRate: number
  revenueThisMonth: number
  totalRevenue: number
}
```

### 5.11 Reader Data Models (lib/mock-book-content.ts)

```typescript
interface Highlight {
  id: string
  bookId: string
  chapterIndex: number
  paragraphIndex: number
  text: string
  color: string          // "yellow" | "green" | "blue" | "pink"
  note: string
  createdAt: Date
}

interface Bookmark {
  id: string
  bookId: string
  chapterIndex: number
  paragraphIndex: number
  note: string
  createdAt: Date
}

interface ReadingProgress {
  bookId: string
  currentChapter: number
  currentParagraph: number
  percentage: number
  lastRead: Date
}
```

### 5.12 `ReadingSettings` (lib/reading-storage.ts)

```typescript
interface ReadingSettings {
  fontSize: number                          // 12–32
  fontFamily: "serif" | "sans" | "mono"
  lineHeight: number                        // 1.2–2.5
  theme: "light" | "dark" | "sepia"
  textAlign: "left" | "justify"
}
```

---

## 6. User Interactions & Event Catalog

### 6.1 Public / Guest Interactions

| # | Interaction | Location | Current Implementation | Backend Requirement |
|---|---|---|---|---|
| 1 | **Browse books** — search by title/author, filter by genre, sort by title/price | `/browse` | Client-side filter on `mockBooks` | `GET /api/books?search=&genre=&sort=&page=` |
| 2 | **View book detail** — see cover, genre, title, author, description, format variants with pricing | `/book/[id]` | SSG from `mockBooks` static params | `GET /api/books/:id` |
| 3 | **Select format variant** (ebook/paper/komet card) | `/book/[id]`, `/browse` (book cards) | Local `useState` toggle, reads `book.variants` | Included in book detail response |
| 4 | **Add to cart** | `/browse` (book card), `/book/[id]` | `addToCart()` via CartContext → localStorage | `POST /api/cart/items` or client-side only |
| 5 | **View cart** — list items, see format badges, remove items, clear cart, see order summary (subtotal, GST 5%, total) | `/cart` | CartContext reads localStorage | `GET /api/cart` |
| 6 | **Remove from cart** | `/cart` | `removeFromCart(id, format)` via CartContext | `DELETE /api/cart/items/:id` |
| 7 | **Clear cart** | `/cart` | `clearCart()` via CartContext | `DELETE /api/cart` |
| 8 | **Proceed to checkout** (redirects to login if not logged in) | `/cart` | Checks `localStorage.komet_subscription_active`, redirects to `/login?redirect=/cart&message=purchase` | Auth middleware |
| 9 | **Navigate** — responsive sticky header with mobile hamburger menu | All pages | `SiteHeader` component, conditional nav links based on `isLoggedIn` | Auth state from backend |
| 10 | **View Book Club landing** — hero, pricing, benefits, collection, current/upcoming/past selections, events, subscribe CTA | `/book-club` | Client-side rendering from mock data | `GET /api/book-club`, `GET /api/book-club/selections` |

### 6.2 Authentication Interactions

| # | Interaction | Location | Current Implementation | Backend Requirement |
|---|---|---|---|---|
| 11 | **Login** (email + password) | `/login` | Sets `localStorage.komet_subscription_active = "true"`, dispatches storage event, redirects | `POST /api/auth/login` → JWT/session |
| 12 | **Register** (full name, email, phone, DOB, password, confirm password) | `/login` | Same mock login handler (no actual registration) | `POST /api/auth/register` |
| 13 | **Logout** | Header (Sign Out button) | Removes `localStorage.komet_subscription_active`, reloads page | `POST /api/auth/logout` |
| 14 | **Auth state check** | `SiteHeader`, `CartPage`, `CheckoutPage`, `BookClubPage` | Reads `localStorage.komet_subscription_active` | Session/JWT validation |

### 6.3 Authenticated User Interactions

| # | Interaction | Location | Current Implementation | Backend Requirement |
|---|---|---|---|---|
| 15 | **Checkout** — fill shipping details (first/last name, address, city, zip, country), mock payment, place order → confirmation | `/checkout` | Client-side form → 2s timeout → `setOrderComplete(true)` + `clearCart()` | `POST /api/orders` |
| 16 | **View library** — see currently reading books with progress | `/dashboard` | Reads `mockUserLibrary` joined with `mockBooks` | `GET /api/user/library` |
| 17 | **Read a book** — chapter navigation, text selection, customizable display | `/read/[id]` | `mockChapters`, client-side state | `GET /api/books/:id/chapters/:chapterIndex` |
| 18 | **Highlight text** — select text → popup with color options (yellow/green/blue/pink) + optional note → save | `/read/[id]` | `saveHighlight()` → localStorage | `POST /api/user/highlights` |
| 19 | **Delete highlight** | `/read/[id]` (sidebar) | `deleteHighlight(id)` from localStorage | `DELETE /api/user/highlights/:id` |
| 20 | **Add bookmark** — dialog with chapter info + optional note → save | `/read/[id]` | `saveBookmark()` → localStorage | `POST /api/user/bookmarks` |
| 21 | **Delete bookmark** | `/read/[id]` (sidebar) | `deleteBookmark(id)` from localStorage | `DELETE /api/user/bookmarks/:id` |
| 22 | **Save reading progress** | `/read/[id]` (auto on chapter change) | `saveProgress()` → localStorage | `PUT /api/user/reading-progress/:bookId` |
| 23 | **Customize reading settings** — font size, family, line height, alignment, theme | `/read/[id]` | `saveSettings()` → localStorage | `PUT /api/user/settings/reading` |
| 24 | **Subscribe to Book Club** — 4-step modal: (1) personal info, (2) select 2 books, (3) payment, (4) confirmation | `/book-club` modal | Mock: sets `localStorage.komet_subscription_active`, reloads | `POST /api/subscriptions` |
| 25 | **View discussions list** | `/book-club/discussions` | Renders `mockDiscussions` | `GET /api/discussions` |
| 25a| **Post comment/reply** | `/book-club/discussions/[id]` | UI mockup (Reddit-style nesting) | `POST /api/discussions/:id/posts` |
| 26 | **View discussion thread** | `/book-club/discussions/[id]` | — | `GET /api/discussions/:id` with posts |
| 27 | **View events** | `/book-club/events` | Renders filtered `mockEvents` (upcoming) | `GET /api/events?status=upcoming` |
| 28 | **RSVP to event** | `/book-club/events` (RsvpModal) | Client-side modal (unknown implementation) | `POST /api/events/:id/rsvp` |

### 6.4 Admin Interactions

| # | Interaction | Location | Current Implementation | Backend Requirement |
|---|---|---|---|---|
| 29 | **View admin dashboard** — nav cards, community snapshot table | `/admin` | Static render from mocks | `GET /api/admin/dashboard` |
| 30 | **View catalog** — table with search, genre filter, sort, loading skeleton | `/admin/books` | Client-side filter on `mockBooks` + mocked status | `GET /api/admin/books?search=&genre=&sort=&page=` |
| 31 | **Add new book** | `/admin/books/new` | Book form component | `POST /api/admin/books` |
| 32 | **Edit book** | `/admin/books/[id]/edit` | Book form component | `PUT /api/admin/books/:id` |
| 33 | **Delete book** — confirmation dialog | `/admin/books` | Toast notification, no actual deletion | `DELETE /api/admin/books/:id` |
| 34 | **View book detail** (opens in new tab from admin) | `/admin/books` → `/book/[id]` | Link to public page | N/A |
| 35 | **Manage monthly selection** — view active, view history, create/edit selection via dialog | `/admin/book-club` | Client-side state, toast | `POST /api/admin/book-club/selections`, `PUT /api/admin/book-club/selections/:id` |
| 36 | **Delete monthly selection** | `/admin/book-club` | Client-side remove | `DELETE /api/admin/book-club/selections/:id` |
| 37 | **Manage discussions** — CRUD topics, toggle pin, toggle featured | `/admin/discussions` | Client-side state, toast | `POST/PUT/DELETE /api/admin/discussions/:id`, `PATCH` for pin/featured |
| 38 | **Manage events** — CRUD events with date, time, location, type (virtual/in-person), cover image, public toggle | `/admin/events` | Client-side state, toast | `POST/PUT/DELETE /api/admin/events/:id` |
| 39 | **Manage users** — table with search, filter (all/premium), manage subscription via dialog (free↔premium), ban user | `/admin/users` | Client-side state, toast | `GET /api/admin/users`, `PATCH /api/admin/users/:id/subscription` |

---

## 7. Forms & Validation Logic

### 7.1 Login Form (`/login` — "login" tab)

| Field | Type | Required | Validation | Default Value |
|---|---|---|---|---|
| Email | `email` | Yes | HTML5 `type="email"` | `demo@komet.com` |
| Password | `password` | Yes | HTML5 `required` | `password` |

**Frontend validation:** HTML5 native only (no custom validation).  
**Submit action:** Sets `localStorage.komet_subscription_active = "true"`, dispatches storage event, redirects to `?redirect` param or `/`.

### 7.2 Registration Form (`/login` — "register" tab)

| Field | Type | Required | Validation |
|---|---|---|---|
| Full Name | `text` | Yes | `required` |
| Email | `email` | Yes | `required`, HTML5 email |
| Phone Number | `tel` | Yes | `required` |
| Date of Birth | `date` | Yes | `required` |
| Password | `password` | Yes | `required` |
| Confirm Password | `password` | Yes | `required` |

**Frontend validation:** Passwords must match and be at least 8 characters long. HTML5 native for other fields. No password strength requirements.  
**Submit action:** Same as login (mock).

### 7.3 Subscription Modal — Step 1: User Details

**Validation Feedback:** Subtle red border around invalid inputs + toast notification.

| Field | Type | Required | Validation |
|---|---|---|---|
| Full Name | `text` | Yes* | Checked in `handleNext()` — `!formData.name` |
| Email | `email` | Yes* | Checked in `handleNext()` — `!formData.email` |
| Phone Number | `tel` | No | No validation |
| Date of Birth | `date` | Yes* | Checked in `handleNext()` — `!formData.dob`. Also used for age-gating adult content in Step 2 (age < 18 hides "Flying With The Chrysiridiarhipheus") |
| Mailing Address | `text` | Yes* | Checked in `handleNext()` — `!formData.address` |
| T-Shirt Size | `select` | Yes* | Checked in `handleNext()` — `!formData.tshirtSize`. Options: XS, S, M, L, XL, 2XL, 3XL |

**Frontend validation:** Custom check in `handleNext()`. If any required field is empty, function returns early (no error message shown to user).

### 7.4 Subscription Modal — Step 2: Book Selection

| Interaction | Validation |
|---|---|
| Select 2 books from 5 (toggle) | Must select exactly 2 (`selectedBooks.length !== 2` disables Continue button). Max 2 enforced in `toggleBookSelection()`. |
| Age-gated content | "Flying With The Chrysiridiarhipheus" (id: b3) hidden if user's DOB calculates to age < 18. |

### 7.5 Subscription Modal — Step 3: Payment

| Field | Type | Required | Validation |
|---|---|---|---|
| Name on Card | `text` | No | No validation |
| Card Number | `text` | No | No validation |
| Expiry (MM/YY) | `text` | No | No validation |
| CVC | `text` | No | No validation |

**Frontend validation:** None on payment fields. Submit proceeds after 2-second mock delay.

### 7.6 Checkout Form (`/checkout`)

| Field | Type | Required | Default Value |
|---|---|---|---|
| First Name | `text` | Yes | `Jane` |
| Last Name | `text` | Yes | `Doe` |
| Address | `text` | Yes | `123 Cosmic Way` |
| City | `text` | Yes | `Nebula City` |
| Zip / Postal Code | `text` | Yes | `10001` |
| Country | `text` | Yes | `United States` |

**Payment:** Mock display only ("Card ending in 4242").  
**Frontend validation:** HTML5 `required` attributes.  
**Submit action:** 2-second timeout → `setOrderComplete(true)` + `clearCart()`.

### 7.7 Admin Book Form (`components/admin/book-form.tsx`)

Full book creation/editing form (file exists at 20KB, detailed form with all Book fields + variant management).

### 7.8 Admin Monthly Selection Dialog (`/admin/book-club`)

| Field | Type | Required | Validation |
|---|---|---|---|
| Volume (book picker grid) | Click selection | Yes | `!selectedBook` check on save |
| Target Month | `select` | Yes | Dropdown (Jan–Dec) |
| Target Year | `number` | Yes | Input |
| Mission Theme | `text` | No | No validation |
| Mission Brief / Description | `textarea` | No | No validation |

### 7.9 Admin Discussion Topic Dialog (`/admin/discussions`)

| Field | Type | Required | Validation |
|---|---|---|---|
| Topic Title | `text` | Yes | `!formData.title` check on save |
| Mission Description | `textarea` | No | No validation |
| Sector / Category | `select` | Yes | Dropdown (General, Book Club, Sci-Fi, Fantasy, News) |
| Linked Volume | `select` | No | Dropdown (None + all books) |
| Pin to Top | `switch` | No | Boolean toggle |
| Feature Topic | `switch` | No | Boolean toggle |

### 7.10 Admin Event Dialog (`/admin/events`)

| Field | Type | Required | Validation |
|---|---|---|---|
| Event Title | `text` | Yes | Checked in `handleSave()` |
| Description | `textarea` | No | — |
| Deployment Date | `date` | Yes | Checked in `handleSave()` |
| Commencement Time | `text` | Yes | Checked in `handleSave()` |
| Environment Type | `select` | Yes | `virtual` or `in-person` |
| Location / Link | `text` | Yes | Checked in `handleSave()` |
| Cover Image URL | `text` | No | — |
| Public Transmission | `switch` | No | Boolean toggle |

---

## 8. Dynamic Data Displays

### 8.1 Book Browse Grid (`/browse`)

- **Source:** `mockBooks` (8 books)
- **Filtering:** Genre buttons (9 genres including "All"), text search on title + author
- **Sorting:** Title A-Z, Price Low→High, Price High→Low
- **Result count:** "Showing N books"
- **Empty state:** Message + "Clear Filters" button
- **Backend needs:** Paginated book listing with server-side search, filter, and sort

### 8.2 Book Detail (`/book/[id]`)

- **Source:** `mockBooks.find(b => b.id === id)`
- **Displays:** Cover image, genre badge, title, author, format variant selector, price, description
- **Static generation:** `generateStaticParams()` from `mockBooks`
- **Backend needs:** Single book detail endpoint

### 8.3 Shopping Cart (`/cart`)

- **Source:** CartContext (localStorage `komet_cart`)
- **Displays:** Item list (cover, title, format badge, quantity, price), subtotal, GST (5%), total
- **Empty state:** Icon, message, "Browse Books" CTA
- **Backend needs:** Cart service (or client-side only with backend for checkout)

### 8.4 Checkout Order Summary (`/checkout`)

- **Source:** CartContext
- **Displays:** Items with thumbnails, qty, line totals; subtotal, shipping ($5.99), GST (5%), grand total
- **Order confirmation:** Success screen with CTA to continue exploring

### 8.5 User Library (`/dashboard`)

- **Source:** `mockUserLibrary` joined with `mockBooks`
- **Displays:** Currently reading grid with progress bars and reading status
- **Backend needs:** User's purchased/owned books with reading progress

### 8.6 Digital Reader (`/read/[id]`)

- **Source:** `mockChapters` (static content), `reading-storage` (localStorage)
- **Displays:** Chapter title, chapter content with configurable typography, chapter navigation (prev/next with index)
- **Dynamic overlays:** Highlight popup (4 colors + note input), bookmark dialog (chapter label + note textarea)
- **Sidebar panels:** Settings panel, highlights/bookmarks list
- **Backend needs:** Chapter content delivery, user annotations (highlights/bookmarks), reading progress

### 8.7 Book Club Page (`/book-club`)

- **Source:** `mockBookClubSelections`, `mockBooks`, `mockSubscription`, `bookClubBenefits`, `mockEvents`, `bundleBooks`
- **Sections displayed:**
  - Hero with pricing ($49.99 initial + $3.99/mo)
  - Current month's selection with book details
  - Membership benefits grid (6 benefits)
  - Collection carousel (5 bundle books)
  - Upcoming selections
  - Past selections (horizontal scroll with dots)
  - Public events (2 upcoming)
  - Final CTA (hidden if member)

### 8.8 Discussions List (`/book-club/discussions`)

- **Source:** `mockDiscussions` (2 items)
- **Displays:** Title, author, category, reply/like/view stats, last reply info

### 8.9 Events Page (`/book-club/events`)

- **Source:** `mockEvents` filtered to `status === "upcoming"`
- **Displays:** Date, title, description, time, location (virtual/in-person icon), attendees, RSVP button/modal

### 8.10 Admin Dashboard (`/admin`)

- **Management console:** 4 nav cards (Catalog, Monthly Selection, Discussion Topics, Events) with item counts
- **Community snapshot:** Table of 5 recent users (name, email, tier badge, last active date)

### 8.11 Admin Catalog Table (`/admin/books`)

- **Displays:** Cover thumbnail, title + author, genre badge, price + stock status, published/draft status, action buttons (view/edit/delete)
- **Controls:** Search, genre filter, sort (title/price), loading skeleton
- **Pagination:** UI present but disabled (single page)

### 8.12 Admin User Management (`/admin/users`)

- **Displays:** Name + email, join date, tier badge (free/premium), books owned, last active, actions dropdown
- **Actions:** Manage subscription (dialog with free/premium select), Ban user
- **Filters:** Search by name/email, filter by all/premium

---

## 9. State Management & Client Storage

### 9.1 React Context

| Context | File | Scope | State Shape |
|---|---|---|---|
| `CartContext` | `context/cart-context.tsx` | Wrapped at root via `Providers` | `{ items: CartItem[], addToCart, removeFromCart, clearCart, cartCount }` |

### 9.2 localStorage Keys

| Key | Used By | Data Shape | Purpose |
|---|---|---|---|
| `komet_cart` | CartContext | `CartItem[]` | Persists shopping cart across sessions |
| `komet_subscription_active` | SiteHeader, CartPage, CheckoutPage, BookClubPage, LoginPage | `"true"` or absent | Mock authentication flag |
| `komet-highlights` | reading-storage.ts | `Highlight[]` | Reader text highlights |
| `komet-bookmarks` | reading-storage.ts | `Bookmark[]` | Reader bookmarks |
| `komet-progress` | reading-storage.ts | `ReadingProgress[]` | Reading progress per book |
| `komet-reading-settings` | reading-storage.ts | `ReadingSettings` | Reader display preferences |

### 9.3 Component-Level State (useState)

All interactive pages heavily use `useState` for:
- Search queries, filter selections, sort orders
- Modal open/close states
- Form field values
- Loading states (simulated with timeouts)
- UI animation states (e.g., "Added to Cart" confirmation)
- Selected items (format variant, book selections in subscription flow)

---

## 10. Authentication & Authorization

### 10.1 Current Implementation

**There is no real authentication system.** Auth is entirely mocked:

1. **Login:** Sets `localStorage.komet_subscription_active = "true"`
2. **Register:** Same as login (no actual user creation)
3. **Auth check:** `localStorage.getItem("komet_subscription_active") === "true"`
4. **Logout:** `localStorage.removeItem("komet_subscription_active")` + page reload
5. **Subscription purchase:** Sets same localStorage key

### 10.2 Authorization Matrix (Current Frontend Behavior)

| Feature | Guest | Logged In (any) |
|---|---|---|
| Browse books | ✅ | ✅ |
| View book detail | ✅ | ✅ |
| Add to cart | ✅ | ✅ |
| View cart | ✅ | ✅ |
| Checkout | ❌ (redirect to login) | ✅ |
| View Book Club landing | ✅ | ✅ |
| Subscribe to Book Club | ✅ (opens modal, sets login on completion) | ✅ |
| View Discussions | ❌ (nav link hidden) | ✅ |
| View Events | ❌ (nav link hidden) | ✅ |
| View Dashboard/Library | ❌ (nav link hidden) | ✅ |
| View Admin | ❌ (nav link hidden) | ✅ (no role check) |
| All admin CRUD operations | ❌ (nav link hidden) | ✅ (no role check) |

### 10.3 Backend Auth Requirements

- User registration with email/password (+ full name, phone, DOB)
- Login/logout with session management (JWT or sessions)
- Role-based access: `user`, `admin` (at minimum)
- Subscription status as separate concern from auth (user can be logged in but not subscribed)
- Protected route middleware for admin and member-only pages
- Auth state should differentiate: `guest`, `authenticated user`, `book club member`, `admin`

---

## 11. Backend Data Requirements Summary

This section consolidates what data the backend needs to **fetch, send, or process**.

### 11.1 Data to be FETCHED (GET requests)

| Data Domain | What's Needed | Currently Mocked By |
|---|---|---|
| **Books** | Paginated list with search/filter/sort; single book detail with variant inventory | `mockBooks` |
| **Genres** | Genre list for filter UI | `GENRES` constant |
| **Cart** | User's cart items (if server-side cart) | localStorage `komet_cart` |
| **User Library** | User's owned books with reading progress | `mockUserLibrary` |
| **Book Content** | Chapter text for reader | `mockChapters` |
| **User Annotations** | Highlights and bookmarks per book per user | localStorage `komet-highlights`, `komet-bookmarks` |
| **Reading Progress** | Per-book reading position | localStorage `komet-progress` |
| **Reading Settings** | User's reader preferences | localStorage `komet-reading-settings` |
| **Book Club Selections** | Current/upcoming/past monthly selections | `mockBookClubSelections` |
| **Book Club Subscription** | User's subscription status and details | `mockSubscription` + localStorage flag |
| **Book Club Benefits** | Static benefit list (could be hardcoded) | `bookClubBenefits` |
| **Discussions** | Topic list with stats; thread posts | `mockDiscussions`, `mockDiscussionTopics` |
| **Events** | Event list with RSVP status | `mockEvents` |
| **Admin: Users** | User list with search/filter | `mockAdminUsers` |
| **Admin: Analytics** | Dashboard stats (if re-added) | `mockUserAnalytics` |
| **Auth State** | Current user profile & roles | localStorage flag |

### 11.2 Data to be SENT (POST/PUT/DELETE requests)

| Action | Data Sent | Target |
|---|---|---|
| **Register** | name, email, phone, dob, password | User service |
| **Login** | email, password | Auth service |
| **Add to cart** | bookId, format, quantity | Cart service |
| **Remove from cart** | cartItemId | Cart service |
| **Place order** | shipping details (name, address, city, zip, country), cart items, payment token | Order service |
| **Purchase book** | bookId, format, paymentToken | Order service |
| **Subscribe** | user details, selected books, t-shirt size, payment info | Subscription service |
| **Create highlight** | bookId, chapterIndex, text, color, note | Annotation service |
| **Delete highlight** | highlightId | Annotation service |
| **Create bookmark** | bookId, chapterIndex, note | Annotation service |
| **Delete bookmark** | bookmarkId | Annotation service |
| **Update reading progress** | bookId, chapterIndex, percentage | Reading progress service |
| **Update reading settings** | fontSize, fontFamily, lineHeight, theme, textAlign | User preferences service |
| **Admin: Create book** | All Book fields + variants | Book management |
| **Admin: Update book** | All Book fields + variants | Book management |
| **Admin: Delete book** | bookId | Book management |
| **Admin: Create/update selection** | month, year, bookId, theme, description | Book club management |
| **Admin: Delete selection** | selectionId | Book club management |
| **Admin: CRUD discussion topic** | title, description, category, bookId, isPinned, isFeatured | Discussion management |
| **Admin: CRUD event** | title, description, date, time, location, type, coverImage, isPublic | Event management |
| **Admin: Update user subscription** | userId, newSubscription (free/premium) | User management |
| **RSVP to event** | eventId, userId | Event service |

### 11.3 Data to be PROCESSED (Backend Business Logic)

| Process | Details |
|---|---|
| **Order pricing** | Calculate subtotal, GST (5%), shipping ($5.99 for physical items), total |
| **Age gating** | Verify user age ≥ 18 for adult content |
| **Inventory management** | Track stock per book variant (ebook/paper/komet card); `available` boolean |
| **Subscription lifecycle** | $49.99 initial charge + $3.99/mo recurring; cancellation; member status |
| **Discount codes** | Kane Dealer Code (35% off) for subscribers |
| **Book club content delivery** | Monthly book assignment to active subscribers |
| **Reading progress sync** | Merge progress across devices/sessions |
| **Discussion moderation** | Pin/unpin topics, feature/unfeature, delete |

---

## 12. API Endpoint Recommendations

Based on the frontend audit, the following endpoints will be needed:

### Auth
```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me
```

### Books (Public)
```
GET    /api/books                    ?search=&genre=&sort=&page=&limit=
GET    /api/books/:id
GET    /api/books/:id/chapters       ?chapter=
```

### Cart
```
GET    /api/cart
POST   /api/cart/items
DELETE /api/cart/items/:id
DELETE /api/cart
```

### Orders
```
POST   /api/orders
GET    /api/orders                   (user's order history)
GET    /api/orders/:id
```

### Subscriptions
```
POST   /api/subscriptions
GET    /api/subscriptions/me
DELETE /api/subscriptions/me         (cancel)
```

### User / Library
```
GET    /api/user/library
GET    /api/user/library/:bookId
```

### Reader Annotations
```
GET    /api/user/highlights?bookId=
POST   /api/user/highlights
DELETE /api/user/highlights/:id
GET    /api/user/bookmarks?bookId=
POST   /api/user/bookmarks
DELETE /api/user/bookmarks/:id
```

### Reading Progress & Settings
```
GET    /api/user/reading-progress/:bookId
PUT    /api/user/reading-progress/:bookId
GET    /api/user/settings/reading
PUT    /api/user/settings/reading
```

### Book Club (Public)
```
GET    /api/book-club/selections     ?status=current|upcoming|past
GET    /api/book-club/benefits
```

### Discussions
```
GET    /api/discussions
GET    /api/discussions/:id
POST   /api/discussions/:id/posts
```

### Events
```
GET    /api/events                   ?status=upcoming|past
POST   /api/events/:id/rsvp
```

### Admin
```
GET    /api/admin/books              ?search=&genre=&sort=&page=
POST   /api/admin/books
PUT    /api/admin/books/:id
DELETE /api/admin/books/:id

GET    /api/admin/book-club/selections
POST   /api/admin/book-club/selections
PUT    /api/admin/book-club/selections/:id
DELETE /api/admin/book-club/selections/:id

GET    /api/admin/discussions
POST   /api/admin/discussions
PUT    /api/admin/discussions/:id
PATCH  /api/admin/discussions/:id    (pin/feature toggles)
DELETE /api/admin/discussions/:id

GET    /api/admin/events
POST   /api/admin/events
PUT    /api/admin/events/:id
DELETE /api/admin/events/:id

GET    /api/admin/users              ?search=&filter=
PATCH  /api/admin/users/:id/subscription
POST   /api/admin/users/:id/ban
```

---

## 13. Identified Gaps & Risks

### 13.1 Security Gaps

| Gap | Severity | Description |
|---|---|---|
| **No real authentication** | 🔴 Critical | Auth is purely a localStorage flag. Any user can access admin by setting `komet_subscription_active = "true"`. |
| **No role-based access** | 🔴 Critical | Admin panel visibility is only hidden via JS nav link toggle. No server-side protection. |
| **No CSRF/XSS protections** | 🟡 Medium | No tokens, no sanitization of user inputs. |
| **No password validation** | 🟡 Medium | Registration form doesn't check password match or enforce strength. |
| **No payment validation** | 🔴 Critical | Subscription payment fields have zero validation. No Stripe integration exists. |

### 13.2 Data Integrity Gaps

| Gap | Description |
|---|---|
| **No server-side data persistence** | All mutations (cart, orders, CRUD operations) are client-side only or toast-based. Refreshing loses changes. |
| **Inconsistent genre data** | `GENRES` constant has genres like "Crime", "Children", "PTP", but mock book data uses genres like "Science Fiction", "Mystery", "Fantasy", "Horror", "Thriller", "Biography" — no overlap. |
| **`pageCount` referenced but removed** | `BookClubSelectionCard` references `book.pageCount` which no longer exists on the `Book` interface. |
| **Discussion data models diverge** | Two different mock data shapes exist: `mockDiscussions` (simple, for public) and `mockDiscussionTopics` (detailed, for admin). |
| **No pagination** | All list displays render full arrays — no server-side pagination or infinite scrolling. |

### 13.3 Feature Gaps

| Gap | Description |
|---|---|
| **No search within reader** | Reader has no text search capability. |
| **No discussion posting** | Frontend only displays discussions, no ability to create posts/replies. |
| **No order history** | No way for users to view past orders. |
| **No profile/account settings** | No user profile page or account management. |
| **No image upload** | Book cover images and event images reference URLs/public directory files. Admin has no upload functionality. |
| **No email notifications** | No email for order confirmation, subscription, event reminders. |
| **No real payment processing** | Stripe mentioned in UI but not integrated. |
| **Hardcoded shipping rate** | Shipping is hardcoded at $5.99 — no address-based calculation. |
| **Hardcoded tax rate** | GST at 5% — no location-based tax calculation. |

### 13.4 UX Considerations for Backend

| Concern | Details |
|---|---|
| **Optimistic updates** | Cart add/remove should feel instant; backend sync can happen asynchronously. |
| **Reading state sync** | Highlights, bookmarks, and progress should sync across devices for logged-in users but feel local-fast. |
| **SSG vs SSR** | Book detail pages use `generateStaticParams` — with a backend, this should become ISR or SSR. |
| **Loading states** | Admin pages already show loading skeletons (1-1.2s timeout) — backend should match or beat this latency. |

---

*This document serves as the canonical reference for what the frontend currently expects from a backend system. All API contracts, data shapes, and business logic requirements should be derived from this audit.*
