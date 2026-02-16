# Kane's Komet: The Data Model Explained in Plain English (Final)

> This guide translates the finalized technical database design into plain English. Every decision below is based on the owner's direct answers to our clarifying questions.

---

## 1. Executive Summary: The "Big Picture"

Kane's Komet Book Reader is a **digital bookstore combined with a members-only book club**. The database has **20 tables** spread across six areas:

| Area | What It Does |
|---|---|
| **The People** | Stores who's using the app — their name, email, and whether they're a free reader or a premium book club member. |
| **The Bookshelf** | Stores every book, broken into chapters and illustrations, so the reader app can load them fast. |
| **The Store** | Handles shopping carts, orders, payments (via Stripe), and dealer discount codes. |
| **The Book Club** | Manages monthly book picks, community events, and RSVPs. |
| **The Community** | Powers the discussion forum where premium members can chat, reply, and vote on posts. |
| **The Reader** | Remembers exactly where you left off reading, your highlights, bookmarks, and even your font preferences — across all your devices. |

### The Big Migration

Right now, the app saves everything on the user's computer (in something called **localStorage**). The new backend moves all of that to a real server so that:
- Your reading progress follows you from phone to laptop.
- Your shopping cart follows you across devices and persists even if you aren't logged in yet.
- Your purchase history is permanent and secure.

---

## 2. The People: Users & Subscriptions

### Who Can Sign Up?
Anyone with an email and password. No Google or Apple login — just email.

### Two Types of People
1. **Free Readers** — They can browse the store, buy books, and read them in the app. That's it.
2. **Premium Members** (Book Club) — They pay **$49.99 for the first month**, then **$3.99/month** after that. They get everything free readers get, **plus**:
   - Access to the monthly book club pick (automatically added to their library)
   - Community discussions (the chat forum)
   - Book club events and RSVP
   - A personal **dealer code** to share for 35% off (more on that later)
   - 2 free books picked at signup that **they keep forever**
   - **A KANE's T-shirt and a special free gift** (these items are exclusive perks and never sold in the app)

### What About Admins?
There are only two roles: `reader` and `admin`. Right now, the admin team is the project owner and the developer. In the future, more team admins may be added. Admins can see and change everything.

### What Happens If Someone Gets Banned?
- They **can still read** any books they've already purchased.
- They **cannot** access discussions, events, or any community features.
- Their premium subscription is **automatically cancelled** — they stop being charged.

### Privacy
Other users can **only** see a person's **display name** in discussions. No profile pictures, emails, phone numbers, or any other personal data is visible to other users.

---

## 3. The Bookshelf: Books & Content

### How Books Get Into the System
1. An admin uploads a **PDF** of the book.
2. An admin uploads a **standard-sized book cover image**.
3. A **text extraction tool** pulls out the words and breaks them into chapters.
4. **Illustrations** are extracted from the PDF and stored as separate images.
5. The reader app shows the text chapter by chapter, with illustrations displayed as **full-page images between chapters or sections** — just like flipping to a picture page in a real book.

### Key Fields Per Book
- **One author** and **one illustrator** per book. The illustrator's name is stored for internal record-keeping but is **not shown on the frontend**.
- **Formats (Variants)**: Every book can be purchased in three ways:
   - **ebook**: Digital version, added to your library immediately.
   - **Paper Book**: Physical copy, shipped to your address.
   - **Komet Card**: Physical commemorative card, shipped to your address.
- **What You Can Read**: Only the **ebook** version can be opened and read inside the app. Physical items are tracked in your order history but don't show up as readable books on your bookshelf.
- **Series support**: Some books are part of a series (e.g., "Brute Syndicate #3"). The series name and order number are stored so they can be displayed as a label on the book card. There is **no dedicated "Series" page** — users can simply filter or search by series name.
- **Inventory Management**: Admins can independently toggle availability for each format (**ebook**, **Paper Book**, and **Komet Card**).
   - If a physical version (like a **Paper Book**) is marked "Out of Stock," it remains visible with a label, but the purchase option for that specific format is disabled.
   - The admin dashboard allows management of these stock levels at the individual variant level.
- **Genres are fixed**: Crime, Children, PTP (Prayers, Thoughts, and Poetry), Spiritual, Adult, Sports, Self-Help, Cooking. Only a developer can add new genres.
- **Simplified Catalog**: To focus exclusively on the core reading experience, we have removed secondary metadata like **page counts**, **published years**, and **ISBNs** from the public display.
- **No user reviews or ratings**: The rating feature has been completely eliminated. Books do not have star ratings or review sections.

---

## 4. The Store: Shopping & Payments

### Payment Processor: Stripe
Stripe handles all money:
- **Book purchases**: One-time payments via Stripe PaymentIntents.
- **Subscriptions**: Stripe manages the recurring $3.99/month billing automatically.

### Tax
A flat **5% GST** is applied to every order. No variation by state or country.

### All Sales Are Final
No refunds, no cancellations. Once you buy a book, it's yours.

### No Duplicate Purchases
The system prevents a user from buying a book they already own. If it's already in their library (from a purchase, a signup freebie, or a monthly pick), they can't buy it again.

### Dealer Codes (The Affiliate System)
Every premium member gets a unique **dealer code** formatted like: `KANE-EVANS-4821` (KANE prefix + part of their name + last 4 of phone number).

Here's how it works:
- The code gives **35% off** any book purchase at checkout (not subscription fees).
- It can be shared with anyone and used **unlimited times** by **multiple people**.
- **Every use is tracked**: the system records who used the code, which order it was applied to, and how much the discount was worth. This lets the business know which "dealer" (premium member) is driving sales.
- When a premium member cancels their subscription or gets banned, their code is **automatically deactivated**.

### Email Confirmations
When a purchase is completed, **GoHighLevel** (an external email marketing tool) sends the confirmation email — not the app itself.

---

## 5. The Book Club: Selections, Events & RSVPs

### Monthly Book Picks
Each month, the admin selects a featured book. When a book becomes the "current" pick, it is **automatically added to every active premium member's library**.

### Membership Cancellation & Access
- **Keep Everything**: Any book a user receives (purchased, signup freebies, OR monthly picks) **remains in their library forever**.
- **No New Picks**: If a user cancels their membership, they stop receiving *future* monthly picks, but they keep everything they already had.
- **Ban Protection**: Even if a user is banned, they always keep access to every book currently in their library.

### Events
- Can be **virtual** (with a meeting link) or **in-person** (with a physical address).
- **No max capacity** — unlimited RSVPs.
- **Account required** to RSVP — no guest RSVPs.
- **No calendar invites** are sent.
- GoHighLevel handles event reminder emails.

---

## 6. The Community: Discussions

### Who Can Participate?
Discussions are for **premium members only**. Free readers and guests **cannot see** topics or posts. The community section is completely hidden from non-premium users.

### Who Creates Topics?
**Only admins** can create, pin, feature, or delete discussion topics.

### Posting Rules
- Premium members can post comments and replies.
- You can **edit** your own comment within **15 minutes** of posting it. After that, it's locked.
- You can **delete** your own comment at **any time**.
- Admins can delete any comment (manual moderation — no automated word filters).
- Other users see only your **display name** next to your posts — no other personal info.

### Voting
Users can upvote or downvote posts. Each user gets one vote per post.

---

## 7. The Reader: Reading Experience

### Cross-Device Sync
If you read to Chapter 5 on your phone, you'll see Chapter 5 when you open the app on your laptop. Reading progress, highlights, bookmarks, and display settings all sync to the server.

### Highlights
- You can highlight text in **four colors**: yellow, green, blue, pink.
- You can add an optional note to any highlight.
- **Cap: 10 highlights per book** (for all users — free and premium).
- Highlights are **always private** — no one else can see them.

### Bookmarks
- You can bookmark a specific paragraph and add an optional label.
- **Cap: 10 bookmarks per book** (for all users).

### Reader Settings
Your preferred **font size**, **font family**, **theme** (dark, light, sepia), and **line height** are saved server-side so they follow you across devices.

---

## 8. Enums: The Fixed Lists

An "enum" is a fixed list of allowed options. Instead of free-text that could have typos, the database only accepts values from these lists:

| Enum | Options | Notes |
|---|---|---|
| **User role** | reader, admin | |
| **T-shirt size** | xs, s, m, l, xl, xxl, xxxl | For merch |
| **Subscription plan** | free, premium | |
| **Subscription status** | active, cancelled, expired, past_due | No "paused" — cancel only |
| **Genre** | Crime, Children, PTP, Spiritual, Adult, Sports, Self-Help, Cooking | PTP = Prayers, Thoughts, and Poetry |
| **Book status** | draft, published | |
| **Order status** | pending, confirmed, fulfilled | No "cancelled" — all sales are final |
| **Library source** | purchase, subscription_signup, book_club_monthly | Tracks *how* a book entered the library (all sources are permanent) |
| **Highlight color** | yellow, green, blue, pink | |
| **Reading theme** | dark, light, sepia | |
| **Selection status** | current, upcoming, past | For monthly book club picks |
| **Book format** | ebook, paper_book, komet_card | New variants |
| **Event type** | virtual, in_person | |
| **Event status** | upcoming, past, cancelled | |
| **RSVP status** | confirmed, cancelled | |
| **Discussion category** | General, Book Club, Sci-Fi, Fantasy, News | |
| **Vote type** | up, down | |

---

## 9. Relationships: The Digital Web

Nothing in the app exists in a vacuum. Here's how the major pieces connect:

- A **User** has one **Subscription**, one set of **Reading Settings**, and one **Promo Code** (if premium).
- A **User** can have many **Cart Items**, **Orders**, **Library Books**, **Highlights**, **Bookmarks**, **RSVPs**, **Discussion Posts**, and **Votes**.
- A **Book** has many **Chapters** and many **Illustrations**.
- A **Book** can appear in many users' **Libraries**, **Carts**, and **Orders**.
- An **Order** has many **Order Items** (line items) and optionally uses one **Promo Code**.
- Each **Promo Code** has a history of **Usages** that tracks who used it and on which order.
- A **Discussion Topic** has many **Posts**, and posts can have **Replies** (nested comments).
- Each **Post** can have many **Votes** (one per user).

---

## 10. Indexes: Speed Boosters

We create "shortcuts" in the database so common actions are instant:
- **Searching for a book** by title or author → full-text search index.
- **Filtering by genre** on the Browse page → genre + status index.
- **Looking up your cart or library** → user ID index.
- **Checking a dealer code at checkout** → unique code index.
- **Loading a discussion thread** → topic ID + timestamp index.

Without these, the app would get slower as data grows. With them, everything stays fast.

---

## 11. Validation: The Rulebook

These rules prevent bad data from ever entering the system:

| Rule | Why |
|---|---|
| Book price must be greater than $0 | Free access is handled through subscriptions, not zero-price books |
| Cart quantity must be at least 1 | Can't have 0 items in your cart |
| Font size must be between 12–32px | Prevents unreadable text |
| Max 10 highlights per book | Keeps the reader usable and the database lean |
| Max 10 bookmarks per book | Same as above |
| One RSVP per user per event | Prevents duplicate signups |
| Comments editable for 15 minutes only | Encourages thoughtful posting, prevents rewriting history |
| Can't buy a book you already own | Prevents accidental duplicate purchases |
| Only premium members can post in discussions | Community is a paid perk |

---

## 12. Permissions: Who Sees What

### Guests (not logged in)
Can browse the book catalog, add books to their cart, see book club selections, and view public events. They **cannot** checkout, RSVP, post, or see discussions. When they create an account, their guest cart is automatically saved to their new profile.

### Free Readers (logged in, no subscription)
Everything guests can do, **plus**: add to cart, purchase books, read owned books, use the reader with highlights/bookmarks/settings, view their order history. They **cannot** see any part of the community discussions.

### Premium Members (active book club subscription)
Everything free readers can do, **plus**: access monthly book picks, RSVP to events, post in discussions, vote on posts, use their dealer code.

### Banned Users
Can **only** read the books currently in their library (purchased, signup picks, and monthly picks received prior to the ban) with full reader features (progress, highlights, bookmarks, settings). Everything else is locked out. Subscription is auto-cancelled.

### Admins
Full control over everything: manage users, books, events, discussions, selections, and view all data.

---

## 13. Audit & Safety

### Timestamps
Every single row in every table remembers **when it was created** and **when it was last changed**.

### Soft Delete
When an admin "deletes" a book, discussion topic, or user — it's not actually erased. It's marked as "hidden" with a timestamp. This means:
- Mistakes can be **undone**.
- Data integrity is preserved (you won't have orphaned orders pointing to deleted books).

### Admin Audit Log
When an admin takes a sensitive action (banning a user, deleting a book, cancelling a subscription), the system records **who did it, what they did, and when**. This creates an accountability trail.

---

## 14. Scalability: Thinking Ahead

| Design Choice | Why It Matters |
|---|---|
| **Chapters stored separately** | Instead of loading an entire book at once, the reader loads one chapter at a time — much faster. |
| **Illustrations as separate records** | Images are loaded on-demand as the reader reaches them. |
| **Debounced reading progress** | The app waits 30 seconds between saving your scroll position to the server, instead of saving on every pixel of scrolling. This avoids overwhelming the database. |
| **Denormalized counters** | Instead of counting "likes" or "attendees" every time a page loads, the database keeps a running total that updates automatically via triggers. |
| **Stripe + GoHighLevel** | Payments and emails are handled by specialized services, not our own code. This means less can go wrong. |

---

## 15. What's NOT Being Built

Based on the owner's decisions, these features are **explicitly excluded**:

- ❌ Social login (Google, Apple)
- ❌ User reviews or ratings
- ❌ Wishlists
- ❌ Audiobooks
- ❌ Multiple languages
- ❌ Reading streaks / gamification
- ❌ In-app notifications
- ❌ Calendar invites for events
- ❌ Data export for admins
- ❌ Analytics dashboard
- ❌ Membership pause option
- ❌ Refunds
- ❌ Gift purchases (duplicate book buying)
- ❌ Dedicated series page
- ❌ Mobile app
- ❌ In-app sales of physical merchandise (T-shirts/gifts)

---

## 16. Key Integrations Summary

| Service | What It Does | How We Connect |
|---|---|---|
| **Supabase** | Database (PostgreSQL), authentication, file storage, Edge Functions (API) | Core platform |
| **Stripe** | Processes book payments and manages monthly subscription billing | Stripe Customer ID + Subscription ID stored in our database. Webhooks notify us of payment events. |
| **GoHighLevel** | Sends all outbound emails (order confirmations, subscription welcome, event reminders, reply notifications, payment failures, ban notices) | GHL Contact ID stored in our user table. Integration via webhook and/or API (TBD). |

---

### Final Thought

This data model ensures that **Kane's Komet** is not just a pretty website, but a robust, professional-grade platform. A reader can highlight a quote on their phone in the morning and find it waiting on their tablet in the evening. A premium member can share their dealer code with friends and see their referral impact. And the admin can manage the entire bookstore and community from a single dashboard — all backed by enterprise-grade infrastructure.
