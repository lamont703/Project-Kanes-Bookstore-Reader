#!/usr/bin/env python3
"""
Seed the editable page content tables from content/marketing/*.json.

Usage:
    set -a; source .env.local; set +a
    SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_STAGING_URL" \
    SUPABASE_KEY="$SUPABASE_STAGING_SERVICE_ROLE_KEY" \
    python3 scripts/seed-page-content.py [--dry-run]

The JSON files stay in the repo as the import record. This is a one-way seed:
once a page is in the database, the database is the source of truth and running
this again would overwrite whatever the admin has edited. It therefore refuses
to touch a page that already exists unless --force is given.

The homepage is the interesting case. Its renderer located galleries by document
position -- blocks 10..26 were "the books", 26..30 "more funk", 30..54 "the
characters" -- and every heading, eyebrow and button around them was hardcoded in
JSX, so none of it was editable. Here that becomes named sections holding both
their images and their own chrome, which is what makes reordering safe and the
surrounding copy editable at all.
"""
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
CONTENT = REPO / "content" / "marketing"
URL = os.environ["SUPABASE_URL"].rstrip("/")
KEY = os.environ["SUPABASE_KEY"]
DRY = "--dry-run" in sys.argv
FORCE = "--force" in sys.argv

HEADERS = {
    "apikey": KEY,
    "Authorization": f"Bearer {KEY}",
    "Content-Type": "application/json",
}

# Slug -> admin-facing page title.
PAGES = {
    "home": "Home",
    "about": "About",
    "characters": "Characters",
    "komet-book-club": "Komet Book Club",
    "kometbooks": "Komet Books",
    "privacy-policy": "Privacy Policy",
    "contact": "Contact",
    "morefunk": "More Funk",
}

BOOK_CLUB_HREF = "/book-club"


def api(method, path, body=None, extra=None):
    headers = dict(HEADERS)
    if extra:
        headers.update(extra)
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(f"{URL}{path}", data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            payload = r.read().decode()
            return r.status, (json.loads(payload) if payload.strip().startswith(("[", "{")) else payload)
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()


def load(slug):
    return json.loads((CONTENT / f"{slug}.json").read_text())


def blocks_from(raw, prefix, start=0, end=None):
    """Convert imported blocks into identified page blocks."""
    out = []
    for i, b in enumerate(raw[start : end if end is not None else len(raw)]):
        bid = f"{prefix}-b{start + i}"
        if b["type"] == "heading":
            out.append({"id": bid, "type": "heading", "level": b.get("level", 2), "text": b["text"]})
        elif b["type"] == "text":
            out.append({"id": bid, "type": "text", "text": b["text"]})
        elif b["type"] == "image":
            block = {"id": bid, "type": "image", "src": b["src"], "alt": b.get("alt", "")}
            if b.get("role"):
                block["role"] = b["role"]
            out.append(block)
    return out


def section(sid, kind, name, settings, blocks):
    return {"id": sid, "kind": kind, "name": name, "settings": settings, "blocks": blocks}


def build_home():
    """
    The homepage, with its hardcoded chrome lifted into editable settings.

    Index ranges are read once, here, to slice the imported document -- and are
    then gone. What lands in the database is five identified sections; nothing
    downstream ever refers to a block position again.
    """
    raw = load("home")["blocks"]

    about_blurb = next(
        (b for b in raw if b["type"] == "heading" and b["text"].startswith("Kane's Bookstore:")),
        None,
    )

    return {
        "version": 1,
        "sections": [
            section(
                "home-hero", "hero", "Hero",
                {
                    "eyebrow": "Welcome 2 the",
                    "headingPrimary": "FUNKIEST BOOKSTORE",
                    "headingSecondary": "IN THE UNIVERSE!",
                    "body": "Creative literature and art through Komet books and merch.",
                    "ctaLabel": "Join Our Komet Book Club",
                    "ctaHref": BOOK_CLUB_HREF,
                    "image": "/marketing/kanes-hero-bg.webp",
                    "imagePortrait": "/marketing/kanes-hero-bg-portrait.webp",
                },
                [],
            ),
            section(
                "home-video", "video", "Video & intro",
                {
                    "videoSrc": "/marketing/video/kanes-hero.mp4",
                    "poster": "/marketing/b9ed83bb-661ea792d03e91ccb4968534.webp",
                    "caption": "Press play for a look inside Kane's Komet Bookstore.",
                    "eyebrow": "More About Us",
                    "heading": about_blurb["text"] if about_blurb else "",
                    "ctaLabel": "Join Our Komet Book Club",
                    "ctaHref": BOOK_CLUB_HREF,
                },
                [],
            ),
            section(
                "home-books", "gallery", "Our Books",
                {
                    "eyebrow": "Our Books",
                    "heading": "Learn About Our Kometz",
                    "ctaLabel": "View All Of Our Kometz",
                    "ctaHref": "/browse",
                    "aspect": "cover",
                },
                blocks_from(raw, "home-books", 10, 26),
            ),
            section(
                "home-funk", "feature", "More Funk",
                {
                    "eyebrow": "More Funk",
                    "heading": "Buy More Products",
                    "ctaLabel": "More Funk for Purchase",
                    "ctaHref": "/morefunk",
                },
                blocks_from(raw, "home-funk", 26, 30),
            ),
            section(
                "home-characters", "gallery", "Our Characters",
                {
                    "eyebrow": "Our Characters",
                    "heading": "Learn About Our Characters",
                    "ctaLabel": "Meet All Of Our Komet Characters!",
                    "ctaHref": "/characters",
                    "aspect": "square",
                },
                blocks_from(raw, "home-characters", 30, 54),
            ),
            section(
                "home-closing", "closing", "Have A Kane Day",
                {
                    "headingPrimary": "HAVE A",
                    "headingSecondary": "KANE DAY",
                    "body": "Members get a membership tee, a book bundle, a surprise gift, and an "
                            "automatic Kane Dealer code for 35% off at checkout.",
                    "image": "/marketing/ec93931a-6621b6c18381f2b6f9098b2d.webp",
                    "imageAlt": "A reader with a Komet book",
                    "ctaLabel": "Join Our Komet Book Club",
                    "ctaHref": BOOK_CLUB_HREF,
                },
                [],
            ),
        ],
    }


def build_generic(slug):
    """
    Every other page is a linear run of blocks, which is what its renderer
    already expects, so it becomes a single body section. Blocks keep their ids,
    so they can be reordered and edited individually.
    """
    raw = load(slug)["blocks"]
    return {
        "version": 1,
        "sections": [
            section(f"{slug}-body", "body", "Page content", {}, blocks_from(raw, slug)),
        ],
    }


def main():
    status, existing = api("GET", "/rest/v1/pages?select=slug,id")
    if status != 200:
        sys.exit(f"could not read pages: {status} {existing}")
    have = {row["slug"]: row["id"] for row in existing}

    for slug, title in PAGES.items():
        doc = build_home() if slug == "home" else build_generic(slug)
        n_blocks = sum(len(s["blocks"]) for s in doc["sections"])
        label = f"{slug:16} {len(doc['sections'])} section(s), {n_blocks:3} block(s)"

        if slug in have and not FORCE:
            print(f"  skip (already seeded): {label}")
            continue
        if DRY:
            print(f"  would seed: {label}")
            continue

        page_id = have.get(slug)
        if page_id is None:
            status, data = api("POST", "/rest/v1/pages", {"slug": slug, "title": title},
                               {"Prefer": "return=representation"})
            if status not in (200, 201):
                print(f"  !! page insert failed for {slug}: {status} {data}")
                continue
            page_id = data[0]["id"]

        # Both rows get the same document: a freshly seeded page has nothing
        # unpublished, so draft and published start identical.
        for state in ("draft", "published"):
            row = {"page_id": page_id, "state": state, "document": doc}
            if state == "published":
                row["published_at"] = "now()"
            status, data = api(
                "POST", "/rest/v1/page_versions", row,
                {"Prefer": "resolution=merge-duplicates,return=minimal",
                 "on-conflict": "page_id,state"},
            )
            if status not in (200, 201, 204):
                print(f"  !! {state} version failed for {slug}: {status} {data}")
                break
        else:
            print(f"  seeded: {label}")


if __name__ == "__main__":
    main()
