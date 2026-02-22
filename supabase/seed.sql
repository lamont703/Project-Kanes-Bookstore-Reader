-- ============================================================
-- Kane's Komet Master Seed Script
-- Populates the catalog with all mock books and variants
-- ============================================================

-- Clean up existing test data to avoid conflicts
TRUNCATE public.books, public.book_variants CASCADE;

-- ------------------------------------------------------------
-- 1. Brute Syndicate
-- ------------------------------------------------------------
INSERT INTO public.books (id, title, author, description, genre, status, cover_image_url)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Brute Syndicate',
  'Caleb V. Kaine',
  'In a world ruled by corporate syndicates, one brute fights for the little guy. A hard-hitting, neon-soaked adventure.',
  'Crime',
  'published',
  '/Brute Syndicate 1 Cover.webp'
);

INSERT INTO public.book_variants (book_id, format, price, is_in_stock)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'ebook', 14.99, true),
  ('00000000-0000-0000-0000-000000000001', 'paper_book', 29.99, true),
  ('00000000-0000-0000-0000-000000000001', 'komet_card', 9.99, true);

-- ------------------------------------------------------------
-- 2. The Void Between
-- ------------------------------------------------------------
INSERT INTO public.books (id, title, author, description, genre, status, cover_image_url)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  'The Void Between',
  'Marcus Stone',
  'A gripping tale of murder and intrigue set in the depths of space, where no one can hear you scream.',
  'Crime',
  'published',
  '/dark-mystery-book-cover.jpg'
);

INSERT INTO public.book_variants (book_id, format, price, is_in_stock)
VALUES 
  ('00000000-0000-0000-0000-000000000002', 'ebook', 12.99, true),
  ('00000000-0000-0000-0000-000000000002', 'paper_book', 24.99, true),
  ('00000000-0000-0000-0000-000000000002', 'komet_card', 9.99, true);

-- ------------------------------------------------------------
-- 3. Flying With The Chrysiridiarhipheus
-- ------------------------------------------------------------
INSERT INTO public.books (id, title, author, illustrator, description, genre, status, cover_image_url)
VALUES (
  '00000000-0000-0000-0000-000000000003',
  'Flying With The Chrysiridiarhipheus',
  'Caleb V. Kaine',
  'Maya Solstice',
  'A young pilot bonds with a legendary Chrysiridiarhipheus to save their floating world from plummeting into the abyss.',
  'Children',
  'published',
  '/Flying With The Chrysiridiarhipheus 1 Cover.webp'
);

INSERT INTO public.book_variants (book_id, format, price, is_in_stock)
VALUES 
  ('00000000-0000-0000-0000-000000000003', 'ebook', 15.99, true),
  ('00000000-0000-0000-0000-000000000003', 'paper_book', 34.99, true),
  ('00000000-0000-0000-0000-000000000003', 'komet_card', 12.99, true);

-- ------------------------------------------------------------
-- 4. Somes 3
-- ------------------------------------------------------------
INSERT INTO public.books (id, title, author, description, genre, status, cover_image_url)
VALUES (
  '00000000-0000-0000-0000-000000000004',
  'Somes 3',
  'Caleb V. Kaine',
  'The thrilling conclusion to the Somes trilogy. Boundaries dissolve as the syndicate faces its final, most devastating threat.',
  'PTP',
  'published',
  '/Somes 3 Cover.webp'
);

INSERT INTO public.book_variants (book_id, format, price, is_in_stock)
VALUES 
  ('00000000-0000-0000-0000-000000000004', 'ebook', 18.99, true),
  ('00000000-0000-0000-0000-000000000004', 'paper_book', 39.99, true),
  ('00000000-0000-0000-0000-000000000004', 'komet_card', 14.99, true);

-- ------------------------------------------------------------
-- 5. Nebula Nightmares
-- ------------------------------------------------------------
INSERT INTO public.books (id, title, author, description, genre, status, cover_image_url)
VALUES (
  '00000000-0000-0000-0000-000000000005',
  'Nebula Nightmares',
  'Raven Dark',
  'Terror lurks in the nebula shadows as a crew discovers they are not alone in the cosmic void.',
  'Spiritual',
  'published',
  '/horror-thriller-book-cover.jpg'
);

INSERT INTO public.book_variants (book_id, format, price, is_in_stock)
VALUES 
  ('00000000-0000-0000-0000-000000000005', 'ebook', 11.99, true),
  ('00000000-0000-0000-0000-000000000005', 'paper_book', 21.99, true),
  ('00000000-0000-0000-0000-000000000005', 'komet_card', 8.99, true);

-- ------------------------------------------------------------
-- 6. The Quantum Thief
-- ------------------------------------------------------------
INSERT INTO public.books (id, title, author, description, genre, status, cover_image_url)
VALUES (
  '00000000-0000-0000-0000-000000000006',
  'The Quantum Thief',
  'Alex Quantum',
  'A high-stakes heist across multiple dimensions where reality itself is the ultimate prize.',
  'Adult',
  'published',
  '/thriller-heist-book-cover.jpg'
);

INSERT INTO public.book_variants (book_id, format, price, is_in_stock)
VALUES 
  ('00000000-0000-0000-0000-000000000006', 'ebook', 15.99, true),
  ('00000000-0000-0000-0000-000000000006', 'paper_book', 32.99, true),
  ('00000000-0000-0000-0000-000000000006', 'komet_card', 12.99, true);

-- ------------------------------------------------------------
-- 7. Realm of Infinite Skies
-- ------------------------------------------------------------
INSERT INTO public.books (id, title, author, description, genre, status, cover_image_url)
VALUES (
  '00000000-0000-0000-0000-000000000007',
  'Realm of Infinite Skies',
  'Aria Windwalker',
  'An epic fantasy saga where magic and technology collide in a world suspended between dimensions.',
  'Sports',
  'published',
  '/epic-fantasy-book-cover.jpg'
);

INSERT INTO public.book_variants (book_id, format, price, is_in_stock)
VALUES 
  ('00000000-0000-0000-0000-000000000007', 'ebook', 16.99, true),
  ('00000000-0000-0000-0000-000000000007', 'paper_book', 36.99, true),
  ('00000000-0000-0000-0000-000000000007', 'komet_card', 15.99, true);

-- ------------------------------------------------------------
-- 8. Echoes of Mars
-- ------------------------------------------------------------
INSERT INTO public.books (id, title, author, description, genre, status, cover_image_url)
VALUES (
  '00000000-0000-0000-0000-000000000008',
  'Echoes of Mars',
  'Commander Sarah Chen',
  'The incredible true story of humanity first Mars colony and the pioneers who made it possible.',
  'Self-Help',
  'published',
  '/mars-biography-book-cover.jpg'
);

INSERT INTO public.book_variants (book_id, format, price, is_in_stock)
VALUES 
  ('00000000-0000-0000-0000-000000000008', 'ebook', 17.99, true),
  ('00000000-0000-0000-0000-000000000008', 'paper_book', 38.99, true),
  ('00000000-0000-0000-0000-000000000008', 'komet_card', 16.99, true);
