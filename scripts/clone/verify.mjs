import { clients } from './lib.mjs'
const { src, dst } = clients()
const TABLES = ['users','books','book_variants','book_pages','book_illustrations','cart_items','orders','order_items','user_library','promo_codes','book_club_selections','book_club_events','event_rsvps','discussion_topics','discussion_posts','discussion_votes','reading_progress','highlights','bookmarks','reading_settings','user_subscriptions']
let mismatch = 0, tp = 0, ts = 0
console.log('  table                    prod  staging')
for (const t of TABLES) {
  const [{ count: p }, { count: s }] = await Promise.all([
    src.from(t).select('*', { count:'exact', head:true }),
    dst.from(t).select('*', { count:'exact', head:true }),
  ])
  tp += p ?? 0; ts += s ?? 0
  const flag = p === s ? '' : '   <-- MISMATCH'
  if (p !== s) mismatch++
  console.log(`  ${t.padEnd(22)} ${String(p).padStart(5)} ${String(s).padStart(8)}${flag}`)
}
console.log(`  ${'TOTAL'.padEnd(22)} ${String(tp).padStart(5)} ${String(ts).padStart(8)}`)
const [{ data: pa }, { data: sa }] = await Promise.all([
  src.auth.admin.listUsers({ page:1, perPage:1000 }), dst.auth.admin.listUsers({ page:1, perPage:1000 }),
])
console.log(`  ${'auth.users'.padEnd(22)} ${String(pa.users.length).padStart(5)} ${String(sa.users.length).padStart(8)}`)
const pids = new Set(pa.users.map(u=>u.id)), sids = new Set(sa.users.map(u=>u.id))
console.log(`  UUIDs preserved: ${[...pids].every(i=>sids.has(i)) ? 'ALL MATCH' : 'MISMATCH'}`)
console.log(`\n  ${mismatch === 0 ? 'row counts identical across all tables' : mismatch + ' table(s) differ'}`)

// referential spot-check
const { data: o } = await dst.from('orders').select('id,user_id').limit(1).maybeSingle()
if (o) {
  const { data: u } = await dst.from('users').select('email').eq('id', o.user_id).maybeSingle()
  console.log(`  FK spot-check: order -> user resolves: ${u ? 'yes' : 'NO — broken'}`)
}
const { data: adm } = await dst.from('users').select('email,role').eq('role','admin')
console.log(`  admin accounts on staging: ${adm?.length ?? 0}`)
