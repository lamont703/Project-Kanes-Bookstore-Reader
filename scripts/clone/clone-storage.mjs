import { clients } from './lib.mjs'
const { src, dst } = clients()

async function walk(sb, bucket, prefix = '') {
  const out = []
  for (let off = 0; ; off += 100) {
    const { data, error } = await sb.storage.from(bucket).list(prefix, { limit: 100, offset: off })
    if (error || !data) break
    for (const e of data) {
      const path = prefix ? `${prefix}/${e.name}` : e.name
      if (e.id === null && e.metadata === null) out.push(...await walk(sb, bucket, path))
      else out.push({ path, size: e.metadata?.size ?? 0 })
    }
    if (data.length < 100) break
  }
  return out
}

const { data: buckets } = await src.storage.listBuckets()
const { data: existing } = await dst.storage.listBuckets()
const have = new Set((existing ?? []).map(b => b.name))

for (const b of buckets ?? []) {
  if (!have.has(b.name)) {
    await dst.storage.createBucket(b.name, {
      public: b.public, fileSizeLimit: b.file_size_limit, allowedMimeTypes: b.allowed_mime_types,
    })
    console.log(`bucket ${b.name}: created (public=${b.public})`)
  }

  const [files, done] = await Promise.all([walk(src, b.name), walk(dst, b.name)])
  const already = new Set(done.map(f => f.path))          // resumable: skip what's there
  const todo = files.filter(f => !already.has(f.path))
  console.log(`bucket ${b.name}: ${files.length} source files, ${already.size} already copied, ${todo.length} to do`)

  let ok = 0, fail = 0, bytes = 0
  for (const f of todo) {
    const { data: blob, error: dErr } = await src.storage.from(b.name).download(f.path)
    if (dErr || !blob) { fail++; continue }
    const buf = Buffer.from(await blob.arrayBuffer())
    const { error: uErr } = await dst.storage.from(b.name).upload(f.path, buf, {
      upsert: true, contentType: blob.type || 'application/octet-stream',
    })
    if (uErr) { fail++; if (fail <= 2) console.log(`   fail ${f.path}: ${uErr.message.slice(0,70)}`) }
    else { ok++; bytes += buf.length }
    if (ok && ok % 50 === 0) console.log(`   ...${ok}/${todo.length} (${(bytes/1024/1024).toFixed(0)} MB)`)
  }
  console.log(`bucket ${b.name}: DONE +${ok} files, ${(bytes/1024/1024).toFixed(1)} MB${fail ? `, ${fail} failed` : ''}`)
}
console.log('STORAGE COMPLETE')
