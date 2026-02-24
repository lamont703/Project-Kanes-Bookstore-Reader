-- Add 'admin_gift' to library_source_enum
-- Note: In Postgres, adding a value to an enum cannot be done in a transaction in some versions/environments.
-- Supabase handles this fine usually, but we need to ensure the type exists.

ALTER TYPE public.library_source_enum ADD VALUE IF NOT EXISTS 'admin_gift';
