-- ============================================================
-- Discussion room counts never moved off zero.
--
-- sync_topic_post_count() runs on every discussion_posts change and writes
-- post_count, member_count and last_activity_at onto discussion_topics. It ran
-- as the posting member, and RLS lets only admins UPDATE discussion_topics, so
-- for everyone else the UPDATE matched no rows and quietly did nothing.
--
-- Run it as its owner instead, with a fixed search_path as SECURITY DEFINER
-- functions should have, then recount every topic from its posts.
-- ============================================================

CREATE OR REPLACE FUNCTION public.sync_topic_post_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.discussion_topics
    SET post_count    = (
          SELECT COUNT(*) FROM public.discussion_posts
          WHERE topic_id = COALESCE(NEW.topic_id, OLD.topic_id)
            AND deleted_at IS NULL
        ),
        member_count  = (
          SELECT COUNT(DISTINCT author_id) FROM public.discussion_posts
          WHERE topic_id = COALESCE(NEW.topic_id, OLD.topic_id)
            AND deleted_at IS NULL
        ),
        last_activity_at = now()
  WHERE id = COALESCE(NEW.topic_id, OLD.topic_id);
  RETURN NEW;
END;
$$;

-- Backfill. last_activity_at only moves for topics that have posts, to the
-- newest one, so rooms nobody has posted in keep their current value.
UPDATE public.discussion_topics t
  SET post_count   = COALESCE(s.posts, 0),
      member_count = COALESCE(s.members, 0),
      last_activity_at = COALESCE(s.latest, t.last_activity_at)
FROM public.discussion_topics t2
LEFT JOIN (
  SELECT topic_id,
         COUNT(*)                  AS posts,
         COUNT(DISTINCT author_id) AS members,
         MAX(created_at)           AS latest
  FROM public.discussion_posts
  WHERE deleted_at IS NULL
  GROUP BY topic_id
) s ON s.topic_id = t2.id
WHERE t.id = t2.id;
