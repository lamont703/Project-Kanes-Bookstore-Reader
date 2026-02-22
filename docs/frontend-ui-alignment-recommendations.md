# Frontend UI Alignment Recommendations

> **Purpose:** This document identifies all frontend UI changes needed to align the existing codebase with the finalized Phase 3 (API Design) and Phase 4 (Backend Architecture) documentation, including the data model and cross-phase consistency review decisions.
>
> **Status:** ✅ IMPLEMENTED — All Phase A/B/C items complete. Two items deferred to backend integration phase (see footer).
>
> **Date:** February 2026

---

## Table of Contents

1. [Reading Experience (Reader Page)](#1-reading-experience-reader-page)
2. [Mock Data Models & Type Definitions](#2-mock-data-models--type-definitions)
3. [Bookmarks & Highlights (Sidebar)](#3-bookmarks--highlights-sidebar)
4. [Reading Settings Panel](#4-reading-settings-panel)
5. [Book Detail Page](#5-book-detail-page)
6. [Purchase Flow & Checkout](#6-purchase-flow--checkout)
7. [Events & RSVP](#7-events--rsvp)
8. [Dashboard / Library](#8-dashboard--library)
9. [Discussion Categories](#9-discussion-categories)

---

## 1. Reading Experience (Reader Page)

**File:** `app/read/[id]/page.tsx`

The reader page is currently built around a **chapter-based text rendering** model. The finalized documentation specifies a **page-based image rendering** model that preserves the exact PDF layout.

### 1.1 — Switch from Chapter Navigation to Page Navigation ⚠️ HIGH PRIORITY

| Current State | Required State |
|---|---|
| `mockChapters[currentChapterIndex]` | `bookPages[currentPageIndex]` |
| "Chapter 1 of 2" header indicator | "Page X of Y" header indicator |
| `currentChapterIndex + 1 / mockChapters.length` footer | `currentPageIndex + 1 / totalPages` footer |
| "Previous" / "Next" chapter buttons | "Previous Page" / "Next Page" buttons |

**What to change:**
- Replace **all** references to `currentChapterIndex` with `currentPageIndex`.
- Replace header text `Chapter {n} of {total}` → `Page {n} of {total}`.
- Replace footer pagination text `{n} / {total}` with page numbers.
- Update `Previous` / `Next` button labels and logic to navigate pages instead of chapters.

### 1.2 — Replace Text Content Rendering with Page Image Display ⚠️ HIGH PRIORITY

| Current State | Required State |
|---|---|
| Renders `currentChapter.content` as `<p>` paragraphs | Renders `currentPage.page_image_url` as a full-width `<Image>` |
| Text is selectable and styled with reading settings | Image preserves exact PDF layout (like a scanned page) |
| Chapter title `<h2>` displayed above paragraphs | No chapter title — only the page image |

**What to change:**
- Replace the paragraph-rendering `<div>` block with a single `<Image>` component that loads from `page_image_url`.
- The image should be centered, responsive, and fill the available width while maintaining aspect ratio.
- Remove the chapter title heading from the reading area (the page image itself will contain any chapter headings from the original PDF).

### 1.3 — Reading Settings Relevance Review 🟡 MEDIUM PRIORITY

With page images replacing rendered text, several reading settings become **irrelevant** or need re-scoping:

| Setting | Current Behavior | Recommendation |
|---|---|---|
| **Font Size** | Changes text size | ❌ Remove — images have fixed text |
| **Font Family** | Changes text font | ❌ Remove — images have fixed font |
| **Line Height** | Changes text spacing | ❌ Remove — images have fixed spacing |
| **Text Alignment** | Changes text alignment | ❌ Remove — images have fixed alignment |
| **Theme** (dark/light/sepia) | Changes background & text color | ✅ Keep — useful for background color around page image |

**What to change:**
- Remove Font Size, Font Family, Line Height, and Text Alignment from `ReadingSettingsPanel`.
- Consider adding a **Zoom** control instead (pinch-to-zoom or slider) for the page image.
- Keep Theme toggle so users can choose the background color surrounding the page image.
- Update `ReadingSettings` interface and `defaultSettings` in `lib/reading-storage.ts` accordingly.

### 1.4 — Text Selection / Highlighting Behavior 🟡 MEDIUM PRIORITY

| Current State | Required State |
|---|---|
| Users select text directly from rendered paragraphs | Text is in an image — direct selection is not possible |
| `handleTextSelection` captures selected text | Highlights should work on extracted text (search/notes layer), not the image |

**What to change:**
- For the **initial implementation**: Remove the text-selection-based highlighting from the reader page. Highlights on rendered page images require a more complex overlay approach (e.g., a transparent annotation layer over the image).
- **Placeholder approach:** Consider providing a "Notes" input per page where users can type their own annotations, rather than selecting text from an image.
- The documentation states highlights are **text/paragraph level** — this suggests a future feature where extracted text is shown alongside or overlaid on the image. For now, stub it or note it as "Phase 2 Reader Enhancement."

### 1.5 — Reading Progress Tracking 🟢 LOW PRIORITY

| Current State | Required State |
|---|---|
| `ReadingProgress.currentChapter` | `ReadingProgress.currentPage` |
| `ReadingProgress.currentParagraph` | Remove — not relevant for page-based navigation |
| `ReadingProgress.percentage` calculated from chapter/paragraph | `percentage` = `currentPage / totalPages * 100` |

**What to change:**
- Rename `currentChapter` → `currentPage` in the `ReadingProgress` interface.
- Remove `currentParagraph` field.
- Update percentage calculation to use page count.

---

## 2. Mock Data Models & Type Definitions

**Files:** `lib/mock-book-content.ts`, `lib/reading-storage.ts`

### 2.1 — Replace `BookChapter` with `BookPage` ⚠️ HIGH PRIORITY

| Current Type | Required Type |
|---|---|
| `BookChapter { id, title, content: string[] }` | `BookPage { id, page_number, page_image_url, content?: string }` |

**What to change in `lib/mock-book-content.ts`:**
```typescript
// BEFORE
export interface BookChapter {
  id: string
  title: string
  content: string[]
}

// AFTER
export interface BookPage {
  id: string
  pageNumber: number
  pageImageUrl: string   // URL to rendered page image
  content?: string        // Extracted text for search indexing only
}
```

- Update `mockChapters` → `mockPages` with placeholder page image URLs (e.g., `/mock-pages/page-1.webp` or use placeholder image services).
- Update all imports across the codebase.

### 2.2 — Simplify `Bookmark` Interface ⚠️ HIGH PRIORITY

| Current Type | Required Type |
|---|---|
| `Bookmark { bookId, chapterIndex, paragraphIndex, note }` | `Bookmark { bookId, pageNumber, label? }` |

**What to change:**
```typescript
// BEFORE
export interface Bookmark {
  id: string
  bookId: string
  chapterIndex: number
  paragraphIndex: number
  note?: string
  createdAt: Date
}

// AFTER
export interface Bookmark {
  id: string
  bookId: string
  pageNumber: number     // Page-level only (no paragraph)
  label?: string          // Optional label (renamed from "note" for clarity)
  createdAt: Date
}
```

### 2.3 — Update `Highlight` Interface 🟡 MEDIUM PRIORITY

Highlights remain at the text/paragraph level per documentation. However, since we're moving to page images, the `chapterIndex` field should reference a `pageNumber` instead:

```typescript
// AFTER
export interface Highlight {
  id: string
  bookId: string
  pageNumber: number       // Was chapterIndex
  paragraphIndex: number   // Kept — highlights are text-level
  text: string
  color: string
  note?: string
  createdAt: Date
}
```

### 2.4 — Update `ReadingProgress` Interface 🟢 LOW PRIORITY

```typescript
// AFTER
export interface ReadingProgress {
  bookId: string
  currentPage: number      // Was currentChapter
  percentage: number
  lastRead: Date
}
```

Remove `currentParagraph` entirely.

---

## 3. Bookmarks & Highlights (Sidebar)

**File:** `components/reading-sidebar.tsx`

### 3.1 — Update Bookmark Display ⚠️ HIGH PRIORITY

| Current State | Required State |
|---|---|
| Shows "Chapter {n}" for each bookmark | Shows "Page {n}" for each bookmark |
| `onBookmarkClick(chapterIndex, paragraphIndex)` | `onBookmarkClick(pageNumber)` |
| Bookmark has `note` field | Bookmark has `label` field |

**What to change:**
- Replace `Chapter {bookmark.chapterIndex + 1}` → `Page {bookmark.pageNumber}`.
- Simplify `onBookmarkClick` to accept only `pageNumber`.
- Display `bookmark.label` instead of `bookmark.note`.

### 3.2 — Update Highlight Display 🟡 MEDIUM PRIORITY

| Current State | Required State |
|---|---|
| Shows "Chapter {n}" for each highlight | Shows "Page {n}" for each highlight |
| `onHighlightClick(chapterIndex, paragraphIndex)` | `onHighlightClick(pageNumber, paragraphIndex)` |

**What to change:**
- Replace `Chapter {highlight.chapterIndex + 1}` → `Page {highlight.pageNumber}`.
- Update `onHighlightClick` signature.

### 3.3 — Update `ReadingSidebarProps` Interface 🟡 MEDIUM PRIORITY

```typescript
// BEFORE
interface ReadingSidebarProps {
  currentChapter: number
  onHighlightClick: (chapterIndex: number, paragraphIndex: number) => void
  onBookmarkClick: (chapterIndex: number, paragraphIndex: number) => void
  // ...
}

// AFTER
interface ReadingSidebarProps {
  currentPage: number
  onHighlightClick: (pageNumber: number, paragraphIndex: number) => void
  onBookmarkClick: (pageNumber: number) => void
  // ...
}
```

---

## 4. Reading Settings Panel

**File:** `components/reading-settings-panel.tsx`

### 4.1 — Remove Text-Specific Settings 🟡 MEDIUM PRIORITY

As detailed in section 1.3, the following controls should be **removed** from the settings panel since content is displayed as page images:

- ❌ Font Size (slider with +/- buttons)
- ❌ Font Family (serif/sans/mono dropdown)
- ❌ Line Height (slider with +/- buttons)
- ❌ Text Alignment (left/justify toggle)

### 4.2 — Add Page Image Controls 🟡 MEDIUM PRIORITY (optional)

Consider adding:
- ✅ **Zoom Level** — slider or +/- to scale the page image (e.g., 75%, 100%, 125%, 150%)
- ✅ **Theme** — Keep dark/light/sepia for the page background

### 4.3 — Update `ReadingSettings` Type 🟡 MEDIUM PRIORITY

```typescript
// AFTER
export interface ReadingSettings {
  zoom: number              // e.g., 100 for 100%
  theme: "light" | "dark" | "sepia"
}

export const defaultSettings: ReadingSettings = {
  zoom: 100,
  theme: "dark",
}
```

---

## 5. Book Detail Page

**File:** `app/book/[id]/page.tsx`, `components/book-purchase-section.tsx`

### 5.1 — Add Illustrator Credit 🟢 LOW PRIORITY

The documentation states illustrator names should be shown publicly on the book detail page. Currently, the `Book` interface does not include an `illustrator` field.

**What to change:**
- Add `illustrator?: string` to the `Book` interface in `lib/mock-books.ts`.
- Add illustrator data to relevant mock books (e.g., children's books).
- Display `Illustrated by {book.illustrator}` below the author name on the book detail page, when present.

### 5.2 — Physical Purchase After Ebook Ownership 🟢 LOW PRIORITY (FUTURE)

The documentation confirms users **can** purchase physical variants (Paper Book, Komet Card) even if they already own the ebook. The current `BookPurchaseSection` does not enforce any duplicate-purchase prevention, so **no immediate change is needed**. However, when backend integration happens:

- The "Add to Cart" button for the **ebook** format should show "Already Owned" if the user has purchased it.
- The **physical** format buttons should remain active regardless.

**No code change needed now** — just documenting for backend integration phase.

### 5.3 — Komet Card Description Clarification 🟢 LOW PRIORITY

The documentation clarifies that Komet Cards grant **digital reading access** (not just a physical collectible). The current UI shows "Physical Item (Shipped)" for non-ebook formats. This should be updated:

| Format | Current Subtext | Required Subtext |
|---|---|---|
| E-Book | "Instant Digital Access" | "Instant Digital Access" ✅ |
| Paper Book | "Physical Item (Shipped)" | "Physical Book (Shipped)" |
| Komet Card | "Physical Item (Shipped)" | "Physical Card + Digital Access (Shipped)" |

---

## 6. Purchase Flow & Checkout

**Files:** `app/checkout/page.tsx`, `app/cart/page.tsx`, `context/cart-context.tsx`

### 6.1 — Add Dealer Code (Promo Code) Input 🟡 MEDIUM PRIORITY

The documentation describes a **dealer code system** with Stripe Promotion Codes integration. Neither the cart page nor the checkout page currently has a promo/dealer code input field.

**What to add:**
- A "Dealer Code" input field on the **checkout page** (within the Order Summary card), with:
  - Text input for the code
  - "Apply" button
  - Success/error toast feedback
  - Display of the discount amount when applied
- **Self-use prevention**: The documentation specifies users cannot apply their own dealer code. This will be enforced server-side, but the UI should display an appropriate error message.

### 6.2 — Conditional Shipping Display 🟡 MEDIUM PRIORITY

| Current State | Required State |
|---|---|
| Shipping is always `$5.99` | Shipping should only apply when physical items are in the cart |
| Flat rate regardless of content | Ebook-only orders: no shipping; mixed/physical orders: `$5.99` flat |

**What to change:**
- Check if any item in the cart has `format !== "ebook"`.
- If all items are ebooks, set shipping to `$0.00` and display "Free (Digital Delivery)".
- If physical items are present, show `$5.99` flat rate.
- Conditionally show/hide the shipping address form section based on whether physical items are in the cart.

### 6.3 — Payment Form Note (Stripe Integration) 🟢 LOW PRIORITY (FUTURE)

The checkout page currently has a raw credit card form. When Stripe is integrated, this should be replaced with **Stripe Elements**. No change needed now, but the form should display a note like "Payments processed securely by Stripe" (currently shows "Secure checkout powered by Stripe" on the cart page — this is fine).

---

## 7. Events & RSVP

**Files:** `app/book-club/page.tsx`, `app/book-club/events/page.tsx`, `lib/mock-book-club-data.ts`

### 7.1 — Add `isPublic` Flag to Events Data 🟡 MEDIUM PRIORITY

The documentation states:
- **Free users** can RSVP to **public** events.
- **Premium users** can RSVP to **all** events (public + exclusive).

Currently, the `BookClubEvent` interface has `isPublic?: boolean` but it's never set on any mock events.

**What to change:**
- Set `isPublic: true` on events that should be accessible to all users (e.g., "Live Q&A" and "Sci-Fi Writing Workshop").
- Set `isPublic: false` on member-exclusive events (e.g., "Cosmic Librarian Meetup").
- Update the events page to show a badge indicating "Public" vs. "Members Only".

### 7.2 — Update RSVP Button Logic Based on User Tier 🟡 MEDIUM PRIORITY

| Current State | Required State |
|---|---|
| Book club page: Non-members see "Register/Login to RSVP" | Free users see RSVP for **public** events; "Upgrade" for exclusive events |
| Events page: All events show `<RsvpModal>` equally | RSVP should be conditional on user tier + event visibility |

**What to change on the book club page:**
- For **public** events: Show "RSVP" button for all logged-in users (both free and premium).
- For **exclusive** events: Show "RSVP" for premium members; show "Upgrade to RSVP" for free members.
- For **guests** (not logged in): Show "Login to RSVP" for public events; show "Join Book Club" for exclusive events.

### 7.3 — Add Public/Exclusive Event Badges 🟢 LOW PRIORITY

**What to add:**
- A small badge on event cards: `🌐 Public Event` or `👑 Members Only`.
- This helps users immediately understand which events they can access.

---

## 8. Dashboard / Library

**File:** `app/dashboard/page.tsx`

### 8.1 — Update "Advance-Release Chapters" Copy 🟢 LOW PRIORITY

The dashboard's Elite Membership CTA card says:
> "Access exclusive sectors, **advance-release chapters**, and elite community badges."

Since chapters no longer exist (replaced by pages), this should be updated to:
> "Access exclusive sectors, **advance-release content**, and elite community badges."

### 8.2 — Order History Format Display 🟢 LOW PRIORITY

The order history in the dashboard doesn't show the **format** of each purchased item (ebook vs. paper book vs. Komet Card). Consider adding format badges to order line items for clarity.

---

## 9. Discussion Categories

**File:** `lib/mock-book-club-data.ts`

### 9.1 — Align Discussion Categories with Book Genres 🟡 MEDIUM PRIORITY

The documentation states discussion categories should **match book genres**. Currently:

| Current Categories | Required Categories (matching GENRES) |
|---|---|
| `"General" \| "Book Club" \| "Sci-Fi" \| "Fantasy" \| "News"` | `"General" \| "Book Club" \| "Crime" \| "Children" \| "PTP" \| "Spiritual" \| "Adult" \| "Sports" \| "Self-Help" \| "Cooking" \| "News"` |

**What to change:**
- Update the `DiscussionTopic.category` type to include all genres from `GENRES`.
- Update existing mock discussion topics to use the new categories.
- Update the admin discussions page to use the new categories when creating/editing topics.

---

## Priority Summary

| Priority | Count | Items |
|---|---|---|
| ⚠️ **HIGH** | 5 | Reader page navigation (1.1), Image rendering (1.2), BookPage type (2.1), Bookmark simplification (2.2), Sidebar bookmarks (3.1) |
| 🟡 **MEDIUM** | 10 | Reading settings removal (1.3, 4.1, 4.2, 4.3), Highlight behavior (1.4), Highlight updates (2.3, 3.2, 3.3), Dealer code input (6.1), Conditional shipping (6.2), Events isPublic (7.1, 7.2), Discussion categories (9.1) |
| 🟢 **LOW** | 7 | Progress tracking (1.5, 2.4), Illustrator credit (5.1), Komet Card description (5.3), Dashboard copy (8.1), Order format display (8.2), Event badges (7.3), Stripe note (6.3) |
| 🔮 **FUTURE** (no action now) | 2 | Duplicate purchase prevention (5.2), Stripe Elements integration (6.3) |

---

## Implementation Order (Recommended)

### Phase A — Core Reader Overhaul (HIGH priority)
1. Update type definitions (`BookPage`, `Bookmark`, `ReadingProgress`) — items 2.1, 2.2, 2.4
2. Create mock page data with placeholder images
3. Refactor reader page to page-based image navigation — items 1.1, 1.2
4. Update reading sidebar — item 3.1
5. Simplify reading settings — items 1.3, 4.1, 4.3

### Phase B — Data Alignment (MEDIUM priority)
6. Update highlight types — items 2.3, 3.2, 3.3
7. Update discussion categories — item 9.1
8. Add event public/exclusive logic — items 7.1, 7.2

### Phase C — Purchase & Polish (MEDIUM/LOW priority)
9. Add dealer code input to checkout — item 6.1
10. Conditional shipping logic — item 6.2
11. Add illustrator credit — item 5.1
12. Update Komet Card description — item 5.3
13. Dashboard copy updates — item 8.1
14. Event badges — item 7.3
15. Order format display — item 8.2

---

## Notes for Review

- **Mock page images**: We'll need placeholder page images for the mock data. Options include generating them with a tool, using colored placeholder rectangles, or using actual PDF-rendered images if sample PDFs are available.
- **Highlight feature**: The documentation keeps highlights at the text/paragraph level, but with page-image rendering, this requires an overlay/annotation approach. Recommend deferring complex highlight features to a later phase and implementing simple per-page notes for now.
- **Reading settings**: The dramatic simplification of settings (removing font/spacing controls) is a direct consequence of moving to PDF-preserved page images. The zoom control is the natural replacement.
- **No breaking changes to routing**: All changes are within existing pages and components — no new routes or pages are needed.

---

## Implementation Status (Final)

| Phase | Items | Status |
|---|---|---|
| **Phase A — Core Reader Overhaul** | 15 items | ✅ All complete |
| **Phase B — Data Alignment** | 4 items | ✅ All complete |
| **Phase C — Purchase & Polish** | 6 items | ✅ All complete |

### Deferred to Backend Integration Phase

| # | Item | Reason |
|---|---|---|
| **7.2** | RSVP button logic based on user tier (free vs. premium) | Requires live subscription status check — cannot be meaningfully mocked further. Backend will enforce via JWT role check. |
| **8.2** | Order history format display (ebook/paper/Komet Card badges) | Requires `format` field on `UserOrder.items` — will be returned naturally by the `GET /orders` API response. |

> **Frontend is cleared for Phase 4 backend development.** All `localStorage` mock data keys are mapped to their backend tables in `backend-data-model-recommendation.md` (Appendix: Frontend → Backend Mapping).
