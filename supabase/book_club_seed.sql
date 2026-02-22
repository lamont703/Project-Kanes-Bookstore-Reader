-- ============================================================
-- Kane's Komet Book Club Seed Script
-- Populates selections, events, and discussion topics
-- ============================================================

-- Use the existing book IDs from master seed
-- 1: Brute Syndicate (00000000-0000-0000-0000-000000000001)
-- 3: Flying With The Chrysiridiarhipheus (00000000-0000-0000-0000-000000000003)
-- 4: Somes 3 (00000000-0000-0000-0000-000000000004)

-- ------------------------------------------------------------
-- 1. Book Club Selections
-- ------------------------------------------------------------
INSERT INTO public.book_club_selections (id, month, year, book_id, theme, description, discussion_date, status)
VALUES 
  (gen_random_uuid(), 'January', 2025, '00000000-0000-0000-0000-000000000001', 'Underground Resistance', 
   'Dive into the gritty underbelly of a dystopian future. This month we explore themes of resistance, identity, and the cost of freedom in Brute Syndicate.', 
   '2025-01-28', 'current'),
  
  (gen_random_uuid(), 'February', 2025, '00000000-0000-0000-0000-000000000003', 'Skies of Legend', 
   'Prepare for flight! Next month we soar through the clouds with a tale of mythical bonds and aerial adventure.', 
   '2025-02-25', 'upcoming'),
  
  (gen_random_uuid(), 'December', 2024, '00000000-0000-0000-0000-000000000004', 'Syndicate Wars', 
   'We wrapped up the year with the explosive finale of the Somes trilogy. A discussion on power, corruption, and redemption.', 
   '2024-12-20', 'past');

-- ------------------------------------------------------------
-- 2. Book Club Events
-- ------------------------------------------------------------
INSERT INTO public.book_club_events (id, title, description, date, time, location, type, is_public)
VALUES
  (gen_random_uuid(), 'Live Q&A with Brute Syndicate Author', 
   'Join us for an exclusive live Q&A session with the author of our current book club selection. We will explore the inspirations and the scientific theories that shaped the ending.', 
   '2025-02-15', '7:00 PM EST', 'https://zoom.us/j/cosmic-drift', 'virtual', true),
   
  (gen_random_uuid(), 'Sci-Fi Writing Workshop: World Building', 
   'Hone your world-building and character development skills in this interactive workshop for aspiring sci-fi writers. Learn how to create believable alien ecosystems and complex space-faring societies.', 
   '2025-03-05', '2:00 PM EST', 'https://meet.google.com/sci-fi-workshop', 'virtual', true),
   
  (gen_random_uuid(), 'Cosmic Librarian Meetup', 
   'Local readers gather for a night of physical book swapping and synth-wave music. Bring your favorites to share!', 
   '2025-01-25', '6:00 PM EST', 'Komet HQ Central Hub', 'in-person', false);

-- ------------------------------------------------------------
-- 3. Discussion Topics
-- ------------------------------------------------------------
INSERT INTO public.discussion_topics (id, title, description, category, book_id, is_pinned, is_featured)
VALUES
  (gen_random_uuid(), 'Official: Brute Syndicate Discussion', 
   'The primary forge for all deep-dives into our January selection. Share your theories, favorite quotes, and ending reactions.', 
   'Book Club', '00000000-0000-0000-0000-000000000001', true, true),
   
  (gen_random_uuid(), 'The Great Filter: News & Updates', 
   'Stay updated with the latest transmissions from Komet HQ. New features, server updates, and galactic announcements.', 
   'News', NULL, true, false),
   
  (gen_random_uuid(), 'Brute Syndicate: Crime & Justice', 
   'A specialized room for discussing the themes of crime, corruption, and street-level justice across the Komet catalog.', 
   'Crime', '00000000-0000-0000-0000-000000000001', false, true);
