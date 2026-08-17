import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

export function env() {
  return Object.fromEntries(fs.readFileSync('.env.local','utf8').split('\n')
    .filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0,i).trim(), l.slice(i+1).trim().replace(/^["']|["']$/g,'')] }))
}
const opts = { auth: { autoRefreshToken:false, persistSession:false } }
export function clients() {
  const e = env()
  const src = createClient(e.NEXT_PUBLIC_SUPABASE_URL, e.SUPABASE_SERVICE_ROLE_KEY, opts)
  const dst = createClient('https://oplyizxbzmwdodctsnxv.supabase.co', e.SUPABASE_STAGING_SERVICE_ROLE_KEY, opts)
  return { src, dst }
}
