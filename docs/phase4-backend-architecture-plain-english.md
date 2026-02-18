# Kane's Komet: Backend Architecture Explained in Plain English

> This guide translates the Phase 4 technical architecture specification into everyday language. If you've read the API design guide (Phase 3), this is the natural next step — we're now planning **how the backend is built, organized, and secured**.

---

## 1. What Is "Backend Architecture" and Why Does It Matter?

### The Simple Analogy

In Phase 2, we designed the **recipe book** (data model — what ingredients we need and how they're organized).  
In Phase 3, we designed the **menu** (API contract — what the customer can order and what they'll receive).  
Now in Phase 4, we're designing the **kitchen itself** — where every station is, which chef handles which dish, where the ingredients are stored, and how orders flow from the front of house to the back.

Without a well-designed kitchen:
- Chefs bump into each other (code conflicts)
- Orders get mixed up (bugs from unclear responsibilities)
- The health inspector shuts you down (security vulnerabilities)
- Adding a new dish requires renovating the whole kitchen (poor scalability)

This document plans the kitchen **before we start cooking**.

---

## 2. Our Tech Stack: What We're Using and Why

### Supabase: Our All-in-One Backend

Instead of stitching together five different services, we're using **Supabase** — a platform that bundles everything we need:

| What We Need | What Supabase Provides | What It Replaces |
|---|---|---|
| **Database** | PostgreSQL (a powerful, reliable database) | Building our own database server |
| **User Authentication** | Built-in signup/login with secure tokens | Building a custom login system or paying for Auth0 |
| **Server-Side Code** | Edge Functions (small programs that run on Supabase's servers) | Setting up and managing our own servers (AWS, etc.) |
| **File Storage** | Cloud storage for images and PDFs | Setting up Amazon S3 separately |
| **Security Rules** | Row-Level Security (database-level access control) | Writing custom security middleware |

### Why Supabase Over Alternatives?

- **vs. Firebase**: Firebase uses a NoSQL database (like a filing cabinet with no fixed structure). Our app has complex relationships between users, books, orders, subscriptions, and discussions — PostgreSQL (a relational database, like a well-organized spreadsheet system) handles this much better.
- **vs. Building from Scratch (AWS/Custom Servers)**: We'd need to set up and maintain servers, databases, authentication, file storage, and security separately. Supabase gives us all of this out of the box, with a generous free tier.
- **vs. Other BaaS (Appwrite, Firebase)**: Supabase is open-source, uses industry-standard PostgreSQL, and has the best developer experience for our Next.js + TypeScript stack.

### Our Programming Language: TypeScript Everywhere

The frontend is already built in TypeScript. The backend Edge Functions also use TypeScript (via Deno, a modern JavaScript runtime). This means:
- One language for the entire project
- Shared validation rules between frontend and backend
- Any developer can work on any part of the codebase

---

## 3. How the Project Is Organized: The Folder Structure

This is one of the most important decisions in the architecture. Think of it like organizing a house — everything has a room, and you always know where to find things.

### The Big Picture

```
Your Project/
│
├── app/              ← The "Dining Room" (what users see)
├── components/       ← The "Furniture" (reusable UI pieces)
├── lib/              ← The "Toolbox" (shared utilities)
│   ├── supabase/     ← How the frontend talks to the backend
│   └── validators/   ← Rules for checking user input
│
├── supabase/         ← The "Kitchen" (ALL backend code)
│   ├── migrations/   ← The "Blueprints" (database structure)
│   ├── functions/    ← The "Chefs" (server-side logic)
│   ├── seed/         ← The "Pantry" (test data)
│   └── tests/        ← The "Quality Control" (automated testing)
│
├── api-spec/         ← The "Menu" (API documentation + testing)
└── docs/             ← The "Manual" (project documentation)
```

### Why This Organization?

**Separation of Concerns** — every type of code has its own designated place:

| Type of Code | Where It Lives | Who Works on It |
|---|---|---|
| What users see (pages, buttons, forms) | `app/`, `components/` | Frontend developer |
| How the frontend connects to Supabase | `lib/supabase/` | Frontend developer |
| Rules for checking user input | `lib/validators/` | Both (shared code) |
| Database structure and security | `supabase/migrations/` | Backend developer |
| Complex operations (checkout, subscription) | `supabase/functions/` | Backend developer |
| Test data for development | `supabase/seed/` | Backend developer |
| Automated tests | `supabase/tests/` | Both |

**Benefits of this approach:**
- A frontend developer never accidentally breaks a database migration
- A backend developer never accidentally breaks a UI component
- New developers immediately know where to find and place their code
- The project can scale to a larger team without chaos

### The Backend Folder in Detail

The `supabase/` folder is the heart of the backend. Here's what each subfolder does:

**`migrations/`** (The Blueprints)
- Think of these as **step-by-step instructions** for building the database
- Each file is numbered (00001, 00002, ...) and runs in order
- File 00001 creates the basic types (like "what are the allowed genres?")
- Files 00002–00008 create the actual tables (users, books, orders, etc.)
- Files 00010–00011 add performance optimizations and automatic updates
- Files 00012–00019 add security rules (who can see/edit what)

**`functions/`** (The Chefs)
- These are small programs that run on Supabase's servers
- Each complex operation gets its own folder (checkout, subscribe, etc.)
- They share common tools via a `_shared/` folder (like a communal spice rack)

**`seed/`** (The Pantry)
- Fake data for testing: test users, sample books, example orders
- Makes development faster — you don't have to manually create test data every time

**`tests/`** (Quality Control)
- Automated tests that verify the security rules work correctly
- Automated tests for each server-side function

---

## 4. The Database: How Data Is Stored

### How We Build It: Migrations

The database is built through a series of **migration files** — numbered SQL scripts that run in order. Think of it like following a recipe step by step:

1. **Step 1** (00001): Define all the categories (genres, user roles, order statuses, etc.)
2. **Step 2** (00002): Create the users table
3. **Step 3** (00003): Create the books tables (books, variants, chapters, illustrations)
4. **Step 4** (00004): Create the shopping tables (cart, orders, library, promo codes)
5. **Step 5** (00005): Create the subscription table
6. **Step 6** (00006): Create the reading experience tables (progress, highlights, bookmarks, settings)
7. **Step 7** (00007): Create the book club tables (selections, events, RSVPs)
8. **Step 8** (00008): Create the discussion tables (topics, posts, votes)
9. **Step 9** (00009): Create the admin audit log
10. **Step 10** (00010): Add performance optimizations (indexes)
11. **Step 11** (00011): Add automatic update triggers

**Why migrations instead of just creating tables directly?**
- They're **version-controlled** — every change is tracked in Git
- They're **reproducible** — anyone can rebuild the exact same database from scratch
- They're **safe** — if something goes wrong, you know exactly which step caused it

### What Happens Automatically

The database has built-in automation (called "triggers"):

- **Timestamps**: When you update any record, the `updated_at` field is automatically set to the current time. No code needed.
- **Counters**: When someone RSVPs to an event, the event's `attendee_count` goes up automatically. When someone posts in a discussion, the `post_count` goes up automatically.
- **User profile creation**: When someone registers through Supabase Auth, a profile row is automatically created in the `users` table.

---

## 5. Security: Three Layers of Protection

Security is implemented at three levels — like a house with a fence, a locked door, AND an alarm system:

### Layer 1: The Fence (Route Protection)

The Next.js frontend checks if you're logged in before showing certain pages:
- Trying to visit `/dashboard` without logging in? → Redirected to `/login`
- Trying to visit `/admin` without being an admin? → Redirected to home page
- This is fast but **not enough by itself** (someone could bypass the frontend)

### Layer 2: The Locked Door (Database Security Rules — RLS)

Every table in the database has **Row-Level Security** (RLS) policies. These are rules enforced by the database itself — even if someone bypasses the frontend, the database refuses to hand over data they shouldn't see:

- **Your profile**: Only you can see your own email, phone, and address. Other users can only see your display name.
- **Books**: Anyone can browse published books. Only book owners can read chapters.
- **Cart**: You can only see your own cart. Other users can't see yours.
- **Discussions**: Only premium members can see or post in discussions. The database rejects requests from free users.
- **Admin**: Admins can see and modify everything.

**Example in plain language:**
> "When a user asks for discussion topics, the database checks: 'Does this user have an active premium subscription?' If yes, show the topics. If no, return nothing — as if the topics don't exist."

### Layer 3: The Alarm System (Edge Function Guards)

For complex operations, the server-side code adds extra checks:
- **Checkout**: Before processing payment, it verifies the cart isn't empty, items are in stock, promo codes are valid, and the user doesn't already own any of the books.
- **Subscribe**: Before creating a subscription, it verifies the user isn't already subscribed.
- **Post in discussion**: Before saving a post, it checks the user has an active premium subscription and isn't banned.
- **Edit a post**: Before allowing an edit, it checks the post is less than 15 minutes old.

### Who Can Do What (Summary)

| User Type | Access Level |
|---|---|
| **Guest** (no account) | Browse books, view public events, manage a session-based cart |
| **Free Reader** | All above + purchase, read owned books, highlights, bookmarks, reader settings, profile, order history |
| **Premium Member** | All above + discussions, all events, RSVPs, book club picks, dealer code |
| **Banned User** | Read owned books only (highlights, bookmarks, settings still work). Everything else blocked. |
| **Admin** | Full control over everything |

---

## 6. Server-Side Logic: Edge Functions

### What Are Edge Functions?

Edge Functions are small programs that run on Supabase's servers (not in the user's browser). They handle operations that are too complex or sensitive for the frontend to manage directly.

### Why Can't the Frontend Do Everything?

Some operations involve **multiple steps that must all succeed or all fail**. If the frontend handled these, a network glitch mid-operation could leave things in a broken state:

**Example — Checkout:**
1. Validate the cart ✓
2. Charge the credit card ✓
3. Create the order ✓
4. Add ebooks to the library ← *Network drops here*
5. Clear the cart ✗
6. Send confirmation email ✗

If the frontend ran this, steps 4–6 would fail silently. With an Edge Function, all steps happen on the server in a controlled transaction — if any step fails, everything rolls back cleanly.

### What Gets an Edge Function vs. What Doesn't

| Operation | Edge Function? | Why |
|---|---|---|
| Browse books | ❌ No | Simple database read — RLS handles security |
| Update profile | ❌ No | Simple database write — RLS handles security |
| Save reading progress | ❌ No | Simple database write — RLS handles security |
| **Checkout** | ✅ Yes | 6+ coordinated steps across DB + Stripe + GoHighLevel |
| **Subscribe** | ✅ Yes | Stripe subscription + DB updates + promo code generation + email |
| **Cancel subscription** | ✅ Yes | Stripe cancellation + DB updates + promo deactivation |
| **Ban user** | ✅ Yes | Update user + cancel Stripe + deactivate promo + email |
| **Upload book** | ✅ Yes | PDF parsing + text extraction + image extraction |
| **Stripe webhook** | ✅ Yes | Routes Stripe notifications to correct handler |
| **Validate promo code** | ✅ Yes | Multi-table lookup + business rule checks |

### How Each Edge Function Is Organized

Every function follows the same pattern:
1. **`index.ts`** — The "front door." Receives the request, checks authentication, passes it along.
2. **`handler.ts`** — The "brain." Orchestrates the steps in the right order.
3. **`*-ops.ts`** files — Specialists. Each handles one specific task (Stripe payment, database write, email trigger).

This means if we ever need to change how we handle payments (e.g., switching from Stripe to another provider), we only modify `stripe-ops.ts` — nothing else changes.

---

## 7. Input Validation: Three Safety Nets

When a user types something into a form, their input is checked **three times**:

### Safety Net 1: The Frontend (Immediate Feedback)
- **When**: As the user types
- **How**: Zod validation schemas + React Hook Form
- **Example**: Typing an invalid email shows "Please enter a valid email" instantly — no server call needed
- **Why it's not enough**: A hacker could bypass the frontend and send data directly to the backend

### Safety Net 2: The Edge Function (Business Logic Check)
- **When**: When the request reaches the server
- **How**: Same Zod schemas, re-verified server-side
- **Example**: The checkout function re-validates the shipping address before charging the card
- **Why it's not enough**: If someone found a way to write directly to the database, this wouldn't help

### Safety Net 3: The Database (Final Guarantee)
- **When**: When data is actually being saved
- **How**: PostgreSQL CHECK constraints, UNIQUE constraints, NOT NULL requirements
- **Example**: The database will physically reject a book price of -$5, a progress percent of 150%, or a duplicate email — no matter how the data got there
- **This is the last line of defense** — even if the frontend AND the Edge Function are compromised, the database enforces data integrity

---

## 8. Error Handling: Clear Messages for Every Failure

When something goes wrong, the backend always sends back a structured error message with three pieces of information:

1. **A code** — for the frontend to programmatically decide what to do (e.g., show a toast, redirect to login, disable a button)
2. **A message** — a human-readable explanation
3. **Details** — optional specifics about which field caused the problem

### Standard Error Types

| Error | When It Happens | User Sees |
|---|---|---|
| **Validation Error** (400) | Missing or invalid input | "Please fill in all required fields" |
| **Unauthorized** (401) | Not logged in, or session expired | Redirected to login page |
| **Forbidden** (403) | Logged in but doesn't have permission | "This feature requires a premium membership" |
| **Not Found** (404) | Resource doesn't exist | "Book not found" |
| **Conflict** (409) | Duplicate action | "You already own this book" or "Email already registered" |
| **Business Rule Violation** (422) | Valid input, but breaks a rule | "You've reached the maximum of 10 highlights for this book" |
| **Rate Limited** (429) | Too many requests | "Please slow down. Try again in a moment." |
| **Server Error** (500) | Something broke unexpectedly | "Something went wrong. Please try again later." |

---

## 9. File Storage: Where Books and Images Live

### Four Storage Buckets

Think of these as four labeled filing cabinets:

| Cabinet | What's Inside | Who Can Access |
|---|---|---|
| **Book Covers** | The cover images shown on book cards | Everyone (public) |
| **Book PDFs** | Original uploaded PDF files | Admin only |
| **Book Illustrations** | Images extracted from PDFs (shown between chapters) | Only users who own the book |
| **Avatars** | User profile images | Only the user themselves |

### How It Works

1. Admin uploads a PDF → stored in the "Book PDFs" cabinet
2. An Edge Function extracts text (into chapters) and images (into illustrations)
3. Chapters are stored as text in the database
4. Illustration images are stored in the "Book Illustrations" cabinet
5. The book cover image is stored in the "Book Covers" cabinet
6. When a reader opens a book, the frontend loads chapters from the database and illustration images from storage — but only if they own the book

---

## 10. External Services: How We Connect to Stripe and GoHighLevel

### Stripe (Payments)

Stripe handles all money. Our backend talks to Stripe in two ways:

**Our app → Stripe** (when we need something):
- "Charge this customer $30.70 for their book order"
- "Create a monthly subscription for $49.99/$3.99"
- "Cancel this subscription"

**Stripe → Our app** (when Stripe tells us something happened):
- "Payment succeeded" → We confirm the order and add ebooks to the library
- "Monthly payment went through" → We extend the subscription
- "Monthly payment failed" → We mark the subscription as past due and send an email
- "Subscription was cancelled" → We deactivate the dealer code

These "Stripe telling us" messages are called **webhooks**. We have a dedicated Edge Function (`stripe-webhook`) that receives these messages, verifies they're really from Stripe (not a hacker), and routes them to the correct handler.

### GoHighLevel (Email)

GoHighLevel handles all outbound emails. Our app never sends emails directly — instead, it tells GoHighLevel "send a welcome email to jane@example.com" and GoHighLevel handles the formatting, delivery, and tracking.

Emails are triggered by:
- New user registration → Welcome email
- Order confirmed → Order confirmation email
- Subscription created → Premium welcome email
- Subscription cancelled → Cancellation acknowledgment
- Payment failed → Payment failure notification
- User banned → Ban notification

---

## 11. Environment Variables: Keeping Secrets Safe

The app needs several secret keys (Stripe API keys, Supabase service keys, GoHighLevel credentials). These are **never stored in the code** — they're stored in environment variables:

- **`.env.local`** — Your machine's local secrets (never committed to Git)
- **`.env.example`** — A template showing what variables are needed (committed to Git, but with no real values)
- **Supabase Dashboard** — Production secrets are configured through the Supabase web interface

This means:
- A developer who clones the project sees `.env.example` and knows what keys to set up
- No real secrets are ever visible in the Git history
- Production and development use different keys automatically

---

## 12. Development Workflow: How a Developer Works Day-to-Day

### Starting the Project

```
Step 1: Start the local Supabase instance (database, auth, storage — all local)
Step 2: Run database migrations (builds all tables from scratch)
Step 3: Load seed data (fills tables with test users, books, etc.)
Step 4: Start Edge Functions locally (so checkout, subscribe, etc. work)
Step 5: Start the Next.js frontend (the website)
```

All five steps are standard commands. A new developer can go from "just cloned the repo" to "fully working local environment" in about 5 minutes.

### Deploying to Production

When code is pushed to the `main` branch on GitHub:
1. **Automated checks** run (linting, type checking, tests)
2. **Database migrations** are applied to the production database
3. **Edge Functions** are deployed to Supabase's edge network
4. **Frontend** is deployed to Vercel (or similar)

If any step fails, the deployment stops and the team is notified.

---

## 13. Scalability: Planning for Growth

The architecture is designed to handle growth without major rewrites:

| Concern | How We Handle It |
|---|---|
| **Database getting slow** | Performance indexes on every frequently-queried column (search, genre filter, user lookup) |
| **Too many database writes** | Reading progress saves every 30 seconds (not on every scroll). Counters are updated via triggers, not recalculated. |
| **Book catalog growing** | Cursor-based pagination loads 20 books at a time. Full-text search uses PostgreSQL's built-in high-speed search. |
| **Large books** | Chapters are stored separately. The reader loads one chapter at a time, not the entire book. |
| **Many concurrent users** | Supabase includes built-in connection pooling (efficiently sharing database connections). |
| **Edge Function speed** | Each function is small and focused (< 500 lines). Minimal imports keep startup times fast. |
| **File storage** | Cover images are served from Supabase's CDN (global edge network) for fast loading anywhere in the world. |

---

## 14. What's NOT in the Architecture

Based on previous decisions, these are intentionally excluded:

- ❌ Self-hosted servers or Docker containers (Supabase is fully managed)
- ❌ GraphQL (REST is simpler and sufficient for our needs)
- ❌ Redis or external caching layers (PostgreSQL performance is sufficient at our scale)
- ❌ WebSocket real-time features (future consideration for live discussions)
- ❌ Microservices (monolithic Supabase project is simpler and appropriate for our team size)
- ❌ Custom email service (GoHighLevel handles everything)
- ❌ Multiple databases (single PostgreSQL instance for all data)

---

## 15. Quick Glossary

| Term | What It Means |
|---|---|
| **Supabase** | An open-source backend platform that provides a database, authentication, file storage, and serverless functions — all in one package |
| **PostgreSQL** | The database engine Supabase uses. It's one of the most powerful and reliable databases in the world, used by companies like Apple and Instagram |
| **Edge Function** | A small server-side program that runs on Supabase's servers. Used for complex operations like checkout and subscription management |
| **Deno** | The runtime that executes Edge Functions. Similar to Node.js but more modern and secure |
| **RLS (Row-Level Security)** | Database rules that control who can read or modify specific rows. Think of it as a security guard for each row in each table |
| **Migration** | A numbered SQL file that makes a specific change to the database (create a table, add a column, etc.). Migrations run in order to build the full database |
| **Seed Data** | Fake data loaded into the database for development and testing purposes |
| **Trigger** | An automatic action the database performs when something happens (e.g., "when a new RSVP is created, increase the event's attendee count") |
| **Zod** | A TypeScript library for validating data. We use it on both the frontend and backend to check user input |
| **CHECK Constraint** | A database-level rule that rejects invalid data (e.g., "price must be greater than 0") |
| **Environment Variable** | A secret or configuration value stored outside the code (like API keys). Never committed to Git. |
| **Webhook** | A message sent from one service to another when something happens (e.g., Stripe tells our app "payment succeeded") |
| **CDN** | Content Delivery Network — a global network of servers that serves files (like images) from the location closest to the user |
| **Connection Pooling** | A technique for efficiently sharing database connections among many users, preventing the database from being overwhelmed |
| **Idempotent** | An operation that produces the same result regardless of how many times you call it. Important for reliability (e.g., if a network retry sends the same request twice, it shouldn't charge the customer twice) |

---

### Final Thought

This architecture document is the **blueprint for the kitchen**. Before writing a single line of backend code, we now know:
- Exactly where every file goes (folder structure)
- What technology handles each concern (Supabase, Stripe, GoHighLevel)
- How security is enforced at every level (frontend + database + server logic)
- How data is validated at every boundary (frontend + Edge Function + database)
- How errors are communicated clearly to the user
- How the system will scale as the platform grows

With the data model (Phase 2), API contract (Phase 3), and architecture (Phase 4) all locked in, the next step is **Phase 5: Implementation** — where we actually build the SQL migrations, write the Edge Functions, and connect everything together.
