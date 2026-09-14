#!/usr/bin/env python3
"""
Usage:
    set -a; source .env.local; set +a
    SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_STAGING_URL" \
    SUPABASE_KEY="$SUPABASE_STAGING_SERVICE_ROLE_KEY" \
    python3 scripts/import-morefunk-merch.py

Point SUPABASE_URL/SUPABASE_KEY at whichever project should receive the
products. The target must already have migration 20260811000001
(product_type/merch_category) applied, or every insert will fail.

Import the More Funk merchandise from the old GoHighLevel site into staging.

Titles, prices and descriptions were read from each product's own page on
kanesbookstore.com (the candles carry real copy; the foam soaps genuinely have
none on the source, so their description is left empty rather than invented).
Images come from the assets already downloaded into public/marketing during the
original content import, so nothing is hotlinked.

Idempotent: a product whose title already exists is skipped, so re-running does
not create duplicates.
"""
import json
import os
import sys
import urllib.request
import urllib.error
from pathlib import Path

REPO = Path("/Users/lamontevans/Desktop/Kane's Komet Book Reader")
URL = os.environ["SUPABASE_URL"].rstrip("/")
KEY = os.environ["SUPABASE_KEY"]

HEADERS = {
    "apikey": KEY,
    "Authorization": f"Bearer {KEY}",
    "Content-Type": "application/json",
}

PRODUCTS = [
    # --- Candles, $22.99 -----------------------------------------------------
    {
        "title": "Soldier Jennings’ Favorite Scent",
        "category": "candle",
        "price": 22.99,
        "image": "ff85e1c1-69815e131311f6dfa9d9c947.webp",
        "description": "Dive deep into relaxation with Soldier Jennings’ favorite scent, the candle that brings ocean vibes to your space. Featuring a chill mix of bergamot, lavender, and sparkling mandarin, this scent will have you feeling like you're floating in a sea of calm. Perfect for unwinding and finding your zen.",
    },
    {
        "title": "Paula Lewis’ Favorite Scent",
        "category": "candle",
        "price": 22.99,
        "image": "0279899f-69815e131f68d1b531352af9.webp",
        "description": "Meet your new BFF, Paula Lewis’ favorite scent, the ultimate chill pill in candle form. This scent blends dreamy lavender blooms with creamy vanilla for a cozy hug in a jar. Light it up when you need to unwind and vibe out with some serious relaxation.",
    },
    {
        "title": "Brian Streeter’s Favorite Scent",
        "category": "candle",
        "price": 22.99,
        "image": "c741ea06-69815e131fd827d69fd47915.webp",
        "description": "Get the party started with Brian Streeter’s favorite scent, where every moment feels like a celebration! This candle pops with the fizzy blend of bubbly champagne, sparkling berries, and juicy tangerine. It's the ultimate vibe setter for when you're ready to live it up and let loose.",
    },
    {
        "title": "Saab’s Favorite Scent",
        "category": "candle",
        "price": 22.99,
        "image": "42978165-69815e13f7a877b40363362d.webp",
        "description": "Elevate your space with Saab’s favorite scent, the aroma that oozes style and swagger. This candle hits you with a bold mix of mahogany, oak, and frosted lavender, topped off with a touch of geranium. It's the perfect pick for when you want to add a little sophistication and warmth to your scene.",
    },
    # --- Foam soaps, $9.00 ---------------------------------------------------
    # No description exists on the source site for any of these.
    {
        "title": "Joshua Jennings Fav Foam Soap",
        "category": "soap",
        "price": 9.00,
        "image": "fa56dd1c-69815e13f7a877c38b63362e.webp",
        "description": None,
    },
    {
        "title": "Ackerman's Fav Foam Soap",
        "category": "soap",
        "price": 9.00,
        "image": "f89d0ada-69815e1366e7ca644918535f.webp",
        "description": None,
    },
    {
        "title": "Sasha Jenning's Fav Foam Soap",
        "category": "soap",
        "price": 9.00,
        "image": "db35085d-69815e131f68d17293352afd.webp",
        "description": None,
    },
    {
        "title": "Sandy Cozier's Fav Foam Soap",
        "category": "soap",
        "price": 9.00,
        "image": "e3095dc8-69815e131fd827e089d47916.webp",
        "description": None,
    },
    {
        "title": "Paul Orlando's Fav Foam Soap",
        "category": "soap",
        "price": 9.00,
        "image": "06a5d104-69815e1366e7ca3ed0185363.webp",
        "description": None,
    },
]


def api(method, path, body=None, extra_headers=None, raw=None, content_type=None):
    headers = dict(HEADERS)
    if extra_headers:
        headers.update(extra_headers)
    if raw is not None:
        headers["Content-Type"] = content_type
        data = raw
    else:
        data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(f"{URL}{path}", data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            payload = r.read().decode()
            return r.status, (json.loads(payload) if payload.strip().startswith(("[", "{")) else payload)
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()


def existing_titles():
    status, data = api("GET", "/rest/v1/books?product_type=eq.merch&select=title")
    if status != 200:
        sys.exit(f"could not read existing merch: {status} {data}")
    return {row["title"] for row in data}


def main():
    have = existing_titles()
    print(f"merch already in staging: {len(have)}")
    created = skipped = 0

    for p in PRODUCTS:
        if p["title"] in have:
            print(f"  skip (exists): {p['title']}")
            skipped += 1
            continue

        img_path = REPO / "public" / "marketing" / p["image"]
        if not img_path.exists():
            print(f"  !! MISSING IMAGE for {p['title']}: {p['image']}")
            continue

        # 1. the catalog row
        row = {
            "title": p["title"],
            "description": p["description"],
            "product_type": "merch",
            "merch_category": p["category"],
            "status": "published",
        }
        status, data = api("POST", "/rest/v1/books", row,
                           {"Prefer": "return=representation"})
        if status not in (200, 201):
            print(f"  !! book insert failed for {p['title']}: {status} {data}")
            continue
        book_id = data[0]["id"]

        # 2. cover image into storage, same layout the admin form uses
        blob = img_path.read_bytes()
        key = f"{book_id}/cover.webp"
        status, data = api("POST", f"/storage/v1/object/book-covers/{key}",
                           raw=blob, content_type="image/webp",
                           extra_headers={"x-upsert": "true"})
        if status not in (200, 201):
            print(f"  !! image upload failed for {p['title']}: {status} {data}")
            continue
        public_url = f"{URL}/storage/v1/object/public/book-covers/{key}"

        status, _ = api("PATCH", f"/rest/v1/books?id=eq.{book_id}",
                        {"cover_image_url": public_url})
        if status not in (200, 204):
            print(f"  !! cover url patch failed for {p['title']}: {status}")

        # 3. the purchasable variant. stock_quantity is left null (untracked) —
        #    inventing a unit count would be worse than admitting we don't know.
        variant = {
            "book_id": book_id,
            "format": "merch",
            "price": p["price"],
            "is_in_stock": True,
            "stock_quantity": None,
        }
        status, data = api("POST", "/rest/v1/book_variants", variant)
        if status not in (200, 201, 204):
            print(f"  !! variant insert failed for {p['title']}: {status} {data}")
            continue

        print(f"  created: {p['title']}  (${p['price']}, {p['category']})")
        created += 1

    print(f"\ncreated {created}, skipped {skipped}")


if __name__ == "__main__":
    main()
