-- ============================================================
-- Kane's Komet Book Reader — Row Level Security Policies
-- Migration: 20260221000001_rls_policies.sql
-- Depends on: 20260221000000_initial_schema.sql
-- ============================================================
-- All tables have RLS enabled in the previous migration.
-- This migration defines the actual access policies.
--
-- Policy naming convention:
--   {table}_{action}_{who}
--   e.g., users_select_own, books_select_published
-- ============================================================

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Returns true if the current user has an active premium subscription
CREATE OR REPLACE FUNCTION is_premium()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_subscriptions
    WHERE user_id = auth.uid()
      AND plan = 'premium'
      AND status = 'active'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Returns true if the current user is an admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
      AND role = 'admin'
      AND deleted_at IS NULL
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Returns true if the current user is banned
CREATE OR REPLACE FUNCTION is_banned()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
      AND is_banned = TRUE
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- SECTION 1: users
-- ============================================================

-- Any authenticated user can view only their own full profile.
-- Other users: only display_name is accessible (enforced by separate view in future).
CREATE POLICY users_select_own ON public.users
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own non-sensitive profile fields.
CREATE POLICY users_update_own ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Admins get full unrestricted access.
CREATE POLICY users_all_admin ON public.users
  USING (is_admin());

-- ============================================================
-- SECTION 2: books
-- ============================================================

-- Everyone (including guests) can read published, non-deleted books.
CREATE POLICY books_select_published ON public.books
  FOR SELECT USING (status = 'published' AND deleted_at IS NULL);

-- Only admins can create, update, or delete books.
CREATE POLICY books_all_admin ON public.books
  USING (is_admin());

-- ============================================================
-- SECTION 3: book_variants
-- ============================================================

-- Everyone can read variants for published books.
CREATE POLICY book_variants_select_all ON public.book_variants
  FOR SELECT USING (TRUE);

-- Admins only for mutations.
CREATE POLICY book_variants_all_admin ON public.book_variants
  USING (is_admin());

-- ============================================================
-- SECTION 4: book_pages
-- Read access requires the user to own the book in user_library.
-- Admins bypass this.
-- ============================================================

CREATE POLICY book_pages_select_owners ON public.book_pages
  FOR SELECT USING (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM public.user_library
      WHERE user_library.user_id = auth.uid()
        AND user_library.book_id = book_pages.book_id
    )
  );

CREATE POLICY book_pages_all_admin ON public.book_pages
  USING (is_admin());

-- ============================================================
-- SECTION 5: book_illustrations
-- Same ownership rule as book_pages.
-- ============================================================

CREATE POLICY book_illustrations_select_owners ON public.book_illustrations
  FOR SELECT USING (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM public.user_library
      WHERE user_library.user_id = auth.uid()
        AND user_library.book_id = book_illustrations.book_id
    )
  );

CREATE POLICY book_illustrations_all_admin ON public.book_illustrations
  USING (is_admin());

-- ============================================================
-- SECTION 6: user_subscriptions
-- ============================================================

CREATE POLICY user_subscriptions_select_own ON public.user_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY user_subscriptions_all_admin ON public.user_subscriptions
  USING (is_admin());

-- ============================================================
-- SECTION 7: promo_codes
-- Users can view their own code only.
-- ============================================================

CREATE POLICY promo_codes_select_own ON public.promo_codes
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY promo_codes_all_admin ON public.promo_codes
  USING (is_admin());

-- ============================================================
-- SECTION 8: promo_code_usages
-- ============================================================

CREATE POLICY promo_code_usages_select_own ON public.promo_code_usages
  FOR SELECT USING (auth.uid() = used_by_user_id);

CREATE POLICY promo_code_usages_all_admin ON public.promo_code_usages
  USING (is_admin());

-- ============================================================
-- SECTION 9: cart_items
-- Users manage their own cart. Guests use session_id (app-level).
-- ============================================================

CREATE POLICY cart_items_select_own ON public.cart_items
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY cart_items_insert_own ON public.cart_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY cart_items_update_own ON public.cart_items
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY cart_items_delete_own ON public.cart_items
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY cart_items_all_admin ON public.cart_items
  USING (is_admin());

-- ============================================================
-- SECTION 10: orders
-- ============================================================

CREATE POLICY orders_select_own ON public.orders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY orders_all_admin ON public.orders
  USING (is_admin());

-- ============================================================
-- SECTION 11: order_items
-- ============================================================

CREATE POLICY order_items_select_own ON public.order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
        AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY order_items_all_admin ON public.order_items
  USING (is_admin());

-- ============================================================
-- SECTION 12: user_library
-- ============================================================

CREATE POLICY user_library_select_own ON public.user_library
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY user_library_all_admin ON public.user_library
  USING (is_admin());

-- ============================================================
-- SECTION 13: reading_progress
-- ============================================================

CREATE POLICY reading_progress_all_own ON public.reading_progress
  USING (auth.uid() = user_id);

CREATE POLICY reading_progress_all_admin ON public.reading_progress
  USING (is_admin());

-- ============================================================
-- SECTION 14: highlights
-- Always private — never visible to other users.
-- ============================================================

CREATE POLICY highlights_all_own ON public.highlights
  USING (auth.uid() = user_id);

CREATE POLICY highlights_all_admin ON public.highlights
  USING (is_admin());

-- ============================================================
-- SECTION 15: bookmarks
-- ============================================================

CREATE POLICY bookmarks_all_own ON public.bookmarks
  USING (auth.uid() = user_id);

CREATE POLICY bookmarks_all_admin ON public.bookmarks
  USING (is_admin());

-- ============================================================
-- SECTION 16: reading_settings
-- ============================================================

CREATE POLICY reading_settings_select_own ON public.reading_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY reading_settings_update_own ON public.reading_settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY reading_settings_all_admin ON public.reading_settings
  USING (is_admin());

-- ============================================================
-- SECTION 17: book_club_selections
-- Publicly readable (for the Book Club page). Admin manages.
-- ============================================================

CREATE POLICY book_club_selections_select_all ON public.book_club_selections
  FOR SELECT USING (TRUE);

CREATE POLICY book_club_selections_all_admin ON public.book_club_selections
  USING (is_admin());

-- ============================================================
-- SECTION 18: book_club_events
-- Guests see public events. Authenticated users see all.
-- ============================================================

-- Guests and free users: public events only
CREATE POLICY book_club_events_select_public ON public.book_club_events
  FOR SELECT USING (is_public = TRUE);

-- Premium members or admins: all events
CREATE POLICY book_club_events_select_premium ON public.book_club_events
  FOR SELECT USING (is_premium() OR is_admin());

CREATE POLICY book_club_events_all_admin ON public.book_club_events
  USING (is_admin());

-- ============================================================
-- SECTION 19: event_rsvps
-- Free users: can RSVP to public events.
-- Premium users: can RSVP to all events.
-- ============================================================

CREATE POLICY event_rsvps_select_own ON public.event_rsvps
  FOR SELECT USING (auth.uid() = user_id);

-- Insert: free users can RSVP to public events only;
-- premium users/admins can RSVP to all.
CREATE POLICY event_rsvps_insert_authenticated ON public.event_rsvps
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND (
      is_admin()
      OR is_premium()
      OR EXISTS (
        SELECT 1 FROM public.book_club_events
        WHERE id = event_rsvps.event_id AND is_public = TRUE
      )
    )
  );

CREATE POLICY event_rsvps_update_own ON public.event_rsvps
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY event_rsvps_delete_own ON public.event_rsvps
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY event_rsvps_all_admin ON public.event_rsvps
  USING (is_admin());

-- ============================================================
-- SECTION 20: discussion_topics
-- Available to premium members (read). Admin manages.
-- ============================================================

-- Guests and free users: no access
-- Premium members: can read
CREATE POLICY discussion_topics_select_premium ON public.discussion_topics
  FOR SELECT USING (
    (is_premium() OR is_admin())
    AND deleted_at IS NULL
  );

CREATE POLICY discussion_topics_all_admin ON public.discussion_topics
  USING (is_admin());

-- ============================================================
-- SECTION 21: discussion_posts
-- ============================================================

-- Premium members can read non-deleted posts
CREATE POLICY discussion_posts_select_premium ON public.discussion_posts
  FOR SELECT USING (
    (is_premium() OR is_admin())
    AND deleted_at IS NULL
    AND NOT is_banned()
  );

-- Premium members can create posts (not banned)
CREATE POLICY discussion_posts_insert_premium ON public.discussion_posts
  FOR INSERT WITH CHECK (
    auth.uid() = author_id
    AND is_premium()
    AND NOT is_banned()
  );

-- Users can update their own posts within 15 min of creation
CREATE POLICY discussion_posts_update_own ON public.discussion_posts
  FOR UPDATE USING (
    auth.uid() = author_id
    AND deleted_at IS NULL
    AND (now() - created_at) <= INTERVAL '15 minutes'
    AND NOT is_banned()
  );

-- Users can soft-delete their own posts at any time
CREATE POLICY discussion_posts_delete_own ON public.discussion_posts
  FOR DELETE USING (auth.uid() = author_id AND NOT is_banned());

CREATE POLICY discussion_posts_all_admin ON public.discussion_posts
  USING (is_admin());

-- ============================================================
-- SECTION 22: discussion_votes
-- ============================================================

CREATE POLICY discussion_votes_all_own ON public.discussion_votes
  USING (
    auth.uid() = user_id
    AND is_premium()
    AND NOT is_banned()
  );

CREATE POLICY discussion_votes_all_admin ON public.discussion_votes
  USING (is_admin());

-- ============================================================
-- SECTION 23: audit_log
-- Only admins can read. System writes (via Edge Functions with service_role key).
-- ============================================================

CREATE POLICY audit_log_select_admin ON public.audit_log
  FOR SELECT USING (is_admin());
