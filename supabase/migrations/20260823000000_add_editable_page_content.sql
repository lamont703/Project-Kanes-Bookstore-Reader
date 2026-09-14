-- Editable page content.
--
-- Marketing copy currently lives in content/marketing/*.json, read off disk with
-- fs.readFile at build time. That makes every word of the site a code deploy,
-- which is what blocks admin editing entirely. This moves page content into the
-- database so it can be changed at runtime and published.
--
-- SHAPE: a whole page is one JSONB document, not a row per block.
--
-- The alternative -- normalised sections and blocks tables -- buys per-block
-- querying that nothing needs: every consumer renders a whole page at once. It
-- costs a great deal though. Reordering becomes a rewrite of position columns
-- across many rows, an editor holding unsaved changes has to reconcile them
-- against rows that may have moved underneath it, and "discard my draft" stops
-- being a single statement. A document is read in one query, replaced
-- atomically, and matches how the planned editor works: it manipulates a tree
-- in the browser and saves the result.
--
-- VERSIONS: exactly two rows per page, draft and published, enforced by the
-- unique constraint below.
--
--   editing  -> write the draft row
--   publish  -> copy draft.document into the published row
--   discard  -> copy published.document back over the draft
--
-- The public site only ever reads the published row, so an admin can leave a
-- half-finished draft sitting for a week without it reaching a visitor.

CREATE TABLE IF NOT EXISTS public.pages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT NOT NULL UNIQUE,
  title       TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.pages IS
  'One row per editable marketing page. Content lives in page_versions.';

DO $$ BEGIN
  CREATE TYPE page_version_state AS ENUM ('draft', 'published');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.page_versions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id       UUID NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
  state         page_version_state NOT NULL,
  document      JSONB NOT NULL,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  published_at  TIMESTAMPTZ,
  -- At most one draft and one published row per page. This is what makes
  -- "the draft" and "the published page" unambiguous things to address.
  UNIQUE (page_id, state)
);

CREATE INDEX IF NOT EXISTS idx_page_versions_lookup
  ON public.page_versions (page_id, state);

COMMENT ON COLUMN public.page_versions.document IS
  'Whole-page content tree: { version, sections: [{ id, kind, name, settings, blocks }] }.';

-- Keep updated_at honest without the application having to remember.
CREATE TRIGGER trg_pages_updated_at
  BEFORE UPDATE ON public.pages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_page_versions_updated_at
  BEFORE UPDATE ON public.page_versions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ------------------------------------------------------------------- RLS
ALTER TABLE public.pages         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_versions ENABLE ROW LEVEL SECURITY;

-- The page list itself is not secret: the slugs are public URLs.
DROP POLICY IF EXISTS pages_public_read ON public.pages;
CREATE POLICY pages_public_read ON public.pages
  FOR SELECT USING (true);

DROP POLICY IF EXISTS pages_admin_write ON public.pages;
CREATE POLICY pages_admin_write ON public.pages
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- Anyone may read published content; that is the website. Drafts are visible
-- only to admins -- otherwise unreleased copy could be read straight out of the
-- API by anyone who knew the table existed.
DROP POLICY IF EXISTS page_versions_public_read_published ON public.page_versions;
CREATE POLICY page_versions_public_read_published ON public.page_versions
  FOR SELECT USING (state = 'published');

DROP POLICY IF EXISTS page_versions_admin_read_all ON public.page_versions;
CREATE POLICY page_versions_admin_read_all ON public.page_versions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS page_versions_admin_write ON public.page_versions;
CREATE POLICY page_versions_admin_write ON public.page_versions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- --------------------------------------------------------------- publish
-- Publishing and discarding are single statements against the pair of rows, so
-- they cannot half-apply. Doing this in the application would mean read-then-
-- write with a window where the two rows disagree.
CREATE OR REPLACE FUNCTION public.publish_page(p_slug TEXT)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_page_id UUID;
  v_doc     JSONB;
  v_now     TIMESTAMPTZ := now();
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'publish_page: not authorised';
  END IF;

  SELECT id INTO v_page_id FROM public.pages WHERE slug = p_slug;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'publish_page: no page with slug %', p_slug;
  END IF;

  SELECT document INTO v_doc
  FROM public.page_versions WHERE page_id = v_page_id AND state = 'draft';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'publish_page: % has no draft to publish', p_slug;
  END IF;

  INSERT INTO public.page_versions (page_id, state, document, updated_by, published_at)
  VALUES (v_page_id, 'published', v_doc, auth.uid(), v_now)
  ON CONFLICT (page_id, state) DO UPDATE
    SET document = EXCLUDED.document,
        updated_by = EXCLUDED.updated_by,
        published_at = EXCLUDED.published_at;

  RETURN v_now;
END;
$$;

CREATE OR REPLACE FUNCTION public.discard_page_draft(p_slug TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_page_id UUID;
  v_doc     JSONB;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'discard_page_draft: not authorised';
  END IF;

  SELECT id INTO v_page_id FROM public.pages WHERE slug = p_slug;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'discard_page_draft: no page with slug %', p_slug;
  END IF;

  SELECT document INTO v_doc
  FROM public.page_versions WHERE page_id = v_page_id AND state = 'published';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'discard_page_draft: % has never been published, nothing to revert to', p_slug;
  END IF;

  UPDATE public.page_versions
     SET document = v_doc, updated_by = auth.uid()
   WHERE page_id = v_page_id AND state = 'draft';
END;
$$;

REVOKE ALL ON FUNCTION public.publish_page(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.discard_page_draft(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.publish_page(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.discard_page_draft(TEXT) TO authenticated, service_role;
