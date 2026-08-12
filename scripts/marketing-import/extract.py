"""Inventory the GHL marketing pages: visible text, images, and outbound links."""

import html
import json
import os
import re
import sys
from html.parser import HTMLParser

SKIP = {"script", "style", "noscript", "head"}
BLOCK = {"h1", "h2", "h3", "h4", "h5", "h6", "p", "li", "div", "section", "br", "td"}


class Extract(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.depth_skip = 0
        self.parts = []
        self.images = []
        self.links = []
        self.title = None
        self._in_title = False

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag in SKIP:
            self.depth_skip += 1
        if tag == "title":
            self._in_title = True
        if tag == "img":
            src = a.get("src") or a.get("data-src")
            if src:
                self.images.append((src, a.get("alt", "")))
        if tag == "a" and a.get("href"):
            self.links.append(a["href"])
        # inline background images
        style = a.get("style", "")
        for m in re.finditer(r'url\((["\']?)(.*?)\1\)', style):
            self.images.append((m.group(2), "[background]"))
        if tag in BLOCK:
            self.parts.append("\n")

    def handle_endtag(self, tag):
        if tag in SKIP and self.depth_skip:
            self.depth_skip -= 1
        if tag == "title":
            self._in_title = False
        if tag in BLOCK:
            self.parts.append("\n")

    def handle_data(self, data):
        if self._in_title and not self.title:
            self.title = data.strip()
        if self.depth_skip:
            return
        if data.strip():
            self.parts.append(data)

    def text(self):
        raw = "".join(self.parts)
        lines = [re.sub(r"[ \t]+", " ", ln).strip() for ln in raw.split("\n")]
        return "\n".join(ln for ln in lines if ln)


def run(path, slug):
    raw = open(path, encoding="utf-8", errors="ignore").read()
    p = Extract()
    p.feed(raw)

    # background images declared in <style> blocks too
    css_imgs = re.findall(r'url\((["\']?)(https?://[^)"\']+)\1\)', raw)
    for _, u in css_imgs:
        p.images.append((u, "[css]"))

    imgs = []
    seen = set()
    for src, alt in p.images:
        if src.startswith("data:"):
            continue
        if src in seen:
            continue
        seen.add(src)
        imgs.append({"src": src, "alt": alt})

    deep = sorted({l for l in p.links if "kometz.kanesbookstore.com" in l})
    internal = sorted({l for l in p.links if l.startswith("/") or "kanesbookstore.com" in l and "kometz" not in l})

    return {
        "slug": slug,
        "title": p.title,
        "text": p.text(),
        "images": imgs,
        "deeplinks_to_kometz": deep,
        "internal_links": internal,
    }


def slugs():
    here = os.path.dirname(os.path.abspath(__file__))
    with open(os.path.join(here, "slugs.txt")) as f:
        return [ln.strip() for ln in f if ln.strip()]


if __name__ == "__main__":
    base = sys.argv[1]
    out = {}
    for slug in slugs():
        out[slug] = run(os.path.join(base, slug + ".html"), slug)
    json.dump(out, open(os.path.join(base, "inventory.json"), "w"), indent=2)

    # origins.json: every distinct source asset, mapped to the pages using it.
    # download.py consumes this. Builder-UI assets (stcdn) are not content.
    origins = {}
    for slug, d in out.items():
        for i in d["images"]:
            src = i["src"]
            if "stcdn.leadconnectorhq.com" in src:
                continue
            m = re.search(r"/u_(https?://.+)$", src)
            origins.setdefault(m.group(1) if m else src, set()).add(slug)
    json.dump({u: sorted(p) for u, p in origins.items()},
              open(os.path.join(base, "origins.json"), "w"), indent=2)

    for slug, d in out.items():
        print(f"=== /{slug} — {d['title']!r}")
        print(f"    text: {len(d['text'])} chars | images: {len(d['images'])} | kometz deeplinks: {len(d['deeplinks_to_kometz'])}")
    print(f"\ndistinct origin assets: {len(origins)}")
