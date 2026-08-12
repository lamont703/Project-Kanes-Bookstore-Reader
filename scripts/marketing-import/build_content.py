"""Produce the repo-ready marketing content bundle from the fetched GHL pages.

Emits, per page, an ordered list of blocks (heading / text / image) so the page
can be rebuilt faithfully rather than reassembled from a bag of strings. Site
chrome that repeats across every page (nav, footer, hours) is stripped — that
becomes the Next layout, not page content.
"""

import json
import os
import re
import shutil
import sys
from collections import Counter
from html.parser import HTMLParser

BASE = sys.argv[1]
REPO = sys.argv[2]
with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "slugs.txt")) as _f:
    SLUGS = [ln.strip() for ln in _f if ln.strip()]

# Text/images appearing on at least this many pages are site chrome, not page
# content — they become the Next layout instead.
CHROME_THRESHOLD = max(3, len(SLUGS) - 2)

# The root page is stored as home.html but lives at "/" on the source site.
SOURCE_BASE = "https://kanesbookstore.com/"

manifest = json.load(open(os.path.join(BASE, "assets-webp-manifest.json")))
local_for = {m["origin"]: m["file"] for m in manifest}

SKIP = {"script", "style", "noscript", "head"}
HEADINGS = {"h1", "h2", "h3", "h4", "h5", "h6"}


def origin_of(url):
    m = re.search(r"/u_(https?://.+)$", url)
    return m.group(1) if m else url


class Blocks(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.skip = 0
        self.blocks = []
        self.tagstack = []
        self.buf = []

    def _flush(self):
        text = re.sub(r"\s+", " ", "".join(self.buf)).strip()
        self.buf = []
        if not text:
            return
        tag = next((t for t in reversed(self.tagstack) if t in HEADINGS), None)
        self.blocks.append({"type": "heading", "level": int(tag[1]), "text": text}
                           if tag else {"type": "text", "text": text})

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag in SKIP:
            self.skip += 1
            return
        if self.skip:
            return
        self.tagstack.append(tag)
        if tag in HEADINGS or tag in {"p", "li", "div", "section"}:
            self._flush()
        if tag == "img":
            src = a.get("src") or a.get("data-src") or ""
            if src and not src.startswith("data:") and "stcdn." not in src:
                self._flush()
                self.blocks.append({"type": "image", "origin": origin_of(src),
                                    "alt": a.get("alt", "")})
        for m in re.finditer(r'url\((["\']?)(https?://[^)"\']+)\1\)', a.get("style", "")):
            u = m.group(2)
            if "stcdn." not in u:
                self._flush()
                self.blocks.append({"type": "image", "origin": origin_of(u),
                                    "alt": "", "role": "background"})

    def handle_endtag(self, tag):
        if tag in SKIP:
            self.skip = max(0, self.skip - 1)
            return
        if self.skip:
            return
        self._flush()
        if tag in self.tagstack:
            while self.tagstack and self.tagstack.pop() != tag:
                pass

    def handle_data(self, data):
        if not self.skip:
            self.buf.append(data)


# --- pass 1: parse every page ------------------------------------------------
parsed = {}
for slug in SLUGS:
    p = Blocks()
    p.feed(open(os.path.join(BASE, "ghl", slug + ".html"), encoding="utf-8", errors="ignore").read())
    p._flush()
    parsed[slug] = p.blocks

# --- identify chrome: text appearing on 5+ of the 6 pages --------------------
counts = Counter()
for slug, blocks in parsed.items():
    for t in {b["text"] for b in blocks if b["type"] in ("text", "heading")}:
        counts[t] += 1
chrome_text = {t for t, c in counts.items() if c >= CHROME_THRESHOLD}

img_counts = Counter()
for slug, blocks in parsed.items():
    for o in {b["origin"] for b in blocks if b["type"] == "image"}:
        img_counts[o] += 1
chrome_imgs = {o for o, c in img_counts.items() if c >= CHROME_THRESHOLD}

# --- pass 2: emit cleaned, ordered content -----------------------------------
os.makedirs(os.path.join(REPO, "public", "marketing"), exist_ok=True)
os.makedirs(os.path.join(REPO, "content", "marketing"), exist_ok=True)

used, out_index = set(), {}
for slug in SLUGS:
    kept, seen_img, missing = [], set(), []
    for b in parsed[slug]:
        if b["type"] in ("text", "heading"):
            if b["text"] in chrome_text or len(b["text"]) < 2:
                continue
            if kept and kept[-1].get("text") == b["text"]:
                continue                                  # collapse duplicated nodes
            kept.append(b)
        else:
            if b["origin"] in chrome_imgs or b["origin"] in seen_img:
                continue
            seen_img.add(b["origin"])
            f = local_for.get(b["origin"])
            if not f:
                missing.append(b["origin"])
                continue
            used.add(f)
            kept.append({"type": "image", "src": f"/marketing/{f}",
                         "alt": b.get("alt", ""), **({"role": b["role"]} if "role" in b else {})})

    doc = {
        "slug": slug,
        "source": SOURCE_BASE + ("" if slug == "home" else slug),
        "captured": "2026-08-11",
        "blocks": kept,
        "broken_on_source": missing,
    }
    json.dump(doc, open(os.path.join(REPO, "content", "marketing", slug + ".json"), "w"), indent=2)
    n_txt = sum(1 for b in kept if b["type"] != "image")
    n_img = sum(1 for b in kept if b["type"] == "image")
    out_index[slug] = {"text_blocks": n_txt, "images": n_img, "broken": len(missing)}

# copy only the assets actually referenced by kept content
for f in sorted(used):
    shutil.copy2(os.path.join(BASE, "assets-webp", f),
                 os.path.join(REPO, "public", "marketing", f))

# chrome assets (logo etc.) are shared layout, keep them too
for o in chrome_imgs:
    f = local_for.get(o)
    if f:
        shutil.copy2(os.path.join(BASE, "assets-webp", f),
                     os.path.join(REPO, "public", "marketing", f))
        used.add(f)

print(f"{'page':20s} {'text':>6s} {'imgs':>6s} {'broken':>7s}")
for slug, s in out_index.items():
    print(f"/{slug:19s} {s['text_blocks']:6d} {s['images']:6d} {s['broken']:7d}")
print(f"\nchrome stripped: {len(chrome_text)} repeated text nodes, {len(chrome_imgs)} shared images")
print(f"assets copied to public/marketing/: {len(used)}")
