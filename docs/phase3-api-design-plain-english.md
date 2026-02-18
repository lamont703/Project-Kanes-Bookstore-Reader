# Kane's Komet: The API Design Explained in Plain English

> This guide translates the Phase 3 technical API specification into everyday language. If you've read the data model guide, this is the natural next step — we're now defining **how the frontend talks to the backend**.

---

## 1. What Is an API and Why Do We Need One?

### The Simple Analogy

Think of your app as a restaurant:
- The **frontend** (your Next.js website) is the dining room — it's what the customer sees.
- The **backend** (Supabase database) is the kitchen — it's where the real work happens.
- The **API** is the **waiter** — it takes orders from the dining room, delivers them to the kitchen, and brings the food back.

Right now, your app doesn't have a waiter. The dining room has a mini-fridge under each table (that's `localStorage`) with pre-made sandwiches (that's your `mock-books.ts` and `mock-user-data.ts` files). This works for a demo, but it means:
- If a customer moves to a different table (device), their food doesn't follow them.
- The kitchen can't actually cook anything new.
- There's no real security — anyone could open the mini-fridge.

The API fixes all of this by creating a structured communication system between the frontend and backend.

---

## 2. What We're Building: The API Contract

An **API contract** is a formal agreement that says: *"When the frontend asks for X, the backend will always respond with Y."* It's like a menu — both the kitchen and the dining room agree on what's available and how to order it.

### What the Contract Defines

For every feature in your app, we specify:
1. **The URL** (where to send the request) — like an address
2. **The method** (what kind of request) — are you asking for something, creating something, updating something, or deleting something?
3. **What you send** (the request) — what information the frontend provides
4. **What you get back** (the response) — what the backend returns
5. **What can go wrong** (the errors) — clear error messages for each failure case

---

## 3. The Four Types of Requests

Every conversation between your frontend and backend uses one of four "verbs":

| Verb | What It Does | Real-Life Equivalent | App Example |
|---|---|---|---|
| **GET** | "Give me information" | Looking at a menu | Loading the book catalog on the Browse page |
| **POST** | "Create something new" | Placing an order | Adding a book to your cart |
| **PUT / PATCH** | "Update something" | Changing your order | Editing your profile information |
| **DELETE** | "Remove something" | Cancelling an item | Removing a book from your cart |

---

## 4. Every Feature, Broken Down

Here's how each section of your app will talk to the backend:

### 4.1 Signing Up & Logging In

**What happens today:** Clicking "Login" just sets a flag in your browser's memory (`localStorage`). There's no real authentication.

**What the API does:**
- **Register**: The frontend sends the user's name, email, phone, date of birth, and password. The backend creates a real account and sends back a secure token (like a digital wristband) that proves who you are.
- **Login**: The frontend sends email + password. The backend verifies them and sends back the same kind of token.
- **Every request after login**: The frontend includes this token in every message to the backend, so the backend always knows who's asking.

**What can go wrong:**
- Email already registered → "This email is already in use."
- Password too short → "Password must be at least 8 characters."
- Wrong password on login → "Invalid credentials."

---

### 4.2 Browsing Books

**What happens today:** The Browse page reads from a hardcoded list in `lib/mock-books.ts`.

**What the API does:**
- The frontend asks: *"Give me all published books, filtered by Crime genre, sorted by title."*
- The backend responds with a list of books, each including their title, author, cover image, description, genre, and all three format options (ebook, paper book, Komet Card) with prices and stock status.

**Smart features:**
- **Pagination**: Instead of loading all books at once (slow), the API sends 20 at a time with a "next page" token. Scroll down, load more.
- **Search**: Type "Brute" in the search bar and the backend searches through all book titles and authors instantly using a special fast-search index.
- **Filtering**: Filter by genre, and the backend only returns matching books.

---

### 4.3 The Shopping Cart

**What happens today:** Your cart is stored in your browser's `localStorage` via `context/cart-context.tsx`. Change browsers or devices? Cart is gone.

**What the API does:**
- **Guests** (not logged in): The cart is saved to the server using a temporary session ID. When they create an account, the cart transfers to their new profile.
- **Logged-in users**: The cart is saved to the server under their user account. It follows them across all devices.
- **Adding to cart**: The frontend sends the book ID, format (ebook/paper/Komet Card), and quantity. The backend saves it.
- **Smart checks**: The backend will refuse to add a book if the user already owns it, or if that format is out of stock.

---

### 4.4 Checkout & Orders

**What happens today:** The checkout page simulates a purchase with a `setTimeout` — no real payment happens.

**What the API does:**
1. The frontend sends: shipping info + Stripe payment token + optional dealer code.
2. The backend does several things in one coordinated operation:
   - Validates the cart and checks stock.
   - If a dealer code is provided, validates it and applies the 35% discount.
   - Calculates the subtotal, discount, 5% GST tax, and final total.
   - Charges the customer via Stripe.
   - Creates the order record in the database.
   - For any ebooks purchased, immediately adds them to the user's digital library.
   - Clears the cart.
   - Triggers GoHighLevel to send a confirmation email.
3. The frontend receives the confirmed order details.

**What can go wrong:**
- Empty cart → "Your cart is empty."
- Invalid dealer code → "This code is no longer active."
- Stripe payment fails → "Payment could not be processed."
- Book already owned → "You already own this book."

---

### 4.5 Your Library & Reading

**What happens today:** Your library comes from `lib/mock-user-data.ts`. Reading progress, highlights, and bookmarks are saved to `localStorage` via `lib/reading-storage.ts`.

**What the API does:**
- **Library**: Fetches all books you own from the server, along with how you got each one (purchased, signup freebie, or monthly book club pick).
- **Reading progress**: As you read, the app saves your position (current chapter + percentage) to the server every 30 seconds. When you open the app on another device, it picks up exactly where you left off.
- **Highlights**: When you highlight text, it's saved to the server with the color and optional note. Limited to 10 per book.
- **Bookmarks**: Same idea — saved to the server, limited to 10 per book.
- **Reader settings**: Your font size, font choice, theme (dark/light/sepia), and line height are saved server-side so they follow you everywhere.

---

### 4.6 Premium Subscription (Book Club)

**What happens today:** The subscription modal in `subscription-modal.tsx` simulates a purchase.

**What the API does:**
- **Subscribe**: The frontend sends the Stripe payment info, the 2 chosen free books, t-shirt size, and mailing address. The backend creates a Stripe subscription ($49.99 first month, $3.99/month after), adds the 2 books to the library, generates a unique dealer code, and triggers a welcome email.
- **Cancel**: The frontend sends a cancellation request. The backend cancels the Stripe subscription, deactivates the dealer code, but **keeps all books in the library**.
- **Check status**: The frontend can ask "Is this user premium?" and gets back the subscription plan, status, and dates.

---

### 4.7 Dealer Codes (The Affiliate System)

**What the API does:**
- **At checkout**: When a buyer enters a dealer code like `KANE-EVANS-4821`, the frontend sends it to the backend for validation. The backend checks if the code exists, is active, and the owning premium member isn't banned. If valid, it returns "35% off."
- **For the dealer**: A premium member can view their own code and see how many times it's been used.

---

### 4.8 Book Club Features

**What the API does:**
- **Monthly selections**: The frontend fetches the list of past, current, and upcoming monthly book picks. This is public — anyone can see what the book club is reading.
- **Events**: The frontend fetches upcoming and past events. Guests and free users only see public events. Premium members see all events.
- **RSVPs**: A logged-in user can RSVP to an event. The backend ensures you can only RSVP once per event.

---

### 4.9 Community Discussions

**What happens today:** Discussions come from `lib/mock-book-club-data.ts`.

**What the API does:**
- **Access control**: If you're not a premium member, the backend returns a "Forbidden" error — the entire discussions section is invisible to free users.
- **Topics**: Premium members can browse discussion topics (created by admins). Each topic shows its title, category, post count, and member count.
- **Posts & Replies**: Premium members can create posts, reply to other posts, and vote (upvote/downvote). Each user gets one vote per post.
- **Editing**: You can edit your own comment within 15 minutes. After that, it's locked forever.
- **Deleting**: You can delete your own comment anytime. Admins can delete any comment.
- **Privacy**: Only your display name is shown — no email, no profile picture, nothing else.

---

### 4.10 Admin Features

The admin panel has its own set of API calls for managing the entire platform:

| Feature | What the Admin Can Do |
|---|---|
| **Books** | Create, edit, delete books. Update prices and stock for each format. Upload PDFs for text extraction. |
| **Users** | View all users, search/filter, change subscription status, ban users. |
| **Book Club** | Create/edit monthly selections, manage events. |
| **Discussions** | Create/edit/pin/feature topics, delete any post for moderation. |

When an admin bans a user, the backend automatically:
1. Marks the user as banned.
2. Cancels their Stripe subscription.
3. Deactivates their dealer code.
4. Removes access to community features.
5. But **keeps all their books readable**.

---

## 5. How Errors Work

Every time something goes wrong, the backend sends back a clear, structured error message. This is important because the frontend needs to know **what** went wrong so it can show the user the right message.

**Example error:**
```
The frontend asks to add a highlight to a book.
The backend responds: "Error! You've already reached the maximum of 10
highlights for this book."
```

Every error includes:
- **A code** (like `VALIDATION_ERROR` or `FORBIDDEN`) — for the frontend to programmatically react to.
- **A message** — for the developer (and sometimes the user) to read.
- **Details** — for specific field-level issues (e.g., "The email field is invalid").

---

## 6. Our Recommended Tools

We evaluated several tools and recommend this combination:

### OpenAPI (The Specification)

Think of OpenAPI as a **blueprint**. It's a single file (written in YAML format) that describes every endpoint, every request, and every response in your API. Benefits:
- Other tools can **read this blueprint** and auto-generate documentation, test suites, and even starter code.
- It's a **text file in your Git repo** — trackable, reviewable, and version-controlled.
- It's the **industry standard** — used by Google, Stripe, and most professional API teams.

### Bruno (The Testing Tool)

Think of Bruno as your **API test lab**. Instead of Postman (which requires cloud accounts and subscriptions), Bruno is:
- **Free and open-source** — no paid tiers.
- **Stored in your Git repo** — your API test collections are saved as plain text files right alongside your code. No cloud sync needed.
- **Automated testing** — you can write test scripts that verify each API response is correct. For example: *"After I call the checkout endpoint, verify that the order status is 'confirmed' and the total is correct."*
- **CI/CD ready** — you can run all tests automatically whenever code is pushed, catching broken endpoints before they reach production.

### Why Not Postman?

Postman is a great tool, but it has moved toward a cloud-first subscription model. For your project:
- Bruno keeps everything **local and in Git** — no cloud dependency.
- Bruno is **completely free** for everything you need.
- Bruno's test collections are **plain text files** — easy to review in pull requests.

### Mock Server (Prism)

Before the backend is actually built, a tool called **Prism** can read your OpenAPI blueprint and **pretend to be the backend**. It returns fake (but correctly structured) responses so the frontend developer can build and test pages without waiting for the real backend.

---

## 7. The Migration Plan: From Mock Data to Real API

Here's how each piece of your current frontend will transition to using real API calls:

| What You Have Now | Where It Lives | What Replaces It |
|---|---|---|
| Hardcoded book list | `lib/mock-books.ts` | API call: "Get all books" |
| Hardcoded book content (chapters) | `lib/mock-book-content.ts` | API call: "Get chapters for this book" |
| Hardcoded user library & orders | `lib/mock-user-data.ts` | API calls: "Get my library" and "Get my orders" |
| Hardcoded admin users | `lib/mock-admin-data.ts` | API call: "Get all users" (admin) |
| Hardcoded book club data | `lib/mock-book-club-data.ts` | API calls: "Get selections," "Get events," "Get topics" |
| Shopping cart in browser memory | `context/cart-context.tsx` | API calls: "Get/add/remove cart items" |
| Reading progress in browser memory | `lib/reading-storage.ts` | API calls: "Save/get reading progress, highlights, bookmarks, settings" |
| Fake login flag in browser | `localStorage` | Real Supabase authentication with secure tokens |
| Simulated checkout | Checkout page `setTimeout` | Real Stripe payment + order creation API |
| Simulated subscription signup | Subscription modal | Real Stripe subscription + dealer code API |

### The Three-Phase Rollout

1. **Phase A — Mock Server**: Set up Prism to serve fake API responses. Frontend developers start replacing hardcoded imports with `fetch()` calls. Everything still uses fake data, but the **communication pattern** is real.

2. **Phase B — Backend Build**: Build the real Supabase tables, Edge Functions, and security policies. Run Bruno tests to verify each endpoint matches the contract.

3. **Phase C — Connect**: Point the frontend's `fetch()` calls from the mock server to the real Supabase backend. Run end-to-end tests.

---

## 8. Security: Who Can Do What

The API enforces strict rules about who can access what. This is handled through the secure token (JWT) that's sent with every request:

| User Type | What They Can Access via API |
|---|---|
| **Guest** (no account) | Browse books, view public events, manage a temporary cart |
| **Free Reader** (logged in) | Everything above + purchase books, read owned books, highlights, bookmarks, reader settings, order history, profile |
| **Premium Member** | Everything above + discussions, all events, event RSVPs, book club picks, dealer code |
| **Banned User** | Read owned books only (highlights, bookmarks, settings still work). Everything else blocked. |
| **Admin** | Full control over everything |

The backend **never trusts the frontend**. Even if someone tried to hack the frontend to access discussions without being premium, the backend would check their subscription status and reject the request.

---

## 9. What Happens Behind the Scenes with External Services

Your app integrates with three external services. Here's how the API coordinates with them:

### Stripe (Payments)
- When a user checks out, the API creates a Stripe PaymentIntent and charges their card.
- When a user subscribes, the API creates a Stripe Subscription for recurring billing.
- Stripe sends **webhook notifications** back to the API (e.g., "payment succeeded," "subscription cancelled," "payment failed") so the backend can update its records.

### GoHighLevel (Email)
- The API triggers GoHighLevel to send emails for: welcome messages, order confirmations, subscription events, event reminders, and ban notifications.
- The app itself never sends emails — it delegates to GoHighLevel.

### Supabase Storage (Files)
- Book cover images and PDFs are stored in Supabase Storage buckets.
- The API returns URLs pointing to these files, and the frontend displays them.

---

## 10. Performance: Keeping Things Fast

Several design decisions keep the API responsive as the platform grows:

| Design Choice | What It Means |
|---|---|
| **Pagination** | Book lists load 20 at a time, not all at once |
| **Cursor-based paging** | More efficient than "page 1, page 2" for large datasets |
| **Debounced reading progress** | Your reading position saves every 30 seconds, not on every scroll |
| **Database indexes** | Special "shortcuts" so common lookups (search, genre filter, cart) are instant |
| **Lazy chapter loading** | The reader loads one chapter at a time instead of the entire book |
| **Rate limiting** | Prevents abuse (e.g., max 10 login attempts per minute per IP) |

---

## 11. What's NOT in This API

Based on previous decisions, these features have been intentionally excluded:

- ❌ Social login (Google, Apple)
- ❌ User reviews or ratings
- ❌ Wishlists
- ❌ Audiobooks
- ❌ In-app notifications
- ❌ Analytics or data export APIs
- ❌ Refund/cancellation endpoints for orders
- ❌ Gift purchase endpoints
- ❌ Public user profiles (only display_name is ever shown)

---

## 12. Quick Glossary

| Term | What It Means |
|---|---|
| **API** | Application Programming Interface — the rules for how two systems talk to each other |
| **Endpoint** | A specific URL that the frontend sends requests to (e.g., `/books` to get all books) |
| **JWT** | JSON Web Token — a secure digital pass that proves who you are after logging in |
| **REST** | The architectural style we're using — resources have URLs and you interact with them using GET/POST/PUT/DELETE |
| **Webhook** | A message sent automatically from one service to another when something happens (e.g., Stripe tells us "payment succeeded") |
| **Edge Function** | A small piece of server code that runs close to the user for speed; used for complex operations like checkout |
| **Mock Server** | A fake backend that returns pre-defined responses so the frontend can be developed before the real backend exists |
| **OpenAPI** | The industry-standard format for describing an API's endpoints, like a blueprint |
| **Bruno** | A free, Git-friendly tool for testing and automating API requests |
| **Prism** | A tool that reads an OpenAPI spec and pretends to be the backend |
| **RLS** | Row-Level Security — database rules that ensure users can only see their own data |
| **Pagination** | Loading data in small chunks instead of all at once |
| **Cursor** | A bookmark that tells the API "start from here" when loading the next page of results |

---

### Final Thought

This API contract is the **bridge** between your beautiful frontend and the powerful backend we're building. With this document locked in, both sides of the app can be developed simultaneously — the frontend team replaces mock data with real API calls, while the backend team builds the Supabase infrastructure to match these exact specifications. The mock server ensures nobody is waiting on anyone else.
