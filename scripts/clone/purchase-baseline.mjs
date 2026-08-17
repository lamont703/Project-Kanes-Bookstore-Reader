import { clients } from './lib.mjs'
const { dst } = clients()
const EMAIL = 'staging.tester@kanesbookstore.test'

const { data: u } = await dst.from('users').select('id,email').eq('email', EMAIL).maybeSingle()
console.log(`  test user: ${u?.email}  id=${u?.id}\n`)

// a cheap, in-stock ebook keeps the test simple: no shipping, and it should
// grant library access on fulfilment
const { data: books } = await dst.from('books')
  .select('id,title,author,status,book_variants(id,format,price,is_in_stock)')
  .eq('status','published').eq('product_type','book').limit(60)

const candidates = (books ?? []).flatMap(b =>
  (b.book_variants ?? [])
    .filter(v => v.is_in_stock && v.format === 'ebook' && Number(v.price) > 0.5)
    .map(v => ({ title: b.title, bookId: b.id, variantId: v.id, price: Number(v.price) })))
candidates.sort((a,b) => a.price - b.price)
console.log('  cheapest in-stock EBOOKs (no shipping, grants library access):')
candidates.slice(0,5).forEach(c => console.log(`    $${c.price.toFixed(2).padStart(6)}  ${c.title.slice(0,44).padEnd(46)} book=${c.bookId.slice(0,8)}`))

console.log('\n  BASELINE (before purchase):')
for (const t of ['orders','order_items','user_library','cart_items']) {
  const { count } = await dst.from(t).select('*',{count:'exact',head:true})
  console.log(`    ${t.padEnd(16)} ${count} total`)
}
for (const [t,col] of [['orders','user_id'],['user_library','user_id']]) {
  const { count } = await dst.from(t).select('*',{count:'exact',head:true}).eq(col, u.id)
  console.log(`    ${t.padEnd(16)} ${count} for test user`)
}
const { data: sub } = await dst.from('user_subscriptions').select('plan,status,stripe_subscription_id').eq('user_id', u.id).maybeSingle()
console.log(`    subscription     plan=${sub?.plan} status=${sub?.status} stripe_id=${sub?.stripe_subscription_id ?? 'none'}`)
