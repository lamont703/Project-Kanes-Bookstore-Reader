# Marketing content import (GoHighLevel → Next)

One-off pipeline that pulled the six marketing pages from the GoHighLevel site
at `kanesbookstore.com` into this repo, ahead of the apex moving to Vercel.

Captured 2026-08-11. Output lives in:

- `content/marketing/<slug>.json` — ordered content blocks per page
- `public/marketing/` — the images those blocks reference

## Pages captured

`privacy-policy`, `about`, `contact`, `characters`, `komet-book-club`, `kometbooks`

## How it works

The GHL pages are Nuxt-rendered funnel pages: large HTML, thin server-rendered
text, images behind the LeadConnector CDN.

1. **`extract.py`** — parses the saved HTML, inventories visible text, images
   (including CSS `url(...)` backgrounds), and outbound links.
2. **`download.py`** — resolves each image to its *origin* URL, then downloads
   the LeadConnector-optimized webp variant the live site actually serves.
   This matters: origins are 1–3 MB PNGs (115 MB total), the webp variants are
   ~90 KB (5.5 MB total) for the same pixels. `next.config.mjs` sets
   `images.unoptimized`, so Next will not shrink these itself — importing the
   origins would have shipped 115 MB of unoptimized PNG.
3. **`build_content.py`** — re-parses into ordered `heading` / `text` / `image`
   blocks so pages can be rebuilt faithfully, strips site chrome (any text or
   image appearing on 5+ of the 6 pages — that becomes the Next layout, not
   page content), and copies the referenced assets into `public/marketing/`.

## Re-running

```bash
mkdir -p /tmp/ghl-import/ghl
for p in privacy-policy about contact characters komet-book-club kometbooks; do
  curl -sSL "https://kanesbookstore.com/$p" -o "/tmp/ghl-import/ghl/$p.html"
done
python3 extract.py        /tmp/ghl-import/ghl
python3 download.py       /tmp/ghl-import
python3 build_content.py  /tmp/ghl-import "$(git rev-parse --show-toplevel)"
```

## Known gaps

- **7 images 404 on the source site.** Six on `/privacy-policy`, one on
  `/characters`. Verified against the live page's own CDN URLs — these are
  already broken for visitors today, not an import failure. Listed per page
  under `broken_on_source` in the JSON.
- **`/contact` yields only its heading.** The page is a GoHighLevel lead-capture
  form rendered client-side. There is nothing to scrape — the form has to be
  rebuilt and wired to the CRM (see `supabase/functions/ghl-sync`), and that is
  a real decision, not a copy job.
- **Two nav items were not in scope**: the source nav also lists "Komet Book
  Library" and "More Funk". Neither was requested; neither was captured.
