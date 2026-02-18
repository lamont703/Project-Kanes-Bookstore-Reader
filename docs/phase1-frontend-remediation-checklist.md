# Phase 1: Frontend UI/UX & Feature Checklist

This checklist focuses on immediate frontend-only improvements identified during the audit. These tasks involve fixing inconsistencies, enhancing user experience, and building out UI components that do not yet require a functional backend.

---

## 🐛 Bug Fixes & Data Cleanup

- [x] **Fix Genre Mismatch:** Update `GENRES` in `lib/mock-books.ts` and throughout the app to: `["Crime", "Children", "PTP", "Spiritual", "Adult", "Sports", "Self-Help", "Cooking"]`.
- [x] **Repair Selection Card:** Remove the `pageCount` line from `BookClubSelectionCard.tsx`.
- [x] **Sync Discussion Models:** Standardize discussion views and remove unnecessary category/engagement indicators.
- [x] **Admin Sidebar Active States:** Ensure the admin sidebar correctly highlights the active route/page for all sub-pages.
- [x] **Responsive Header Fixes:** Verify and fix any layout shifting in the `SiteHeader` when switching between guest and "logged in" mock states.

---

## 📝 Form & Validation Enhancements

- [x] **Password Match & Length Check:** Update the Registration form to require at least 8 characters and ensure "Password" and "Confirm Password" match.
- [x] **Standardized Error Feedback:** Implement a **subtle red border** around invalid inputs and a **toast notification** when validation fails (especially in the Subscription Modal).
- [x] **Address Field Autocomplete:** Explore adding basic client-side format checking for address fields.
- [x] **Mock Payment Feedback:** Add basic card number format validation (e.g., 16 digits) to the payment fields.

---

## ✨ UI/UX Refinements

- [x] **Bouncing Cart Icon:** Implement a bounce animation on the header's cart icon whenever a user adds an item to the cart.
- [x] **Simple Empty States:** Add consistent text and icons for "Empty" scenarios (Cart, Library, etc.).
- [x] **Consistent Loading Skeletons:** Ensure skeletons are used during all simulated "loading" states across the site.
- [x] **Reader Transition Animations:** Add subtle transitions when navigating between chapters.

---

## 🚀 New Frontend-Only Features

- [x] **Order History UI:** Build a mockup for "Past Orders" on the dashboard, including a **Most Recent Order** summary card on the main dashboard view.
- [x] **Profile Settings UI:** Create a simple layout for account/profile management.
- [x] **Discussion Comment/Reply UI:** Build a recursive **Reddit-style nested comment** UI for users to interact within admin-created topics.
- [x] **RSVP Confirmation UI:** Add a success state/feedback for the RSVP button.

---

## 🎨 Design & Consistency

- [x] **Admin Panel Polish:** Maintain the current vibe while ensuring all new dialogs/modals follow the existing design system.
- [x] **Iconography Sync:** Ensure icon usage is consistent across the app.

---

*This checklist focuses exclusively on the frontend. Backend-related tasks like real auth, API integration, and database persistence will be handled in later phases.*
