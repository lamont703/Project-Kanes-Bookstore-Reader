"""Download the LeadConnector-optimized webp variant of each marketing asset.

The live GHL site serves these, so pulling them is pixel-for-pixel what
visitors already see — at ~90 KB instead of ~2 MB. Falls back to the origin
file when no CDN variant exists.
"""

import hashlib
import json
import os
import re
import sys
import urllib.request

BASE = sys.argv[1]
OUT = os.path.join(BASE, "assets-webp")
os.makedirs(OUT, exist_ok=True)

origins = json.load(open(os.path.join(BASE, "ghl", "origins.json")))
inventory = json.load(open(os.path.join(BASE, "ghl", "inventory.json")))

widest = {}
for slug, d in inventory.items():
    for i in d["images"]:
        m = re.search(r"/r_(\d+)/u_(https?://.+)$", i["src"])
        if m:
            w, o = int(m.group(1)), m.group(2)
            if widest.get(o, (0, None))[0] < w:
                widest[o] = (w, i["src"])


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=45) as r:
        return r.read(), r.headers.get("Content-Type", "")


manifest, by_hash, failed = [], {}, []
for origin_url, pages in sorted(origins.items()):
    candidates = []
    if origin_url in widest:
        candidates.append(widest[origin_url][1])          # optimized webp first
    candidates.append(origin_url)                          # then the raw origin

    data = ctype = source = None
    err = "no candidate"
    for candidate in candidates:
        try:
            data, ctype = fetch(candidate)
            source = candidate
            break
        except Exception as e:
            err = f"{type(e).__name__}: {e}"
    if not data:
        failed.append((origin_url, err))
        continue

    digest = hashlib.sha256(data).hexdigest()
    if digest in by_hash:
        fname = by_hash[digest]
    else:
        stem = os.path.basename(origin_url.split("?")[0])
        stem = re.sub(r"\.[A-Za-z0-9]+$", "", stem)
        stem = re.sub(r"[^A-Za-z0-9._-]", "-", stem)[:48] or "asset"
        ext = {"image/webp": ".webp", "image/png": ".png", "image/jpeg": ".jpg",
               "image/gif": ".gif", "image/svg+xml": ".svg"}.get(ctype.split(";")[0], ".webp")
        fname = f"{digest[:8]}-{stem}{ext}"
        open(os.path.join(OUT, fname), "wb").write(data)
        by_hash[digest] = fname

    manifest.append({"origin": origin_url, "fetched_from": source, "file": fname,
                     "bytes": len(data), "content_type": ctype, "pages": pages})

json.dump(manifest, open(os.path.join(BASE, "assets-webp-manifest.json"), "w"), indent=2)
total = sum(m["bytes"] for m in manifest)
print(f"{len(manifest)} refs -> {len(by_hash)} distinct files, {total/1024/1024:.2f} MB")
if failed:
    print(f"\nunrecoverable ({len(failed)}):")
    for u, e in failed:
        print("  ", u[:95], "|", e[:60])
