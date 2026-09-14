import { clients } from './lib.mjs'
const { dst } = clients()

// Most recent orders, whoever placed them — the book club purchase may have
// been made as a different user than the ebook test.
const { data: all } = await dst.from('orders').select('*')
const recent = [...(all ?? [])].sort((a, b) => String(b.placed_at).localeCompare(String(a.placed_at))).slice(0, 3)
console.log(`  orders total: ${all?.length}`)
console.log('  3 most recent:')
for (const o of recent) {
    const { data: usr } = await dst.from('users').select('email').eq('id', o.user_id).maybeSingle()
    console.log(`    ${o.placed_at}  ${usr?.email}  $${o.total}  status=${o.status}  pi=${o.stripe_payment_intent_id ?? 'none'}`)
    const { data: items } = await dst.from('order_items').select('*').eq('order_id', o.id)
    for (const it of items ?? []) {
        const { data: bk } = await dst.from('books').select('title').eq('id', it.book_id).maybeSingle()
        console.log(`        ${bk?.title}  fmt=${it.format} qty=${it.quantity} unit=$${it.unit_price ?? it.price}`)
    }
}

console.log('\n  PREMIUM subscriptions (the book club path):')
const { data: subs } = await dst.from('user_subscriptions').select('*').eq('plan', 'premium')
if (!subs?.length) console.log('    none found')
for (const s of subs ?? []) {
    const { data: usr } = await dst.from('users').select('email').eq('id', s.user_id).maybeSingle()
    console.log(`    ${usr?.email}`)
    console.log(`      status               ${s.status}`)
    // A NULL stripe_subscription_id is the tell that the recurring subscription
    // failed — most likely STRIPE_PREMIUM_RECURRING_PRICE_ID being a prod_ id.
    console.log(`      stripe_subscription  ${s.stripe_subscription_id ?? 'NULL  <-- recurring subscription NOT created'}`)
    console.log(`      initial_fee_paid     $${s.initial_fee_paid ?? '-'}`)
    console.log(`      monthly_rate         $${s.monthly_rate ?? '-'}`)
    console.log(`      selected_book_ids    ${Array.isArray(s.selected_book_ids) ? s.selected_book_ids.length + ' books' : (s.selected_book_ids ?? 'none')}`)
    console.log(`      started_at           ${s.started_at ?? '-'}`)
    const { data: lib } = await dst.from('user_library').select('book_id,source,acquired_at').eq('user_id', s.user_id)
    console.log(`      library grants       ${lib?.length ?? 0}`)
    for (const l of lib ?? []) {
        const { data: bk } = await dst.from('books').select('title').eq('id', l.book_id).maybeSingle()
        console.log(`        ${bk?.title}  (${l.source})`)
    }
}
