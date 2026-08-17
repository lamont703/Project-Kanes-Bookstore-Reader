import { clients } from './lib.mjs'
const { src, dst } = clients()
async function walk(sb, bucket, prefix='') {
  const out=[]
  for (let off=0;;off+=100){
    const { data, error } = await sb.storage.from(bucket).list(prefix,{limit:100,offset:off})
    if (error||!data) break
    for (const e of data){
      const p = prefix?`${prefix}/${e.name}`:e.name
      if (e.id===null && e.metadata===null) out.push(...await walk(sb,bucket,p))
      else out.push(p)
    }
    if (data.length<100) break
  }
  return out
}
const { data: buckets } = await src.storage.listBuckets()
console.log('  bucket                prod  staging')
let ok=true
for (const b of buckets??[]){
  const [p,s]=await Promise.all([walk(src,b.name),walk(dst,b.name)])
  const match=p.length===s.length
  if(!match) ok=false
  console.log(`  ${b.name.padEnd(20)} ${String(p.length).padStart(5)} ${String(s.length).padStart(8)}${match?'':'  <-- MISMATCH'}`)
}
console.log(`\n  ${ok?'all buckets match':'MISMATCH present'}`)

// prove a real asset resolves end-to-end on staging
const { data: bk } = await dst.from('books').select('id,title,cover_image_url').not('cover_image_url','is',null).limit(1).maybeSingle()
if (bk){
  const staged = bk.cover_image_url.replace('kpafjhkrjipiyfjizyaw','oplyizxbzmwdodctsnxv')
  const r = await fetch(staged, { method:'HEAD' })
  console.log(`\n  spot-check "${bk.title.slice(0,30)}"`)
  console.log(`    staging cover HTTP ${r.status} (${r.headers.get('content-type')}, ${((+r.headers.get('content-length')||0)/1024).toFixed(0)}KB)`)
  console.log(`    NOTE: books.cover_image_url still points at the PRODUCTION ref`)
}
