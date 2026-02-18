# Kane's Komet — Cross-Phase Consistency Review

> **Purpose**: This document compares all documentation across Phases 1–4 to identify inconsistencies, ambiguities, and open questions. Your answers will be used to update every affected document so the entire documentation set speaks with one voice before backend coding begins.
>
> **How to use this file**: Read each finding and type your answer below the question. Feel free to be brief ("Yes," "No," "Go with Option A") or detailed — whatever helps.

---

## Table of Contents

1. [Book Content & Illustrations](#1-book-content--illustrations)
2. [Book Variants, Pricing & Inventory](#2-book-variants-pricing--inventory)
3. [Dealer Codes (Promo Codes)](#3-dealer-codes-promo-codes)
4. [Subscription & Billing](#4-subscription--billing)
5. [User Roles & Admin Levels](#5-user-roles--admin-levels)
6. [Community & Discussions](#6-community--discussions)
7. [Events & RSVPs](#7-events--rsvps)
8. [Cart & Guest Users](#8-cart--guest-users)
9. [GoHighLevel Integration](#9-gohighlevel-integration)
10. [Shipping & Tax](#10-shipping--tax)
11. [Data Model vs. API Contract Alignment](#11-data-model-vs-api-contract-alignment)
12. [Frontend Audit vs. Backend Architecture Alignment](#12-frontend-audit-vs-backend-architecture-alignment)
13. [Naming & Terminology Consistency](#13-naming--terminology-consistency)
14. [Minor Inconsistencies & Cleanup Items](#14-minor-inconsistencies--cleanup-items)

---

## 1. Book Content & Illustrations

### Finding 1.1: Illustration Display Method

**The inconsistency:**
- The **data model** (Phase 2) says illustrations are "full-page images between chapters/sections" and uses `display_after_chapter` to position them.
- The **frontend audit** (Phase 1) mentions the current reader has no illustration support at all — illustrations aren't in the frontend yet.
- The **data model Q&A** says "they will also have some illustrations that we need to incorporate into the reader."

**Why it matters:** The reader component needs to be designed to either (a) show illustrations as full-page breaks between chapters, (b) show them inline within chapter text, or (c) some other approach. This affects both the database schema and the frontend reader component.

**Question 1.1:** The current plan says illustrations will be shown as full-page images between chapters (e.g., after Chapter 3, you see a full-page illustration, then Chapter 4 begins). Is this correct? Or should illustrations sometimes appear within a chapter (inline with text)?

**Your answer:**

---

### Finding 1.2: PDF Extraction Tool

**The inconsistency:**
- The **data model Q&A** says "use a pdf extraction tool to extract the text from the pdf."
- The **backend architecture** (Phase 4) mentions `pdf-parser` and `pdfjs-dist` as possible tools, and plans an `upload-book` Edge Function with `pdf-parser.ts` and `image-extractor.ts`.
- No document specifies *which* tool will be used, how chapter boundaries will be detected, or how illustrations will be separated from text.

**Why it matters:** Chapter detection from a PDF is not trivial. If the books follow a consistent format (like "CHAPTER 1" at the start of each chapter), we can auto-detect. If not, the admin might need to manually mark chapter breaks.

**Question 1.2a:** Do the books follow a consistent chapter format (e.g., every chapter starts with "CHAPTER 1" or "Chapter One" as a heading)? This helps us decide if we can auto-detect chapters or if the admin needs to manually split them.

**Your answer:**

**Question 1.2b:** For illustrations in the PDF — are they full-page images (easy to detect automatically) or are they mixed in with text on the same page? This affects how we extract them.

**Your answer:**

---

### Finding 1.3: Illustrator Field Visibility

**The inconsistency:**
- The **data model** says `illustrator` is "internal record-keeping only" (not shown to users).
- The **frontend audit** doesn't mention an illustrator field at all in the current UI.
- The **data model Q&A** says "There is only one author and one illustrator for each book."

**Why it matters:** If the illustrator is truly internal-only, we don't need to show it anywhere in the frontend. But if the owner changes their mind, we'd need to update both the API response shape and the frontend.

**Question 1.3:** Confirming: the illustrator name should *never* be shown to customers — it's purely for internal records? Or would you like to show it on the book detail page at some point?

**Your answer:**

---

## 2. Book Variants, Pricing & Inventory

### Finding 2.1: Shipping Cost for Physical Variants

**The inconsistency:**
- The **frontend audit** says shipping is "hardcoded at $5.99 — no address-based calculation."
- The **data model** and **API design** don't mention a shipping fee at all in the order calculation (subtotal - discount + tax = total).
- The **checkout Edge Function** response shows `subtotal`, `discount_amount`, `tax_amount`, and `total` — no `shipping_amount`.

**Why it matters:** If a user buys a Paper Book or Komet Card (both physical), they presumably need shipping. But the formula doesn't include it.

**Question 2.1:** Should shipping be included in the order total for physical items? If yes, is $5.99 flat rate correct? Or is shipping a separate charge handled outside the app (e.g., through email coordination)?

**Your answer:**

---

### Finding 2.2: Can Users Buy Multiple Quantities of the Same Book?

**The inconsistency:**
- The **cart_items** table has a `quantity` field (with a CHECK constraint `quantity >= 1`).
- The **data model** says "Cannot add book already in user's library (prevents re-purchasing)" and the unique constraint is `(user_id, book_id, variant_id)`.
- But the "no duplicate purchase" rule seems aimed at digital ownership. For physical books, could someone buy 2 copies of a Paper Book as gifts?

**Why it matters:** If quantity > 1 is allowed, the checkout flow needs to handle it. If every purchase is always quantity = 1, we can simplify.

**Question 2.2:** Can a user buy more than one copy of a physical book (Paper Book or Komet Card) in a single order? For example, buying 2 copies of the same Komet Card as gifts? Or is every purchase always 1 copy per variant?

**Your answer:**

---

### Finding 2.3: Ebook-Only Library Access

**The inconsistency:**
- The **data model** says: "Only the ebook variant is added to the digital user_library. Physical purchases (Paper/Komet Card) are tracked in orders but not readable in the app."
- This means if a user buys *only* a Paper Book, they can't read the book digitally.

**Why it matters:** This is likely intentional, but it's a UX decision that should be confirmed — a user might expect to get digital access when they buy the physical version.

**Question 2.3:** Confirming: if a user buys only the Paper Book or Komet Card, they do NOT get digital reading access in the app? They'd need to separately purchase the ebook to read it digitally?

**Your answer:**

---

## 3. Dealer Codes (Promo Codes)

### Finding 3.1: Dealer Code Application Scope

**The inconsistency:**
- The **data model** says: "Applies to book purchases at checkout only (not subscription fees)."
- The **API design** confirms dealer codes are validated at checkout, with a 35% discount.
- But the checkout calculation is: `subtotal - discount + tax = total`. The discount applies *before* tax.

**Why it matters:** This is consistent across docs, but I want to confirm two edge cases.

**Question 3.1a:** Does the 35% discount apply to *all* items in the cart, including physical books? Or only to ebooks?

**Your answer:**

**Question 3.1b:** Can a user use their *own* dealer code on their *own* purchases? Or can they only share it with others?

**Your answer:**

---

### Finding 3.2: Dealer Code Management — Stripe or Custom?

**The inconsistency:**
- The **data model** has custom `promo_codes` and `promo_code_usages` tables.
- The **API design** has a custom `validate-promo` Edge Function.
- Stripe *also* has a built-in coupon/promotion system.

**Why it matters:** Using both custom promo logic AND Stripe promotions could cause confusion. We need to know which system "owns" the discount.

**Question 3.2:** The plan is to manage dealer codes entirely in our own database (not through Stripe's coupon system). Stripe will just see the final discounted price in the PaymentIntent. Is this correct?

**Your answer:**

---

## 4. Subscription & Billing

### Finding 4.1: Stripe Billing Structure

**The inconsistency:**
- The **data model** says: "$49.99 first month, then $3.99/month starting month 2."
- The **data model Q&A** confirms this as well.
- But **Stripe doesn't natively support** a "different price for the first month" on a standard subscription. This needs to be implemented as either:
  - **(Option A):** A one-time $49.99 charge (PaymentIntent) + a $3.99/month subscription that starts immediately (but first invoice is delayed 30 days).
  - **(Option B):** A Stripe Subscription with a $49.99 first invoice and $3.99 recurring (using Stripe's "first invoice" customization or phases).

**Why it matters:** This affects how the `subscribe` Edge Function talks to Stripe. Both options work, but they have different implementation details.

**Question 4.1:** This is a technical implementation detail, but do you have a preference? Option A (one-time charge + delayed subscription) is simpler to implement. Option B (single Stripe Subscription with phases) keeps everything in one Stripe object. We recommend Option A unless you have a reason to prefer B.

**Your answer:**

---

### Finding 4.2: What Happens to Physical Perks (T-shirt, Gift)?

**The inconsistency:**
- The **data model** tracks `tshirt_size` and `mailing_address` on the user profile.
- The **subscribe endpoint** collects `tshirt_size` and `mailing_address`.
- But no document describes how the *fulfillment* of physical perks works. Is the admin manually checking for new subscribers and shipping them? Is there an admin notification? A GoHighLevel email?

**Why it matters:** If this is manual (admin checks a list), no extra backend work is needed. If automated, we'd need to add fulfillment tracking.

**Question 4.2:** After a user subscribes and provides their t-shirt size and mailing address, how does the team know to ship the t-shirt and gift? Is this handled manually (e.g., admin checks a list of new subscribers), or should the system send a notification/email to the team?

**Your answer:**

---

### Finding 4.3: Re-subscribing After Cancellation

**The inconsistency:**
- The **data model** says "No pause option — users can only cancel and re-join later."
- But no document describes what happens when a user *re-subscribes*:
  - Do they pay $49.99 again for the first month?
  - Do they get 2 more free books?
  - Is their old dealer code reactivated, or do they get a new one?

**Question 4.3:** When a user cancels and later re-subscribes, what are the terms? Do they pay the $49.99 initial fee again? Do they pick 2 more free books? Does their old dealer code come back or do they get a new one?

**Your answer:**

---

## 5. User Roles & Admin Levels

### Finding 5.1: Owner vs. Team Admin

**The inconsistency:**
- The **data model Q&A** says: "The owner of the project will be an admin, and it is possible that in the future there will be other admins for his team."
- The **data model** and **backend architecture** only define two roles: `reader` and `admin`.
- There's no distinction between an "owner" admin and a "team" admin.

**Why it matters:** If all admins have the same power level, this is simple. But if the owner should be able to do things team admins can't (like add/remove other admins, or access financial data), we'd need a third role or a permission system.

**Question 5.1:** Should all admins have the same level of access? Or should there be a difference between the owner and team admins? For example, should only the owner be able to add/remove other admins?

**Your answer:**

---

## 6. Community & Discussions

### Finding 6.1: Discussion Topic Creation — Admin Only

**The state:**
- The **data model** says: "Only admins can create, edit, pin, feature, or delete topics."
- The **API design** confirms: topics are admin-only via `POST /rest/v1/discussion_topics` under the Admin section.
- The **frontend audit** notes the current UI doesn't let regular users create topics.

**Why it matters:** This is consistent across all docs, and I'm confirming it's intentional.

**Question 6.1:** Confirming: regular premium members can only post/reply within topics that admins create. They cannot create new discussion topics themselves. Correct?

**Your answer:**

---

### Finding 6.2: Discussion Categories

**The inconsistency:**
- The **data model** defines: `discussion_category_enum AS ENUM ('General', 'Book Club', 'Sci-Fi', 'Fantasy', 'News')`.
- These categories don't match the book genres (`Crime`, `Children`, `PTP`, `Spiritual`, `Adult`, `Sports`, `Self-Help`, `Cooking`).

**Why it matters:** If discussion categories are meant to correspond to book genres, they're out of sync. If they're intentionally different (discussions have their own category system), that's fine.

**Question 6.2:** Are the discussion categories (`General`, `Book Club`, `Sci-Fi`, `Fantasy`, `News`) intentional, or should they match the book genres? Or should they be a different list entirely?

**Your answer:**

---

### Finding 6.3: Discussion Nesting Depth

**The inconsistency:**
- The **data model** supports self-referencing `parent_id` for threaded replies (unlimited depth).
- The **Phase 1 remediation questions** specify a "nested comment interface."
- The **backend architecture** says "Self-referencing `parent_id` works well for 2-level nesting."

**Why it matters:** Unlimited nesting gets messy in the UI. 2-level nesting (post → reply, no reply-to-reply) is simpler and more common.

**Question 6.3:** Should replies be limited to 2 levels deep (a post and its direct replies), or should users be able to reply to replies (creating deeper threads)?

**Your answer:**

---

## 7. Events & RSVPs

### Finding 7.1: Event RSVP — Premium Only or Any Account?

**The inconsistency:**
- The **data model** says RSVP requires "an account — no guest RSVPs."
- The **data model Q&A** says RSVPs require an account.
- The **API design** says `POST /rest/v1/event_rsvps` requires auth (`Auth: Required (account needed)`).
- But: can a *free* user RSVP? Or only premium members?

**Why it matters:** If free users can RSVP, the event is a potential funnel to premium. If only premium users can RSVP, events are a members-only perk.

**Question 7.1:** Can free users (non-premium accounts) RSVP to public events? Or is RSVPing restricted to premium members only?

**Your answer:**

---

### Finding 7.2: Event Visibility

**The inconsistency:**
- The **data model** has `is_public` flag on events.
- The **API design** says: "Guest/Free: Only `is_public = true` events. Premium: All events."
- The **RLS permissions** show free readers can only see `is_public = true` events, while premium members see all.

**Why it matters:** This is consistent. Just confirming the intent.

**Question 7.2:** Confirming: some events are "private" (only visible to premium members) and some are "public" (visible to everyone). The admin decides this per event. Correct?

**Your answer:**

---

## 8. Cart & Guest Users

### Finding 8.1: Guest Cart → User Cart Transfer

**The inconsistency:**
- The **data model** has `session_id` on `cart_items` for guests and `user_id` for logged-in users.
- The **API design** describes guest carts using an `X-Session-Id` header.
- But no document explicitly describes what happens when a guest adds items to their cart, then creates an account or logs in. Do the items transfer?

**Why it matters:** If guest cart items don't transfer, users lose their cart when they sign up — a bad experience right before checkout.

**Question 8.1:** When a guest (not logged in) adds items to their cart and then creates an account or logs in, should their cart items automatically transfer to their new account?

**Your answer:**

---

## 9. GoHighLevel Integration

### Finding 9.1: Integration Method

**The inconsistency:**
- The **data model plain English guide** mentions GoHighLevel but asks "webhook vs. API?"
- The **backend architecture** shows a `ghl-client.ts` (API client) and a `ghl-sync` Edge Function.
- No document definitively states whether we're calling GoHighLevel's API directly from our Edge Functions, or if GoHighLevel listens to webhooks that our system sends.

**Why it matters:** This affects how we build the GoHighLevel integration. API calls (we push to GHL) are more reliable and give us confirmation. Webhooks (GHL pulls from us) are simpler but less predictable.

**Question 9.1:** For GoHighLevel integration, should we call GoHighLevel's API directly from our Edge Functions (we push data to GHL), or should GHL subscribe to webhooks from our system? We recommend direct API calls for reliability.

**Your answer:**

---

### Finding 9.2: GoHighLevel Contact Creation Timing

**The inconsistency:**
- The **webhook contracts** (Phase 3) show "New user registration → Create contact + send welcome email."
- But the **data model** only mentions `ghl_contact_id` on the users table, not when it's created.

**Question 9.2:** Should a GoHighLevel contact be created for *every* new user who registers (including free accounts)? Or only when they become a premium subscriber?

**Your answer:**

---

## 10. Shipping & Tax

### Finding 10.1: Tax Calculation

**The state (consistent):**
- **Data model**: "Flat 5% GST on (subtotal - discount)"
- **API design**: Checkout response shows `tax_amount`
- **Backend architecture**: Environment variable `GST_TAX_RATE=0.05`
- **Frontend audit**: "Hardcoded tax rate — GST at 5%"

**Question 10.1:** Confirming: GST is always 5% regardless of the customer's location? No need for location-based tax calculation?

**Your answer:**

---

### Finding 10.2: Shipping Address Requirement

**The inconsistency:**
- The **checkout Edge Function** collects shipping info (`name`, `email`, `address`, `city`, `state`, `zip`).
- But if a user buys *only* ebooks (digital items), they shouldn't need to provide a shipping address.

**Question 10.2:** Should the checkout flow skip the shipping address section if the cart contains only ebooks (digital items)?

**Your answer:**

---

## 11. Data Model vs. API Contract Alignment

### Finding 11.1: `is_permanent` Field on `user_library`

**The inconsistency:**
- The **data model** has `is_permanent` as `BOOLEAN NOT NULL` on `user_library`.
- The rules state all sources (purchase, subscription_signup, book_club_monthly) result in permanent access.
- If all books are permanent regardless, the column might be unnecessary.

**Question 11.1:** Since all books in the library remain forever (even after cancellation or ban), is the `is_permanent` field still needed? Or can we simplify by removing it and just assuming all library entries are permanent?

**Your answer:**

---

### Finding 11.2: `published_year` Index in Data Model

**The inconsistency:**
- The **data model indexes** table (Section 5) lists an index on `books (published_year DESC)` for "Newest" sort.
- But `published_year` was **removed** from the books table per the owner's decision (confirmed in the Streamline Book Details conversation and reflected in the data model's note: "Removed: rating, page_count, published_year, and isbn fields").
- The `books.page_count` validation rule is also still listed: "Must be > 0."

**Why it matters:** These are leftover references to removed fields. They need to be cleaned up.

**Question 11.2:** No action needed from you — we'll remove the `published_year` index and `page_count` validation from the data model. Just noting it here for completeness.

---

### Finding 11.3: `book_variants` Table vs. `books.is_in_stock`

**The inconsistency:**
- The data model ER diagram (Section 12) shows `is_in_stock` as a field on the `books` table.
- But the actual table definition has `is_in_stock` on `book_variants` (each format has its own stock status).

**Why it matters:** The ER diagram is misleading. It should show `is_in_stock` on `book_variants`, not `books`.

**Question 11.3:** No action needed from you — we'll update the ER diagram to correctly reflect that `is_in_stock` is on `book_variants`, not `books`.

---

## 12. Frontend Audit vs. Backend Architecture Alignment

### Finding 12.1: Frontend Mock Data Migration Path

**The state (consistent):**
Both the API design (Phase 3) and backend architecture (Phase 4) include a clear migration map from mock data to real API calls. The three-phase rollout (Mock Server → Backend Build → Connect) is well documented.

**No question needed** — this is consistent.

---

### Finding 12.2: SSG → SSR/ISR for Book Detail Pages

**The inconsistency:**
- The **frontend audit** notes: "Book detail pages use `generateStaticParams` — with a backend, this should become ISR or SSR."
- The **backend architecture** doesn't explicitly address this Next.js migration detail.

**Why it matters:** When we connect the real backend, we need to decide if book detail pages should be Server-Side Rendered (SSR — fresh data every request) or Incrementally Static Regenerated (ISR — cached and refreshed periodically).

**Question 12.1:** Should book detail pages update in real-time (SSR — always shows the latest data like stock status) or can they be cached for a period (ISR — updates every few minutes, faster performance)? We recommend ISR with a 5-minute revalidation period.

**Your answer:**

---

## 13. Naming & Terminology Consistency

### Finding 13.1: "Premium" vs. "Book Club" vs. "Subscription"

**The inconsistency:**
These terms are used somewhat interchangeably across docs:
- "Premium membership" (frontend, data model)
- "Book Club subscription" (frontend, data model Q&A)
- "Premium Access" (updated Book Club page hero text)
- `subscription_plan_enum: 'premium'` (data model)

**Why it matters:** Users might be confused if the UI says "Book Club" but the API says "premium" and the emails say "subscription."

**Question 13.1:** What should the *user-facing* term be? The backend will always use `premium` internally, but what should the frontend buttons, pages, and emails say? Options:
- (a) "Kane's Komet Book Club" (emphasizes the community angle)
- (b) "Premium Access" (emphasizes the tier/perks angle)  
- (c) "Premium Membership" (formal)

**Your answer:**

---

### Finding 13.2: "Komet Card" Spelling

**The state:**
- All docs consistently use "Komet Card" (not "Comet Card").

**No question needed** — just confirming this is intentionally the brand spelling.

---

## 14. Minor Inconsistencies & Cleanup Items

These are small items that don't need your input — we'll fix them during the documentation update:

| # | Issue | Location | Fix |
|---|---|---|---|
| 14.1 | `published_year DESC` index references removed `published_year` field | Data Model, Section 5 | Remove the index entry |
| 14.2 | `books.page_count > 0` validation references removed `page_count` field | Data Model, Section 7 | Remove the validation rule |
| 14.3 | ER diagram shows `is_in_stock` on `books` table instead of `book_variants` | Data Model, Section 12 | Move to `book_variants` in diagram |
| 14.4 | Phase 1 technical audit Section 12 endpoint pattern differs slightly from Phase 3 API design | Audit Section 12 vs. Phase 3 Section 6 | Align with Phase 3 (Phase 3 is the canonical spec) |
| 14.5 | `book_illustrations` ER diagram doesn't appear in the simplified ER text | Data Model, Section 12 | Already present as `books 1 ──── * book_illustrations` — confirmed |

---

## Summary: Questions Requiring Your Answer

For quick reference, here are all questions that need your response:

| # | Topic | Quick Summary |
|---|---|---|
| 1.1 | Illustrations | Full-page between chapters, or inline within chapters? |
| 1.2a | PDF chapters | Do books have consistent chapter headings (auto-detectable)? |
| 1.2b | PDF illustrations | Full-page images or mixed with text on same page? |
| 1.3 | Illustrator visibility | Internal-only, or show to customers? |
| 2.1 | Shipping cost | Include $5.99 flat rate for physical items? |
| 2.2 | Multiple copies | Can users buy multiple copies of physical books? |
| 2.3 | Ebook-only library | Physical-only purchase = no digital access? |
| 3.1a | Dealer code scope | Does 35% off apply to all items or ebooks only? |
| 3.1b | Self-use of dealer code | Can you use your own code? |
| 3.2 | Promo code system | Custom DB logic (not Stripe coupons)? |
| 4.1 | Stripe billing | Option A (one-time + delayed sub) or Option B (single Stripe sub with phases)? |
| 4.2 | Physical perk fulfillment | Manual or automated shipping notification? |
| 4.3 | Re-subscribe terms | Pay $49.99 again? Get 2 more free books? Same or new dealer code? |
| 5.1 | Admin levels | All admins equal, or owner has more power? |
| 6.1 | Topic creation | Admin-only — confirmed? |
| 6.2 | Discussion categories | Keep as-is, or align with book genres? |
| 6.3 | Reply nesting | 2 levels (post → reply) or unlimited depth? |
| 7.1 | Event RSVP tier | Free users can RSVP, or premium only? |
| 7.2 | Event visibility | Admin-controlled public/private per event — confirmed? |
| 8.1 | Guest cart transfer | Transfer cart items to new account on signup/login? |
| 9.1 | GHL method | Direct API calls (our push) or webhooks (GHL pulls)? |
| 9.2 | GHL contact timing | Create contact for all users, or premium only? |
| 10.1 | Tax calculation | Flat 5% GST always — confirmed? |
| 10.2 | Ebook-only checkout | Skip shipping address for digital-only orders? |
| 11.1 | `is_permanent` field | Still needed, or remove for simplicity? |
| 12.1 | Book page rendering | SSR (always fresh) or ISR (cached, faster)? |
| 13.1 | User-facing term | "Book Club," "Premium Access," or "Premium Membership"? |

---

> **Next Steps**: After you answer these questions, we will update every affected document to ensure perfect consistency across all phases. Then the documentation will be fully locked and ready for the backend coding phase.
