import fs from 'fs'
const env = Object.fromEntries(fs.readFileSync('.env.local','utf8').split('\n')
  .filter(l => l.includes('=') && !l.trim().startsWith('#'))
  .map(l => { const i = l.indexOf('='); return [l.slice(0,i).trim(), l.slice(i+1).trim().replace(/^["']|["']$/g,'')] }))

const STAGING_REF = 'oplyizxbzmwdodctsnxv'
const PROD_REF    = 'kpafjhkrjipiyfjizyaw'
if (STAGING_REF === PROD_REF) { console.error('refusing: target is production'); process.exit(1) }
console.log(`target ref: ${STAGING_REF} (staging)   [production ${PROD_REF} is NOT touched]\n`)

async function run(sql, label) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${STAGING_REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  })
  const body = await r.text()
  if (!r.ok) { console.log(`  ${label}: HTTP ${r.status}\n     ${body.slice(0,300)}`); return false }
  console.log(`  ${label}: OK  ${body.slice(0,120)}`)
  return true
}

const files = [
  'supabase/migrations/20260811000000_add_merch_format_value.sql',
  'supabase/migrations/20260811000001_extend_books_to_catalog.sql',
]
for (const f of files) {
  const sql = fs.readFileSync(f, 'utf8')
  console.log(`applying ${f.split('/').pop()}`)
  const ok = await run(sql, '  result')
  if (!ok) { console.log('\nstopping — migration failed'); process.exit(1) }
}
console.log('\nmigrations applied')
