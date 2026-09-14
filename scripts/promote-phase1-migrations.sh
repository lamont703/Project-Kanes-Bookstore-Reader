#!/usr/bin/env bash
#
# Phase 1 — apply the fourteen promotion migrations to a target database.
#
# Deliberately NOT `supabase db push`. Two reasons:
#
#   1. The CLI in this repo is linked to production (supabase/.temp/project-ref),
#      so its commands are one forgotten flag away from the wrong database. This
#      takes the target as an explicit argument and prints it before doing
#      anything.
#   2. `db push` applies the whole set as one unit. Migration 20260826000001 uses
#      the 'employee' enum value that 20260826000000 adds, and Postgres will not
#      let a new enum value be used in the transaction that created it. Running
#      each file in its own transaction makes that ordering safe by construction.
#
# Resumable: it skips anything already recorded in the ledger, so if a migration
# fails you can fix it and re-run without redoing the earlier ones.
#
# Usage:
#   export PATH="/usr/local/opt/libpq/bin:$PATH"
#   set -a; source .env.local; set +a
#   ./scripts/promote-phase1-migrations.sh "$SUPABASE_PROD_DB_URL" --confirm
#
# Without --confirm it reports what it WOULD do and changes nothing.

set -euo pipefail

DB_URL="${1:-}"
CONFIRM="${2:-}"

if [[ -z "$DB_URL" ]]; then
  echo "usage: $0 <database-url> [--confirm]" >&2
  exit 64
fi

command -v psql >/dev/null || {
  echo "psql not found. Run: export PATH=\"/usr/local/opt/libpq/bin:\$PATH\"" >&2
  exit 69
}

MIGRATIONS=(
  20260811000000_add_merch_format_value
  20260811000001_extend_books_to_catalog
  20260818000000_add_variant_stock_quantity
  20260818000001_add_order_shipping_tracking
  20260823000000_add_editable_page_content
  20260823000001_add_page_images_bucket
  20260825000000_add_book_genres_table
  20260826000000_add_employee_role
  20260826000001_employee_role_policies
  20260827000000_add_merch_categories_table
  20260913000000_add_books_display_order
  20260913000001_add_dealer_discount_settings
  20260914000000_display_order_covers_book_club
  20260914000001_book_sales_totals
)

HOST=$(printf '%s' "$DB_URL" | sed -E 's#.*@([^:/]+).*#\1#')
echo "target host : $HOST"
echo "migrations  : ${#MIGRATIONS[@]}"

psql "$DB_URL" -Atq -c "select 'server      : ' || current_setting('server_version')"
psql "$DB_URL" -Atq -c "select 'books       : ' || count(*) from public.books"
echo "ledger max  : $(psql "$DB_URL" -Atq -c "select coalesce(max(version),'(none)') from supabase_migrations.schema_migrations")"
echo

APPLIED=0
SKIPPED=0

for m in "${MIGRATIONS[@]}"; do
  version="${m%%_*}"
  file="supabase/migrations/${m}.sql"

  [[ -f "$file" ]] || { echo "MISSING FILE: $file" >&2; exit 66; }

  already=$(psql "$DB_URL" -Atq -c \
    "select count(*) from supabase_migrations.schema_migrations where version = '${version}'")

  if [[ "$already" != "0" ]]; then
    printf '  skip   %s (already in ledger)\n' "$version"
    SKIPPED=$((SKIPPED + 1))
    continue
  fi

  if [[ "$CONFIRM" != "--confirm" ]]; then
    printf '  would  %s  %s\n' "$version" "$m"
    continue
  fi

  printf '  apply  %s  %s ... ' "$version" "$m"

  # --single-transaction: the file lands whole or not at all. Safe for the enum
  # migrations too — since PG12 a new value may be ADDED inside a transaction,
  # it just cannot be USED there, and the file that uses it is a separate run.
  psql "$DB_URL" --single-transaction --set ON_ERROR_STOP=1 -q -f "$file"

  psql "$DB_URL" -Atq -c \
    "insert into supabase_migrations.schema_migrations (version, name)
     values ('${version}', '${m#*_}') on conflict (version) do nothing" >/dev/null

  echo "ok"
  APPLIED=$((APPLIED + 1))
done

echo
if [[ "$CONFIRM" != "--confirm" ]]; then
  echo "DRY RUN — nothing changed. Re-run with --confirm to apply."
  exit 0
fi

echo "applied: $APPLIED   skipped: $SKIPPED"
echo
echo "verifying the schema is actually there:"
psql "$DB_URL" -q <<'SQL'
\pset border 2
select
  (select count(*) from information_schema.tables
     where table_schema='public'
       and table_name in ('pages','page_versions','book_genres','merch_categories','app_settings')) as new_tables_of_5,
  (select count(*) from information_schema.columns
     where table_schema='public' and table_name='books'
       and column_name in ('product_type','merch_category','display_order'))                        as book_cols_of_3,
  (select count(*) from pg_proc where pronamespace='public'::regnamespace
       and proname in ('is_catalog_editor','decrement_variant_stock','book_sales_totals',
                       'publish_page','discard_page_draft'))                                        as functions_of_5,
  (select count(*) from unnest(enum_range(null::user_role_enum)) x where x::text='employee')        as employee_role,
  (select count(*) from storage.buckets where id='page-images')                                     as page_images_bucket,
  (select count(*) from public.books)                                                               as books_still_here;
SQL

echo
echo "If any count above is short, STOP and read the failure before continuing."
echo "Rollback if needed:  psql \"\$SUPABASE_PROD_DB_URL\" -v confirm=yes -f scripts/rollback-promotion.sql"
