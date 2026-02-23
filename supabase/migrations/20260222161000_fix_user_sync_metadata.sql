-- ============================================================
-- Fix User Sync Trigger
-- Updates handle_new_user to correctly capture all registration fields
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  meta_first_name TEXT := NEW.raw_user_meta_data->>'first_name';
  meta_last_name TEXT := NEW.raw_user_meta_data->>'last_name';
  calculated_full_name TEXT := TRIM(COALESCE(meta_first_name, '') || ' ' || COALESCE(meta_last_name, ''));
BEGIN
  INSERT INTO public.users (
    id, 
    email, 
    display_name, 
    full_name, 
    phone, 
    date_of_birth, 
    avatar_url
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'display_name', 
      calculated_full_name,
      NEW.email
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      calculated_full_name,
      ''
    ),
    NEW.raw_user_meta_data->>'phone',
    CASE 
      WHEN NEW.raw_user_meta_data->>'dob' IS NOT NULL AND NEW.raw_user_meta_data->>'dob' <> ''
      THEN (NEW.raw_user_meta_data->>'dob')::DATE 
      ELSE NULL 
    END,
    NEW.raw_user_meta_data->>'avatar_url'
  );

  -- Also create default reading settings
  INSERT INTO public.reading_settings (user_id, zoom, theme)
  VALUES (NEW.id, 100, 'dark');

  -- Also create default subscription (free)
  INSERT INTO public.user_subscriptions (user_id, plan, status)
  VALUES (NEW.id, 'free', 'active');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
