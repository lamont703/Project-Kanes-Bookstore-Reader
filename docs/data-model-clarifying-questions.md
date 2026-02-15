# Kane's Komet — Data Model Clarifying Questions

> **Purpose**: Your answers to these questions will directly shape the final, production-grade database design. There are no wrong answers — we just need your vision for the product so we can build the right thing.
>
> **How to use this file**: Read each question and type your answer directly below it. Feel free to be brief ("Yes", "No", "Not for V1") or detailed — whatever helps.

---

## Section A: Users & Authentication

### A1. Who can create an account?
Right now, anyone can log in with a mock login. In production, can anyone sign up for a free account, or is the app invite-only?

**Your answer:**
in production anyone can sign up for a free account. 
---

### A2. Social login?
Do you want users to be able to sign up with Google, Apple, or just email + password?

**Your answer:**
just email and password. 
---

### A3. Is there more than one type of admin?
Right now we have "reader" and "admin." Do you need finer-grained roles, like a "moderator" who can manage discussions but not delete books, or a "content editor" who can upload books but not manage users?

**Your answer:**
mostly everyone will be a reader. however the owner of the project will be an admin. and it is possible that in the future there will be other admins for his team. 
---

### A4. What happens when a user is banned?
When an admin bans a user, should they:
- (a) Be immediately logged out and blocked from logging back in?
- (b) Lose access to community features (discussions, events) but still be able to read their purchased books?
- (c) Something else?

**Your answer:**
if a user is banned they should still be able to read their purchased books. but they should not be able to access any community features. 
---

### A5. User profile — what's public vs. private?
Should other users be able to see someone's profile (like their display name and avatar in discussions), or is every user completely anonymous to other users?

**Your answer:**
in the community discussions other users should be able to see someone's display name but not their email address or any other personal information. They should also not be able to see their profile picture or profile. 
---

## Section B: Books & Content

### B1. Book content format — text or PDF?
This is a big architecture decision. Currently the reader shows text split into chapters and paragraphs. In production, will books be:
- (a) **Structured text** — You paste or upload the text, and we store it chapter by chapter (this is what the current reader supports natively, and it enables highlighting on specific paragraphs).
- (b) **PDF files** — Users view a PDF in the browser (this would limit highlighting/bookmark features).
- (c) **Both** — Some books are text-based and some are PDFs.

**Your answer:**
the idea that we had here was to have the admin user upload books via pdf and then use a pdf extraction tool to extract the text from the pdf and store it in the database. This way we would be able to take advantage of the highlighting and bookmark features of the current reader. The books are short so they could be saved chapter by chapter, but they will also have some illustrations that we need to incorporate into the reader. 
---

### B2. Can a book have multiple authors?
Right now "author" is a single text field (e.g., "Kane Evans"). Do any books have two or more authors? If so, should we create a separate Authors table so we can link multiple authors to one book?

**Your answer:**
There is only one author and one illustrator for each book. 
---

### B3. Are there ever free books?
Can a book have a price of $0.00, or does every book always cost money? This matters for the checkout flow.

**Your answer:**
there is a case where a book can be free if the user is signing up for the book club membership, they can select upto two books for free as part of the membership. 
---

### B4. Do books belong to series?
The upload form has a "Series" field. How important is this? Should users be able to browse by series (e.g., "Brute Syndicate 1, 2, 3, 4, 5") with the books shown in order?

**Your answer:**
yes some books belong to a series. and they should be shown in order. and some books are stand alone books.
---

### B5. Will the genre list change over time?
The current genres are: Crime, Children, PTP, Spiritual, Adult, Sports, Self-Help, Cooking. Can an admin add new genres from the admin panel, or is this a fixed list that only a developer can change?

**Your answer:**
the genres are fixed and only a developer can change them. 
---

### B6. What does "PTP" stand for?
Just want to make sure this is documented correctly in the database enum.

**Your answer:**
Prayers, Thoughts, and Poetry
---

### B7. Inventory / stock tracking?
The admin books page shows "In Stock" for every book. Is that just a label, or do you want to track actual inventory counts (e.g., "42 copies remaining")? Or since these are e-books, is stock unlimited?

**Your answer:**
we do not need to count the stock we just need to know if the book is in stock or not. 
---

## Section C: Shopping & Payments

### C1. Which payment processor?
The checkout page collects credit card info. For production, which provider do you want to use?
- (a) **Stripe** (most common with Supabase, handles subscriptions natively)
- (b) **PayPal**
- (c) **Square**
- (d) **Other** — please specify
- (e) **Haven't decided yet**

**Your answer:**
we will use Stripe.
---

### C2. Is the 5% tax (GST) always 5%?
The cart currently calculates a flat 5% GST on every order. Does the tax rate need to:
- (a) Stay at a flat 5% for everyone?
- (b) Vary by state or country?
- (c) Be configurable by an admin?

**Your answer:**
lets keep it at a flat 5% for now. 
---

### C3. Refunds and cancellations?
If a user buys a book and wants a refund, how should we handle it?
- (a) No refunds — all sales are final.
- (b) Refunds within X days.
- (c) Admin can issue refunds manually.

**Your answer:**
all sales are final. 
---

### C4. Order confirmation emails?
When a purchase is completed, should the system send the user a confirmation email with their order details?

**Your answer:**
we would like to use gohighlevel to send the order confirmation emails. 
---

### C5. Can a user buy the same book twice?
For example, as a gift. Or should the system prevent duplicate purchases for the same user?

**Your answer:**
the user should not be able to buy the same book twice. 
---

## Section D: Subscriptions & Book Club

### D1. Subscription billing — who handles recurring charges?
The subscription modal shows $49.99 upfront + $3.99/month. In production:
- (a) Does a real payment processor handle the monthly billing automatically?
- (b) Or is the subscription managed manually by an admin?

**Your answer:**
we will use Stripe to handle the monthly billing automatically.
---

### D2. What do premium members get that free users don't?
Currently, the frontend checks `komet_subscription_active`. In the production version, which features are premium-only?
- Reading any book for free?
- Access to the monthly book club pick?
- Access to community discussions?
- Access to private events?
- All of the above?
- Something else?

**Your answer:**
premium members are those that sign up to the book club and they get access to all of the above. members that are not members of the book club can still purchase books and read them in the book reader. 
---

### D3. Can a premium membership be paused?
If a user can't afford $3.99 this month, can they "pause" instead of cancelling? This would add a "paused" status to the subscription.

**Your answer:**
no they cannot pause their membership. they can cancel it and sign up again later. 
---

### D4. The "Kane Dealer Code" — how does the 35% discount work?
The subscription modal mentions a "Kane Dealer Code (35% OFF)." Questions:
- Does every premium member get one code to share?
- Is it a one-time use code, or can it be used by multiple people?
- Does it apply to book purchases, subscription fees, or both?

**Your answer:**
it does not apply to subscription fees. it will apply to all other items in the store used at checkout. it can be used by multiple people. and it can be used multiple times. every premium member will get a unique code. 
---

### D5. The 2 free books at signup — do they expire?
When a user signs up for premium, they pick 2 books. Do those books stay in their library forever, even if they cancel their subscription?

**Your answer:**
they do not expire. they stay in their library forever.
---

### D6. Monthly book club pick — does it auto-add to members' libraries?
When a new month's book is selected, does it automatically appear in every premium member's library, or do they have to manually claim it?

**Your answer:**
it should automatically appear in every premium member's library. only for premium members. 
---

## Section E: Reading Experience

### E1. Should reading progress sync across devices?
If a user reads to Chapter 5 on their phone, should they see Chapter 5 when they open the app on their laptop?

**Your answer:**
yes they should. 
---

### E2. Is there a limit on highlights and bookmarks?
Can a user create unlimited highlights and bookmarks, or should we cap it (e.g., "free users get 10 highlights per book, premium unlimited")?

**Your answer:**
yes lets cap it to 10 highlights per book for all users. 
---

### E3. Can users share highlights?
Should a user be able to share a highlighted quote publicly (e.g., to discussions or social media), or are highlights always private?

**Your answer:**
highlights should always be private. 
---

## Section F: Community & Discussions

### F1. Who can create discussion topics?
Currently, only admins create topics (from the admin panel). Should regular users also be able to start new discussion topics?

**Your answer:**
only admins should be able to create discussion topics. 
---

### F2. Can users edit or delete their own comments?
The current frontend doesn't show edit/delete buttons for a user's own comment. Should users be able to:
- (a) Edit their comments within a time window (e.g., 15 minutes)?
- (b) Delete their own comments anytime?
- (c) Neither — once posted, it's permanent?

**Your answer:**
users should be able to edit their comments within a time window of 15 minutes. and they should be able to delete their own comments anytime. 
---

### F3. Should there be any content moderation?
If someone posts something offensive in a discussion:
- (a) Admins manually review and delete it?
- (b) Users can "report" a post, and admins review reports?
- (c) Automatic word filter?
- (d) All of the above?

**Your answer:**
admin should be able to manually review and delete comments. 
---

### F4. Do discussions require a premium membership?
Can free users participate in discussions, or is it a premium-only perk?

**Your answer:**
it is for premium members only. 
---

## Section G: Events & RSVPs

### G1. Is there a max capacity for events?
Should events have a limit on how many people can RSVP (e.g., "50 spots available")? If so, what happens when it's full?

**Your answer:**
there is no max capacity for events. 
---

### G2. Can non-logged-in users RSVP?
The RSVP form asks for name, email, and phone — but doesn't require a login. Should guests be allowed to RSVP, or must they have an account?

**Your answer:**
they must have an account to RSVP.
---

### G3. Should RSVPs trigger calendar invites?
When someone RSVPs, should the system send them a calendar invite (.ics file) or a Google Calendar link?

**Your answer:**
no
---

## Section H: Notifications & Communication

### H1. Do you want email notifications at all?
This is a big feature. If yes, which events should trigger an email?
- [ ] Order confirmation
- [ ] Subscription welcome email
- [ ] New monthly book club pick announced
- [ ] Someone replied to your discussion comment
- [ ] Upcoming event reminder
- [ ] Subscription payment failed
- [ ] Admin banned your account
- [ ] Other: ___

**Your answer:**
yes we would like gohighlevel to handle all email notifications. we will use it to send emails to users for all of the above events. 
---

### H2. In-app notifications?
Should there be a notification bell in the header that shows things like "New reply to your comment" or "New book club pick this month"?

**Your answer:**
no
---

## Section I: Reviews & Ratings

### I1. User reviews — yes or no?
Books have a `rating` field, but there's currently no way for users to leave reviews. Do you want:
- (a) **No user reviews** — the rating is an editorial score set by the admin.
- (b) **User reviews with star ratings** — users can rate and write a text review.
- (c) **Star ratings only** — users can rate but not write a review.

**Your answer:**
no user reviews. we will remove the reviews from the book pages. 
---

### I2. If yes to reviews — can they be anonymous?
Should a review show the user's display name, or should it be anonymous?

**Your answer:**
reviews are not needed. 
---

## Section J: Admin & Operations

### J1. How many admins will there be?
Is this a one-person operation (just you), or will there be a team of people managing the admin panel?

**Your answer:**
for now just the owner and me the developer. 
---

### J2. Does the admin need analytics and reporting?
The admin dashboard currently shows a "Community Snapshot" table. Do you want real analytics, like:
- Total revenue this month?
- Most popular book?
- User growth over time?
- Subscription churn rate?

**Your answer:**
no
---

### J3. Data export?
Should admins be able to export data (e.g., a CSV of all users, all orders, etc.)?

**Your answer:**
no
---

## Section K: Growth & Future Features

### K1. Multiple languages?
Will the app ever need to support languages other than English? This would affect how we store book content and UI strings.

**Your answer:**
no
---

### K2. Audiobooks?
Do you plan to add audiobooks in the future? This would add fields like `audio_file_url` and `duration_minutes` to the books table.

**Your answer:**
no
---

### K3. Wishlists?
Should users be able to "wishlist" a book (save it for later without adding to cart)?

**Your answer:**
no
---

### K4. Reading streaks or gamification?
Do you want features like "7-day reading streak" badges, achievement systems, or reading challenges?

**Your answer:**
no
---

### K5. Mobile app?
Is a native mobile app (iOS/Android) on the roadmap? If so, the API design needs to be even more carefully structured for mobile consumption.

**Your answer:**
no
---

## Section L: Follow-Up Questions (Based on Your Answers)

> These came up because some of your answers revealed important new details. Just a few more and we're ready to build!

---

### L1. Illustrations inside books — how should they appear in the reader?
You mentioned that books have illustrations that need to be incorporated into the reader. When the admin uploads a PDF and we extract the text, how should illustrations be handled?
- (a) **Extract the images from the PDF** and display them inline between paragraphs in the current reader (like a regular book with pictures between text).
- (b) **Show illustrations as full-page images** between chapters or sections.
- (c) **Something else** — please describe.

This matters because it determines whether we need an `illustrations` table with position data (which chapter, which paragraph it appears after), or if we just embed image URLs directly in the chapter content.

**Your answer:**
lets show them as full page images between chapters or sections
---

### L2. The illustrator — should they be credited on the book page?
You said each book has one author and one illustrator. Should the illustrator's name be displayed on the book card, the book detail page, or both? Or is it just stored for internal record-keeping?

**Your answer:**
just store for internal record keeping
---

### L3. GoHighLevel integration — webhook or API?
You mentioned using GoHighLevel for all email notifications (order confirmations, subscription emails, event reminders, etc.). For the data model, I need to know:
- (a) Will we send a **webhook** to GoHighLevel when events happen (e.g., "order placed" → GoHighLevel receives it and sends the email)?
- (b) Will we call the **GoHighLevel API directly** from our Supabase Edge Functions?
- (c) **Not sure yet** — I just know I want GoHighLevel to handle emails.

This tells me whether we need to store GoHighLevel contact IDs in our `users` table and whether we need an `email_events` log table to track what was sent.

**Your answer:**
we may use both instances but i'm not sure which one yet
---

### L4. Stripe subscription — is it $49.99 one-time + $3.99/month, or just $3.99/month?
I want to confirm the exact Stripe setup:
- (a) User pays **$49.99 upfront** (one-time fee) **plus $3.99/month** recurring — two separate Stripe charges.
- (b) User pays **$49.99 for the first month** and then **$3.99/month** after that — one Stripe subscription with an initial higher price.
- (c) Something else?

**Your answer:**
user pays $49.99 for the first month and then starting the second month $3.99/month. Or the user can buy a book(s) at the displayed price.
---

### L5. Dealer codes — what format, and is there a limit?
You said every premium member gets a unique dealer code that gives 35% off at checkout. A few details:
- What format should the code be? (e.g., `KANE-XXXX`, random string, user's name + numbers?)
- Is the 35% discount always 35%, or could some codes have different percentages in the future?
- Should the system track how many times each code has been used and by whom?

**Your answer:**
we need to be able to track who the dealer code belongs to so that when it is used we can know which dealer to credit. The code should incorporate the a combination of the dealers name and phone number and KANE prefix, without being too long. the 35% discount is always 35%. We should track how many times each code has been used and by whom.
---

### L6. The 2 free books — you said "yes they do" expire. What does that mean exactly?
When you said the 2 free books expire, did you mean:
- (a) The books **disappear from their library** when they cancel their premium subscription?
- (b) The books stay in their library **forever** (they keep them even after cancelling)?

I want to make sure I got this right — "yes they do" was in response to "do they expire?"

**Your answer:**
The 2 free books do not expire. They stay in their library forever.
---

### L7. Books that are "not in stock" — what happens to the user?
You said we just need to know if a book is in stock or not (a simple yes/no). When a book is marked "not in stock":
- (a) Should the book still appear on the Browse page but with a "Coming Soon" or "Out of Stock" label and no "Add to Cart" button?
- (b) Should the book be hidden from the Browse page entirely?
- (c) Something else?

**Your answer:**
it should still appear on the Browse page but with a "Coming Soon" or "Out of Stock" label and no "Add to Cart" button.
---

### L8. Book series — do you want a "Series" page?
You confirmed that some books belong to a series. Should there be:
- (a) A **dedicated Series page** where a user can see all books in a series in order (like a mini collection)?
- (b) Just a **label on the book card** that says "Brute Syndicate #3" and users can filter/search by series name?
- (c) Both?

**Your answer:**
no we do not need a series page. just a label on the book card that says "Brute Syndicate #3" and users can filter/search by series name.
---

### L9. When a premium member is banned — what about their subscription?
If an admin bans a premium member, should their subscription:
- (a) **Continue charging** them (they still get books, just can't use community features)?
- (b) **Be cancelled automatically** (they lose premium access and stop being charged)?

**Your answer:**
if a premium member is banned, their subscription should be cancelled automatically. they lose premium access and stop being charged. they can still purchase books and read them in the book reader. 
---

### L10. Bookmarks — same cap as highlights?
You said highlights should be capped at 10 per book for all users. Should bookmarks follow the same rule (10 per book), or are bookmarks unlimited?

**Your answer:**
10 per book as well 
---

## You're Done (For Real This Time)!

Once you've answered these follow-ups, I'll have everything I need to:
1. **Finalize the database schema** — no more guesswork.
2. **Write the SQL migrations** — production-ready Supabase migration files.
3. **Define the API contracts** — what the Edge Functions should accept and return.
4. **Update the frontend** — replace localStorage with real API calls.

Thank you for taking the time to answer these — it makes the difference between a "demo app" and a **real product**.
