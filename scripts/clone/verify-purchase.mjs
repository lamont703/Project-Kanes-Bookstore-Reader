import { clients } from './lib.mjs'
const { dst } = clients()
const EMAIL = 'staging.tester@kanesbookstore.test'
const { data: u } = await dst.from('users').select('id').eq('email', EMAIL).maybeSingle()

const { data: orders } = await dst.from('orders').select('*').eq('user_id', u.id)
console.log(`  ORDERS for ${EMAIL}: ${orders?.length ?? 0}`)
for (const o of orders ?? []) {
  console.log(`    status            ${o.status}`)
  console.log(`    fulfillment       ${o.fulfillment_status}`)
  console.log(`    subtotal/total    $${o.subtotal} / $${o.total}`)
  console.log(`    shipping/tax/disc $${o.shipping_amount} / $${o.tax_amount} / $${o.discount_amount}`)
  console.log(`    physical items    ${o.has_physical_items}`)
  console.log(`    stripe PI         ${o.stripe_payment_intent_id ?? 'NONE'}`)
  console.log(`    placed_at         ${o.placed_at}`)
  const { data: items } = await dst.from('order_items').select('*').eq('order_id', o.id)
  console.log(`    items (${items?.length ?? 0}):`)
  for (const it of items ?? []) {
    const { data: bk } = await dst.from('books').select('title').eq('id', it.book_id).maybeSingle()
    console.log(`      ${bk?.title}  fmt=${it.format}  qty=${it.quantity}  unit=$${it.unit_price ?? it.price}`)
  }
}

const { data: lib } = await dst.from('user_library').select('*').eq('user_id', u.id)
console.log(`\n  LIBRARY grants: ${lib?.length ?? 0}`)
for (const l of lib ?? []) {
  const { data: bk } = await dst.from('books').select('title').eq('id', l.book_id).maybeSingle()
  console.log(`    ${bk?.title}  source=${l.source}  acquired=${l.acquired_at}`)
}

const { data: sub } = await dst.from('user_subscriptions').select('*').eq('user_id', u.id).maybeSingle()
console.log(`\n  SUBSCRIPTION  plan=${sub?.plan} status=${sub?.status} stripe_sub=${sub?.stripe_subscription_id ?? 'none'}`)
