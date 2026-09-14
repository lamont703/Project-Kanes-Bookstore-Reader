import { clients } from './lib.mjs'
const { src, dst } = clients()
const PAGE = 500

async function fetchAll(table) {
  const rows = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await src.from(table).select('*').range(from, from + PAGE - 1)
    if (error) throw new Error(`${table}: ${error.message}`)
    rows.push(...data)
    if (data.length < PAGE) break
  }
  return rows
}

async function push(table, rows, { upsert = false, conflict } = {}) {
  for (let i = 0; i < rows.length; i += 200) {
    const chunk = rows.slice(i, i + 200)
    const q = upsert
      ? dst.from(table).upsert(chunk, { onConflict: conflict, defaultToNull: false })
      : dst.from(table).insert(chunk)
    const { error } = await q
    if (error) throw new Error(`${table} @${i}: ${error.code} ${error.message}`)
  }
}

// ---- phase 1: auth users, ids preserved -----------------------------------
console.log('PHASE 1  auth.users')
const { data: au, error: auErr } = await src.auth.admin.listUsers({ page: 1, perPage: 1000 })
if (auErr) throw auErr
let made = 0, failed = 0
for (const u of au.users) {
  const { error } = await dst.auth.admin.createUser({
    id: u.id,
    email: u.email,
    email_confirm: !!u.email_confirmed_at,
    phone: u.phone || undefined,
    user_metadata: u.user_metadata ?? {},
    app_metadata: u.app_metadata ?? {},
  })
  if (error) { failed++; if (failed <= 3) console.log(`   fail ${u.email}: ${error.message}`) }
  else made++
}
console.log(`   created ${made}/${au.users.length}${failed ? `, ${failed} failed` : ''}`)

// ---- phase 2: overwrite what the trigger stubbed ---------------------------
console.log('\nPHASE 2  overwrite trigger-created rows')
for (const [t, conflict] of [['users','id'], ['reading_settings','user_id'], ['user_subscriptions','user_id']]) {
  const rows = await fetchAll(t)
  await push(t, rows, { upsert: true, conflict })
  console.log(`   ${t.padEnd(20)} ${rows.length} upserted`)
}

// ---- phase 3: everything else, in FK order --------------------------------
console.log('\nPHASE 3  remaining tables (FK order)')
const ORDER = [
  'books', 'book_variants', 'book_pages', 'book_illustrations',
  'promo_codes', 'orders', 'order_items', 'user_library', 'cart_items',
  'book_club_selections', 'book_club_events', 'event_rsvps',
  'discussion_topics', 'discussion_posts', 'discussion_votes',
  'reading_progress', 'highlights', 'bookmarks',
]
for (const t of ORDER) {
  const rows = await fetchAll(t)
  if (!rows.length) { console.log(`   ${t.padEnd(22)} 0 (skipped)`); continue }
  try {
    await push(t, rows)
    console.log(`   ${t.padEnd(22)} ${rows.length} copied`)
  } catch (e) {
    console.log(`   ${t.padEnd(22)} FAILED — ${e.message.slice(0, 120)}`)
  }
}
console.log('\ndata phase complete')
