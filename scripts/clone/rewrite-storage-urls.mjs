import fs from 'fs'
const env = Object.fromEntries(fs.readFileSync('.env.local','utf8').split('\n')
  .filter(l=>l.includes('=')&&!l.trim().startsWith('#')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(), l.slice(i+1).trim().replace(/^["']|["']$/g,'')]}))

const PROD = 'kpafjhkrjipiyfjizyaw'
const STAGING = 'oplyizxbzmwdodctsnxv'
if (PROD === STAGING) process.exit(1)
console.log(`rewriting ${PROD} -> ${STAGING} on the STAGING branch only\n`)

async function q(sql){
  const r = await fetch(`https://api.supabase.com/v1/projects/${STAGING}/database/query`,{
    method:'POST',headers:{Authorization:`Bearer ${env.SUPABASE_ACCESS_TOKEN}`,'Content-Type':'application/json'},
    body:JSON.stringify({query:sql})})
  return r.ok ? await r.json() : { error:(await r.text()).slice(0,240) }
}

const TARGETS = [
  ['book_pages','page_image_url'], ['books','cover_image_url'], ['books','book_file_url'],
  ['book_illustrations','image_url'], ['book_pages','content'], ['book_club_events','cover_image_url'],
]
for (const [t,c] of TARGETS) {
  const res = await q(
    `UPDATE public.${t} SET ${c} = replace(${c}, '${PROD}', '${STAGING}') WHERE ${c} LIKE '%${PROD}%';`)
  console.log(`  ${(t+'.'+c).padEnd(36)} ${res.error ? 'ERR ' + res.error : 'updated'}`)
}

console.log('\n  remaining references to production:')
const left = await q(`
DO $$ DECLARE r record; n bigint; BEGIN
  CREATE TEMP TABLE IF NOT EXISTS _left(tbl text, col text, cnt bigint) ON COMMIT DROP;
  FOR r IN SELECT table_name, column_name FROM information_schema.columns
           WHERE table_schema='public' AND data_type IN ('text','character varying') LOOP
    EXECUTE format('SELECT count(*) FROM public.%I WHERE %I LIKE ''%%${PROD}%%''', r.table_name, r.column_name) INTO n;
    IF n > 0 THEN INSERT INTO _left VALUES (r.table_name, r.column_name, n); END IF;
  END LOOP;
END $$;
SELECT * FROM _left;`)
if (left.error) console.log('   ', left.error)
else if (!left.length) console.log('    none — staging is self-contained')
else left.forEach(r => console.log(`    ${r.tbl}.${r.col}: ${r.cnt}`))
