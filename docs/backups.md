# Backups, and how to actually restore from them

## Why this exists

Supabase's own daily backups are **physical** (WAL-G). Three consequences:

1. They restore **whole-project, in place**, and only Supabase can do it.
2. They do **not** include Storage objects — covers, page images, PDFs.
3. Getting one row back means a support ticket and a separate project.

On 2026-09-15 two books were deleted by a bug. Recovering them needed exactly
the thing none of that provides: give me back these two rows, now. Hence this.

PITR would solve it too, at $100/month. This costs nothing and gives finer
granularity; what it gives up is recency — up to 24 hours, versus seconds.

## Where the copies live, and what that does not cover

The destination is the private **`kanes-backups`** bucket in the production
project. A deliberate trade: no second vendor, no card, no new account, and it
fully covers the failure that actually happened — our own code deleting rows
and files, which never touches that bucket.

It does **not** survive losing the project: deletion, suspension, a billing
lapse. For that the copy has to leave Supabase. See "Adding an off-site mirror"
at the end.

Staging is not an alternative, despite appearances. It is a **non-persistent
branch** of production (`oplyizxbzmwdodctsnxv`, parent `kpafjhkrjipiyfjizyaw`),
so it shares the blast radius and Supabase may tear it down.

## What runs

`.github/workflows/backup-production.yml`, nightly at 07:40 UTC, and on demand
via **Actions → Backup production → Run workflow**. Run it by hand before
anything risky — a bulk import, a migration, a mass edit.

Six buckets are mirrored — `book-covers`, `book-pages`, `book-pdfs`,
`book-illustrations`, `book-docs`, `page-images` — which is all of them as of
2026-09-15 (~2.0 GB, 6,060 objects). Add new buckets to the workflow's loop.

| what | where | retention |
|---|---|---|
| `pg_dump` of `public` + `storage` schemas | `kanes-backups/database/db-YYYY-MM-DD.dump` | 30 days, plus the 1st of each month for a year |
| every Storage bucket, mirrored | `kanes-backups/storage/<bucket>/` | current state |
| files deleted from Storage | `kanes-backups/storage-deleted/<bucket>/<date>/` | 90 days |

That third row is the one that would have saved the two book covers: `rclone
sync` is told to MOVE vanished files aside rather than drop them, so deleting a
file in Supabase does not delete the copy here.

The job refuses to upload a dump it cannot read back — it runs `pg_restore
--list` and fails unless `books` and `orders` are present with 15+ tables.

## One-time setup

Create these as **repository secrets** (Settings → Secrets and variables →
Actions). Nothing here belongs in the repo.

| secret | where to get it |
|---|---|
| `SUPABASE_PROD_DB_URL` | **The pooler URI, not the direct one** — see below. Not the same value as `.env.local`. |
| `SUPABASE_PROD_PROJECT_REF` | `kpafjhkrjipiyfjizyaw` |
| `SUPABASE_PROD_REGION` | `us-east-1` |
| `SUPABASE_S3_ACCESS_KEY_ID` | Supabase → Storage → S3 Access Keys → New access key |
| `SUPABASE_S3_SECRET_ACCESS_KEY` | shown once, at the same moment |

Five secrets, one key pair to create, no other vendor.

### The database URL has to be the pooler

`db.<ref>.supabase.co` has **no A record** — Supabase serves direct connections
over IPv6 only, and GitHub Actions runners have no IPv6. A direct URL fails with:

```
pg_dump: error: connection to server at "db.….supabase.co"
  (2600:1f18:…), port 5432 failed: Network unreachable
```

Use the pooler, which resolves on IPv4:

```
postgresql://postgres.kpafjhkrjipiyfjizyaw:<password>@aws-1-us-east-1.pooler.supabase.com:5432/postgres
```

Three things that are easy to get wrong:

- The user is `postgres.<project-ref>`, not `postgres`.
- The host is `aws-1-…` for this project. `aws-0-…` also resolves, but answers
  `FATAL: (ENOTFOUND) tenant/user … not found` — projects are assigned to a
  specific pooler.
- Port **5432** (session mode). Port 6543 is transaction mode and will not
  support `pg_dump`.

`.env.local` keeps the direct URL, which is correct — it works from a laptop on
an IPv6-capable network and is one hop shorter.

The `kanes-backups` bucket already exists and is **private**. Keep it that way —
the dump contains real customer names, emails, addresses and order history, and
a public bucket would put all of it one guessed URL away.

## Restore: one row (the case that bit us)

Never restore a dump straight over production. Load it somewhere disposable,
take the rows you want, insert those.

```bash
# 1. Fetch the dump from the night before the damage.
rclone copy supabase:kanes-backups/database/db-2026-09-15.dump .

# 2. Stand up a throwaway Postgres and load it.
docker run -d --name scratch -e POSTGRES_PASSWORD=x -p 5433:5432 postgres:17-alpine
sleep 5
pg_restore -d "postgresql://postgres:x@localhost:5433/postgres" \
  --no-owner --no-privileges db-2026-09-15.dump

# 3. Find what you lost.
psql "postgresql://postgres:x@localhost:5433/postgres" \
  -c "select id, title from books where title ilike '%murder house%'"

# 4. Copy just those rows into production. \copy streams through the client,
#    so the two databases never need to see each other.
psql "postgresql://postgres:x@localhost:5433/postgres" \
  -c "\copy (select * from books where id in ('…','…')) to 'rows.csv' csv"
psql "$SUPABASE_PROD_DB_URL" -c "\copy books from 'rows.csv' csv"

# 5. Their variants too, or the book has no price and will not sell.
psql "postgresql://postgres:x@localhost:5433/postgres" \
  -c "\copy (select * from book_variants where book_id in ('…','…')) to 'v.csv' csv"
psql "$SUPABASE_PROD_DB_URL" -c "\copy book_variants from 'v.csv' csv"

docker rm -f scratch
```

## Restore: Storage files

```bash
# A whole bucket back to how it was:
rclone copy supabase:kanes-backups/storage/book-covers supabase:book-covers -v

# One book's files:
rclone copy supabase:kanes-backups/storage/book-covers/<book-id> \
            supabase:book-covers/<book-id> -v

# Something deleted in the last 90 days:
rclone copy supabase:kanes-backups/storage-deleted/book-covers/2026-09-15/<book-id> \
            supabase:book-covers/<book-id> -v
```

`copy`, never `sync`, in that direction — `sync` would delete anything in
Supabase that is not in the backup.

## What this does NOT cover

- **The `auth` schema.** Deliberately: Supabase manages it, restoring over it is
  unsupported, and it holds credentials that should not sit in a bucket. User
  accounts are Supabase's to protect.
- **Up to 24 hours.** Anything since last night's run is gone. Run the workflow
  by hand before risky work.
- **Edge Function code and project config** — those live in git and in the
  Supabase dashboard respectively.

## The first line of defence is not this

Books cannot be hard-deleted at all any more: `trg_books_block_hard_delete`
(migration `20260915000000`) refuses, and the admin retires with `deleted_at`
instead. Restoring from a backup should be the second thing you reach for, not
the first — check whether the row is simply retired:

```sql
select id, title, deleted_at from public.books where deleted_at is not null;
update public.books set deleted_at = null where id = '…';   -- undo
```

## Adding an off-site mirror, later

Everything above lives inside the production project, so it cannot survive
losing that project. When that matters, the change is small: add a second
rclone remote and one more sync step. Two options that fit 2 GB:

- **Cloudflare R2** — 10 GB free, no egress charge, but wants a card on file
  even for the free tier.
- **Google Drive** — 15 GB free, no card. Wrap it in `rclone crypt` so the
  customer PII is encrypted before it leaves.

```bash
rclone sync supabase:kanes-backups offsite:kanes-backups --fast-list -v
```

Until then, be clear-eyed: this is protection against our own mistakes, which
is the thing that has actually gone wrong, and not against losing Supabase.
