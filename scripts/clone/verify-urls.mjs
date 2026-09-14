import { clients } from './lib.mjs'
const { dst } = clients()
for (const [t,c,label] of [['books','cover_image_url','cover'],['book_pages','page_image_url','page image'],['book_illustrations','image_url','illustration']]) {
  const { data } = await dst.from(t).select(c).not(c,'is',null).limit(3)
  let ok=0,bad=0,sample=''
  for (const row of data ?? []) {
    const r = await fetch(row[c], { method:'HEAD' })
    if (r.ok){ ok++; if(!sample) sample=`${r.headers.get('content-type')}, ${((+r.headers.get('content-length')||0)/1024).toFixed(0)}KB` } else bad++
  }
  console.log(`  ${label.padEnd(14)} ${ok} ok / ${bad} failed   host=${(data?.[0]?.[c]??'').split('/')[2]}   ${sample}`)
}
const { data: b } = await dst.from('books').select('book_file_url').not('book_file_url','is',null).limit(1).maybeSingle()
if (b) {
  const path = b.book_file_url.split('/book-pdfs/')[1]
  const { data: signed, error } = await dst.storage.from('book-pdfs').createSignedUrl(path, 60)
  if (signed) { const r = await fetch(signed.signedUrl,{method:'HEAD'}); console.log(`  pdf (signed)   HTTP ${r.status}   ${r.headers.get('content-type')}`) }
  else console.log('  pdf (signed)   ERR', error?.message)
}
