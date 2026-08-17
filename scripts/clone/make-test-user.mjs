import { clients } from './lib.mjs'
import fs from 'fs'
import { randomBytes } from 'crypto'
const { dst } = clients()

const EMAIL = 'staging.tester@kanesbookstore.test'
const PASSWORD = 'Kt-' + randomBytes(9).toString('base64url') + '!7'

const { data: existing } = await dst.auth.admin.listUsers({ page:1, perPage:1000 })
const found = existing.users.find(u => u.email === EMAIL)
if (found) { await dst.auth.admin.deleteUser(found.id); console.log('  removed previous test user') }

const { data, error } = await dst.auth.admin.createUser({
  email: EMAIL, password: PASSWORD, email_confirm: true,
  user_metadata: { display_name: 'Staging Tester', full_name: 'Staging Tester' },
})
if (error) { console.log('  createUser failed:', error.message); process.exit(1) }
console.log(`  created ${EMAIL}`)
console.log(`  id      ${data.user.id}`)

for (const t of ['users','reading_settings','user_subscriptions']) {
  const col = t === 'users' ? 'id' : 'user_id'
  const { data: row } = await dst.from(t).select('*').eq(col, data.user.id).maybeSingle()
  console.log(`    ${t.padEnd(20)} ${row ? 'created by trigger' : 'MISSING'}`)
}

let s = fs.readFileSync('.env.local','utf8')
s = s.split('\n').filter(l => !l.startsWith('STAGING_TEST_USER_')).join('\n').trimEnd()
s += `\n\n# Disposable staging test account (staging DB only; safe to delete)\nSTAGING_TEST_USER_EMAIL=${EMAIL}\nSTAGING_TEST_USER_PASSWORD=${PASSWORD}\n`
fs.writeFileSync('.env.local', s)
console.log('\n  credentials written to .env.local as STAGING_TEST_USER_EMAIL / STAGING_TEST_USER_PASSWORD')
