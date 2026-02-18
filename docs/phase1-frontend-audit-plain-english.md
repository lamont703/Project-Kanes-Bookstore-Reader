# Phase 1: Frontend Audit — Plain English Guide

**Project:** Kane's Komet Book Reader  
**Phase:** 1 of 6 — Frontend Audit  
**Date:** 2026-02-18  

---

## What Is This Document?

This document explains, in plain English, everything the Kane's Komet Book Reader frontend currently does — every page, every button, every form, and every piece of data it touches. The purpose is to create a clear picture of what the backend needs to support. Think of this as the "what does the app do right now?" document before we build the real engine behind it.

---

## The Big Picture

Kane's Komet Book Reader is an online bookstore with a cosmic/funky theme. Right now, it's a good-looking front porch with nothing behind the door — all the data is fake (hardcoded mock data), the login is pretend, and nothing actually saves to a server. The backend we're about to build will be the real house behind that porch.

The app has **5 major areas**:

1. **The Bookstore** — Browse, search, and buy books
2. **The Book Club** — A subscription service with perks and monthly book picks
3. **The Reader** — An in-browser reading experience with highlights and bookmarks
4. **The Community** — Discussion forums and events
5. **The Admin Panel** — For managing everything behind the scenes

---

## Area 1: The Bookstore

### What Users Can Do

**Browse Books**
- Users land on a catalog page showing all available books as cards in a grid.
- They can **search** by typing a book title or author name.
- They can **filter** by genre using clickable genre buttons (Crime, Children, PTP, Spiritual, Adult, Sports, Self-Help, Cooking).
- They can **sort** by title (A-Z) or price (low to high, high to low).
- Each book card shows: cover image, title, author, genre tag, and price.

**View a Book's Details**
- Clicking on a book card takes you to a detail page.
- The detail page shows: cover image, genre badge, title, author, full description, and pricing options.
- Users can pick a **format**: ebook, paper book, or "Komet Card" (a proprietary format). Each format has a different price.

**Add to Cart**
- From either the browse page or the book detail page, users can click "Add to Cart."
- The button changes to "Added to Cart" with a checkmark for 2 seconds to confirm.
- The cart icon in the top navigation bar updates with a count of items.
- Users do NOT need to be logged in to add items to the cart.

**View the Cart**
- The cart page shows each item with its cover image, title, format (as a colored badge), quantity, and price.
- There's an order summary showing subtotal, GST (5% tax), and the total.
- Users can remove individual items or clear the entire cart.
- If a user tries to proceed to checkout without being logged in, they're redirected to the login page with a message saying "Please sign in to complete your purchase."

**Checkout**
- The checkout page has a shipping form (first name, last name, address, city, zip code, country) pre-filled with demo values.
- It shows a mock payment section ("Card ending in 4242").
- There's a final order summary with all items, subtotal, shipping ($5.99), GST, and grand total.
- Clicking "Place Order" shows a 2-second processing animation, then a confirmation screen.
- The cart is cleared after a successful order.
- **None of this actually processes a real payment or creates a real order.** It's all simulated.

### What the Backend Needs to Support

- A **books database** with all the info: title, author, description, genre, cover image, and pricing per format (ebook/paper/komet card).
- **Search and filtering** on the server side (so we're not loading every book just to filter).
- A **cart system** — either stored on the server (tied to user accounts) or validated at checkout time.
- **Real order processing** — accepting shipping details, validating payment, creating order records.
- **Inventory tracking** — knowing whether each format of each book is in stock.

---

## Area 2: The Book Club

### What Users See

**Book Club Landing Page**
- A big hero section showing the pricing: **$49.99 one-time** setup fee plus **$3.99/month** ongoing.
- The current month's featured book selection with cover art, theme name, and description.
- A list of **6 membership benefits**:
  1. Official Komet T-Shirt
  2. 2 Free E-Books
  3. Surprise Gift Item
  4. Kane Dealer Code (35% off all future purchases)
  5. $3.99/mo E-Book Access (1 book per month)
  6. Community Access
- A collection of 5 "bundle books" users can pick from during sign-up.
- Upcoming and past monthly selections (past ones scroll horizontally).
- Upcoming public events.
- A big "Subscribe" call-to-action button (hidden if the user is already a member).

**Subscription Sign-Up Flow (4-Step Modal)**

When a user clicks "Subscribe," a modal walks them through 4 steps:

1. **Personal Details** — Full name, email, phone, date of birth, mailing address, t-shirt size (XS through 3XL). All are required except phone.

2. **Pick Your Books** — Choose exactly 2 books from a selection of 5. Users under 18 (based on their date of birth) won't see one specific title that's flagged as adult content. Users must select exactly 2 to continue. (Note: Reference to page counts has been removed for simplicity).

3. **Payment & Summary** — Shows what they're getting (membership, 2 selected books, t-shirt). Has a credit card form (name, card number, expiry, CVC). Displays: One-time Membership: $49.99, Monthly E-Book: $3.99/mo, Total Due Today: $53.98. **No actual payment processing happens.**

4. **Confirmation** — Success screen with a confetti-style message. Sets the user as "logged in" and reloads the page.

### What the Backend Needs to Support

- **Subscription management** — creating subscriptions, tracking status (active/cancelled), billing dates, and history.
- **Payment processing** (Stripe or similar) — charging $49.99 initially, then $3.99/month recurring.
- **Fulfillment tracking** — T-shirt shipment, book delivery.
- **Discount code system** — The 35% "Kane Dealer Code" needs to be a real promo code that works at checkout.
- **Monthly book selection management** — assigning books to months, tracking current/upcoming/past.
- **Age verification** — Server-side check to restrict adult content for users under 18.

---

## Area 3: The Digital Reader

### What Users Can Do

**Read Books**
- The reader opens in a full-screen view showing one chapter at a time.
- Users navigate between chapters using "Previous Chapter" and "Next Chapter" buttons.
- A chapter selector dropdown lets users jump to any chapter directly.

**Customize the Reading Experience**
- **Font size** — adjustable from 12px to 32px in 2px increments.
- **Font family** — Serif, Sans-Serif, or Monospace.
- **Line height** — adjustable from 1.2 to 2.5 in 0.2 increments.
- **Text alignment** — Left-aligned or Justified.
- **Theme** — Dark mode, Light mode, or Sepia (warm parchment look).

**Highlight Text**
- Users can select text and a color popup appears with 4 colors: yellow, green, blue, pink.
- They can optionally add a note to the highlight.
- Highlights are saved and visible in a sidebar panel.

**Bookmark Pages**
- Users can bookmark the current reading position with an optional note.
- Bookmarks appear in the sidebar with the chapter name and any attached note.

**Track Reading Progress**
- The app automatically saves which chapter the user is on.
- Progress is stored locally (in the browser) and shown as a percentage on the library dashboard.

### What the Backend Needs to Support

- **Book content delivery** — Serving chapter text from a database or file storage.
- **Highlights storage** — Saving highlights per user per book, with text, color, chapter reference, and optional notes.
- **Bookmarks storage** — Saving bookmarks per user per book, with chapter reference and optional notes.
- **Reading progress sync** — So users can pick up where they left off on any device.
- **Reading settings sync** — So users' font/theme preferences follow them across devices.

---

## Area 4: The Community

### Discussions

**What's There Now**
- A list page showing discussion threads with: title, author name, category label, stats (replies, likes, views), and last reply info.
- Links to individual discussion thread pages (these exist in the routes but aren't fully built out).

**What's Missing**
- The ability to actually create a new discussion post.
- The ability to reply to existing discussions.
- User profiles for discussion participants.

### Events

**What's There Now**
- A page showing upcoming events with: date, title, description, time, location (with virtual/in-person indicators), attendee count, and an RSVP button.
- An RSVP modal is referenced but the implementation is minimal.

**What the Backend Needs to Support**
- **Discussion threads** — CRUD for topics, posts/replies, like/vote system.
- **Event management** — CRUD for events, RSVP tracking, attendee counts.
- **User attribution** — Tying discussions and RSVPs back to user accounts.

---

## Area 5: The Admin Panel

The admin panel is a separate section of the app with its own sidebar navigation. Here's what each section does:

### Admin Dashboard (`/admin`)
- Shows 4 navigation cards: Catalog, Monthly Selection, Discussion Topics, Events.
- Shows a "Community Snapshot" table of the 5 most recent users with their name, email, subscription tier (free vs. premium), and last active date.

### Catalog Management (`/admin/books`)
- A table of all books with: cover thumbnail, title + author, genre badge, price, published/draft status, and action buttons (view, edit, delete).
- Search by title or author, filter by genre, sort by title or price.
- "Add New Book" button links to a book creation form.
- "Edit" button links to an edit form.
- "Delete" shows a confirmation dialog, then shows a success toast (but doesn't actually delete since there's no real database).
- Loading skeletons appear for 1.2 seconds to simulate data fetching.

### Monthly Selection Management (`/admin/book-club`)
- Shows the currently active book club selection prominently with the book cover, title, author, month, theme, and description.
- Below that, a list of past and upcoming selections.
- A "New Featured Volume" button opens a dialog where the admin can:
  - Browse and select a book from the catalog (searchable grid with thumbnails).
  - Set the target month and year.
  - Add a theme name and description.
  - Save the selection.

### Discussion Management (`/admin/discussions`)
- Lists all discussion topics with: category badge, featured/pinned indicators, title, description, post count, member count, and last activity date.
- Each topic has buttons to: pin/unpin, feature/unfeature, edit, delete.
- "New Topic" button opens a create dialog with: title, description, category dropdown (General, Book Club, Sci-Fi, Fantasy, News), linked book dropdown (optional), pin toggle, feature toggle.
- Loading skeletons on initial load.

### Event Management (`/admin/events`)
- Lists upcoming and past events separately, each showing: cover image, date, time, type badge (virtual/in-person), title, description, attendee count, location, public/private indicator.
- Each event has edit and delete buttons.
- "Schedule Event" button opens a create dialog with: title, description, date, time, environment type (virtual/in-person), location/link, cover image URL, public toggle.
- Loading skeletons on initial load.

### User Management (`/admin/users`)
- Table showing: name + email, join date, subscription tier badge, books owned count, last active date, and actions dropdown.
- Search by name or email.
- Filter by: All Users or Book Club Users (premium).
- Actions dropdown for each user has: "Manage Subscription" (opens a dialog to switch between free and premium) and "Ban User" (button exists but doesn't do anything yet).

### What the Backend Needs to Support

- **All CRUD operations** need to actually persist data to a database.
- **Role-based access control** — Only admins should be able to access `/admin` pages. Right now, the nav link is just hidden from non-admins in JavaScript, which means anyone who types the URL can access it.
- **Image upload** — For book covers and event images. Right now these just reference URLs or files in the public folder.
- **Real user management** — Creating, reading, updating user accounts and their subscription statuses.
- **Audit logging** — Tracking who made what changes and when (especially for admin actions).

---

## How Data Currently Works (and Why It Needs to Change)

### Currently: Everything is Fake

The app uses **mock data files** — TypeScript files that export hardcoded arrays and objects:
- `lib/mock-books.ts` — 8 fake books with titles, authors, prices, and format variants.
- `lib/mock-book-club-data.ts` — Fake book club selections, discussion topics, events, and subscription info.
- `lib/mock-book-content.ts` — Fake chapter content for the reader.
- `lib/mock-user-data.ts` — Fake user library with 4 "owned" books and reading progress.
- `lib/mock-admin-data.ts` — 5 fake admin users with names, emails, and subscription tiers.

### Currently: Browser Storage for State

Anything that needs to persist between page reloads uses the browser's `localStorage`:
- **Shopping cart** — Stored as `komet_cart` in the browser.
- **Login status** — Just a flag called `komet_subscription_active` set to `"true"`.
- **Reading highlights, bookmarks, progress, and settings** — All stored locally under keys like `komet-highlights`, `komet-bookmarks`, etc.

### Why This Needs to Change

1. **Data disappears** — If a user clears their browser data or switches devices, everything is gone: cart, reading progress, highlights, login status.
2. **No real security** — Anyone can set `komet_subscription_active = "true"` in their browser console and "become" a logged-in admin.
3. **No shared state** — Admin changes (adding books, managing events) only exist in the current browser tab. Other users never see them.
4. **No payments** — The checkout and subscription flows don't charge anyone or create real orders.
5. **No user accounts** — There's no database of users. "Registering" just sets a browser flag.

---

## What the Backend Needs to Handle (Summary)

### User Accounts
- Registration with name, email, phone, date of birth, and password.
- Login and logout with real sessions or tokens.
- Password hashing and security.
- User profiles with purchase history, reading progress, and preferences.

### Book Management
- A database of books with all their info (title, author, description, genre, cover image, prices per format, stock levels).
- Search, filter, and sort capabilities on the server.
- Image storage for book covers.

### Shopping & Orders
- A real cart system (server-side or validated at checkout).
- Order creation with payment processing (Stripe integration).
- Order history for users.
- Shipping rate calculation (currently hardcoded at $5.99).
- Tax calculation (currently hardcoded at 5% GST).

### Subscriptions
- Book Club subscription management with recurring billing.
- Subscription status tracking (active, cancelled, expired).
- Discount code generation and validation (35% Kane Dealer Code).
- Monthly book assignment to subscribers.

### Reading Experience
- Chapter content storage and delivery.
- Per-user highlights, bookmarks, and reading progress stored server-side.
- Reading preference sync across devices.

### Community
- Discussion forum with threads and replies.
- Event management with RSVP tracking.

### Admin Tools
- Server-side admin access control (not just hiding nav links).
- Real CRUD operations that persist to the database.
- Image upload for book covers and event banners.
- User management with subscription control.

---

## Known Problems to Fix

### Security Issues

1. **Fake login** — Biggest issue. There's no real authentication. A cookie or token-based auth system is needed.
2. **No admin protection** — Anyone can access admin pages by typing the URL. Need server-side middleware to check user roles.
3. **No payment security** — Credit card forms exist but don't connect to any payment processor. Need Stripe or equivalent.
4. **No form validation on the server** — All validation happens (barely) in the browser. Need server-side validation for all inputs. Passwords will be required to match and be at least 8 characters.

### Data Problems

1. **Genre mismatch** — Standardizing on the list: Crime, Children, PTP, Spiritual, Adult, Sports, Self-Help, and Cooking.
2. **Missing data fields** — The `book.pageCount` references are being removed.
3. **Two different discussion data shapes** — Standardizing on the detailed model for both views.
4. **No pagination** — All pages load every item at once. With real data, this will need pagination or infinite scrolling.

### Missing Features

1. **No order history** — Users can't see their past purchases.
2. **No user profile page** — No way to update account info, password, etc.
3. **No image upload** — Admins can't upload book covers or event images through the app.
4. **No email system** — No order confirmations, welcome emails, event reminders, etc.
5. **No search within the reader** — Can't search for text within a book.
6. **Discussion participation** — Users can interact with admin-created topics by posting comments and replies, but they cannot create their own topics.

---

## What Comes Next

This audit tells us exactly what the backend needs to do. The next phases will:

- **Phase 2 (Data Modeling)** — ✅ Already completed. Define the database tables and relationships.
- **Phase 3 (API Design)** — Define the exact endpoints, request/response formats, and error handling.
- **Phase 4 (Authentication)** — Build real login, registration, and session management.
- **Phase 5 (Core APIs)** — Build the book catalog, cart, checkout, and order APIs.
- **Phase 6 (Integration)** — Connect the frontend to the real backend, replacing all mock data.

---

*This document is the plain English companion to the technical audit. For exact data structures, API endpoint specifications, and code-level details, refer to `phase1-frontend-audit-technical.md`.*
