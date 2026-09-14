# Phase 0 — the safety net, before any migration touches production

Two things, in this order. Neither changes production; both are what makes the
rest reversible.

Production is `kpafjhkrjipiyfjizyaw`, PostgreSQL **17.6**, on the Pro plan with
**daily physical backups and PITR off**. The newest automatic backup is up to 24
hours old, and restoring it is a whole-project rollback — it would discard every
order and signup since. That is the gap these two steps close.

---

## 1. Put the client on PATH — nothing to install

`which pg_dump` comes up empty, but only because Homebrew's `libpq` is keg-only.
The tools are already here:

```bash
export PATH="/usr/local/opt/libpq/bin:$PATH"
pg_dump --version        # PostgreSQL 18.4
```

Client 18.4 against a 17.6 server is fine — a NEWER client reading an older
server is supported. It is the reverse that fails, which is why the version is
worth checking at all.

Verified reachable on 2026-09-13: a direct `psql` to
`db.kpafjhkrjipiyfjizyaw.supabase.co` returned `postgres | 17.6 | books=1038`.
No pooler or IPv4 add-on needed.

---

## 2. Take the dump

`SUPABASE_PROD_DB_URL` in `.env.local` is the production connection string.

```bash
cd "/Users/lamontevans/Desktop/Kane's Komet Book Reader"
set -a; source .env.local; set +a

STAMP=$(date -u +%Y%m%dT%H%M%SZ)
OUT=~/kanes-prod-backup-$STAMP.dump

pg_dump "$SUPABASE_PROD_DB_URL" \
  --format=custom \
  --no-owner --no-privileges \
  --schema=public --schema=storage \
  --file="$OUT"

ls -lh "$OUT"
```

`--format=custom` is what makes this better than the automatic backup: `pg_restore`
can pull **one table** out of it. A whole-project restore cannot.

`--schema=public --schema=storage` covers the application. It deliberately skips
`auth` — Supabase manages that schema, restoring over it is unsupported, and it
holds credentials that have no business sitting on a laptop.

### Verify it before trusting it

An unverified backup is not a backup.

```bash
pg_restore --list "$OUT" | grep -cE 'TABLE DATA'      # expect ~20+
pg_restore --list "$OUT" | grep -E 'TABLE DATA public (books|orders|users)$'
```

Expect roughly **1038 books, 43 orders, 40 users**.

### Handle it like customer data

This file contains real names, emails, addresses and order history.

- Keep it out of iCloud/Dropbox/Desktop sync.
- Do not commit it — `~` is outside the repo for that reason.
- **Delete it once the promotion is confirmed good.**

### Restoring one table, if it comes to that

```bash
pg_restore --data-only --table=books --dbname="$SUPABASE_PROD_DB_URL" "$OUT"
```

---

## 3. Know the rollback script exists

`scripts/rollback-promotion.sql` undoes all fourteen migrations in one
transaction. It is the fastest undo of the three and loses no customer data —
prefer it over the dump if a migration fails.

```bash
psql "$SUPABASE_PROD_DB_URL" -v confirm=yes -f scripts/rollback-promotion.sql
```

It refuses to run without `-v confirm=yes`, and pre-flights the one thing that
would otherwise fail halfway: a genre added after migration that no longer exists
in `genre_enum`.

**Every object and policy name in it was verified to resolve** against staging,
where all fourteen migrations are applied — 35 schema objects and 12 policies,
all present.

**What it cannot undo:** Postgres cannot remove an enum value, so `'merch'`,
`'shipped'` and `'employee'` stay in their enums. Harmless — the old code never
produces them.

**What it deletes:** page content, genres, merch categories, app settings, and
merch products. Those exist only in the new schema. That makes it a clean undo in
the first minutes after cutover and a bad idea days later, once someone has
edited a page or added a product. After that, fix forward.

---

## Order on the day

```
1. export PATH for libpq      ── nothing to install
2. pg_dump + verify           ── read-only
3. migrations (Phase 1)       ── first irreversible step
   └── if it fails: rollback-promotion.sql
4. functions, config, content ── Phases 2-4
5. merge staging → main       ── Phase 5
   └── if it fails: Vercel instant rollback (code only, no DB change)
6. verify                     ── Phase 6
7. delete the dump
```

Vercel's instant rollback covers the code. The dump and the rollback script cover
the database. Nothing covers both at once, which is why schema goes first and the
gap between steps 3 and 5 should be short.
