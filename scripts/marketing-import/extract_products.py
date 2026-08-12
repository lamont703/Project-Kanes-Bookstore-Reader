"""Derive a structured product inventory from the /morefunk merchandise page.

/morefunk is a storefront, not a marketing page: each product is an image, one
or two heading nodes (the builder splits long names across lines), a price, and
a "Buy" action. This turns that block stream into records, so the later
store-merge phase has a real inventory to work from rather than a rendered page.

Usage: python3 extract_products.py <repo-root>
"""

import json
import os
import re
import sys

REPO = sys.argv[1]
SRC = os.path.join(REPO, "content", "marketing", "morefunk.json")
OUT = os.path.join(REPO, "content", "marketing", "morefunk-products.json")

blocks = json.load(open(SRC))["blocks"]

PRICE = re.compile(r"^\$\s*([\d,]+(?:\.\d{2})?)$")

products, current = [], None
for b in blocks:
    if b["type"] == "image" and not b.get("role"):
        if current and (current["name_parts"] or current["price"]):
            products.append(current)
        current = {"image": b["src"], "name_parts": [], "price": None, "buyable": False}
        continue
    if current is None:
        continue

    text = b.get("text", "").strip()
    m = PRICE.match(text)
    if m:
        current["price"] = float(m.group(1).replace(",", ""))
    elif text.lower() == "buy":
        current["buyable"] = True
    elif b["type"] == "heading":
        current["name_parts"].append(text)

if current and (current["name_parts"] or current["price"]):
    products.append(current)

cleaned = []
for p in products:
    # the page builder splits long names across sibling headings; rejoin, and
    # normalize the smart quotes it emits around scent names
    name = " ".join(p["name_parts"]).strip()
    name = re.sub(r"\s+", " ", name).replace("“", '"').replace("”", '"').replace("’", "'")
    if not name and not p["price"]:
        continue
    cleaned.append({"name": name, "price": p["price"],
                    "image": p["image"], "buyable": p["buyable"]})

json.dump({"source": "https://kanesbookstore.com/morefunk",
           "captured": "2026-08-11",
           "note": "Non-book merchandise. The current schema models only books "
                   "(book formats ebook/paper_book/komet_card); there is no "
                   "generic product table yet.",
           "products": cleaned},
          open(OUT, "w"), indent=2)

priced = [p for p in cleaned if p["price"] is not None]
print(f"{len(cleaned)} products ({len(priced)} priced, {sum(1 for p in cleaned if p['buyable'])} with Buy)")
if priced:
    prices = sorted({p["price"] for p in priced})
    print(f"price points: {', '.join(f'${x:.2f}' for x in prices)}")
for p in cleaned:
    print(f"  {'$%.2f' % p['price'] if p['price'] else '   —   ':>8}  {p['name'][:64]}")
