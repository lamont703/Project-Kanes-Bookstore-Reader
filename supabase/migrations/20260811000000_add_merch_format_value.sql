-- Add the 'merch' variant format.
--
-- Kept in its own migration on purpose: a new enum value cannot be USED in the
-- same transaction that adds it. The follow-up migration
-- (20260811000001_extend_books_to_catalog.sql) references nothing that needs
-- this value at DDL time, but splitting removes any doubt and keeps the
-- catalog migration re-runnable.

ALTER TYPE book_format_enum ADD VALUE IF NOT EXISTS 'merch';
