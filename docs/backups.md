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

## What runs

`.github/workflows/backup-production.yml`, nightly at 07:40 UTC, and on demand
via **Actions → Backup production → Run workflow**. Run it by hand before
anything risky — a bulk import, a migration, a mass edit.

Six buckets are mirrored — `book-covers`, `book-pages`, `book-pdfs`,
`book-illustrations`, `book-docs`, `page-images` — which is all of them as of
2026-09-15 (~2.0 GB, 6,060 objects). Add new buckets to the workflow's loop.

| what | where | retention |
|---|---|---|
| `pg_dump` of `public` + `storage` schemas | `r2:kanes-backups/database/db-YYYY-MM-DD.dump` | 30 days, plus the 1st of each month for a year |
| every Storage bucket, mirrored | `r2:kanes-backups/storage/<bucket>/` | current state |
| files deleted from Storage | `r2:kanes-backups/storage-deleted/<bucket>/<date>/` | 90 days |

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
| `SUPABASE_PROD_DB_URL` | Supabase → Project Settings → Database → Connection string (URI). Same value as `.env.local`. |
| `SUPABASE_PROD_PROJECT_REF` | `kpafjhkrjipiyfjizyaw` |
| `SUPABASE_PROD_REGION` | `us-east-1` (confirmed for this project) |
| `SUPABASE_S3_ACCESS_KEY_ID` / `SUPABASE_S3_SECRET_ACCESS_KEY` | Supabase → Storage → S3 Access Keys → New access key |
| `R2_ACCOUNT_ID` | Cloudflare dashboard → R2 → account id in the endpoint URL |
| `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | Cloudflare → R2 → Manage API Tokens → Create (Object Read & Write) |

Then create an R2 bucket named **`kanes-backups`**. Leave it private — the dump
contains real customer names, emails, addresses and order history. R2 encrypts
at rest and charges nothing for egress, so pulling a backup down is free.

## Restore: one row (the case that bit us)

Never restore a dump straight over production. Load it somewhere disposable,
take the rows you want, insert those.

```bash
# 1. Fetch the dump from the night before the damage.
rclone copy r2:kanes-backups/database/db-2026-09-15.dump .

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
rclone copy r2:kanes-backups/storage/book-covers supabase:book-covers -v

# One book's files:
rclone copy r2:kanes-backups/storage/book-covers/<book-id> \
            supabase:book-covers/<book-id> -v

# Something deleted in the last 90 days:
rclone copy r2:kanes-backups/storage-deleted/book-covers/2026-09-15/<book-id> \
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
