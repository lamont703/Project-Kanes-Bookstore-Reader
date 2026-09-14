import { clients } from './lib.mjs'
import { randomUUID } from 'crypto'
const { src, dst } = clients()

console.log('1. staging must be empty before we start')
let dirty = false
for (const t of ['users','books','orders','book_variants']) {
  const { count, error } = await dst.from(t).select('*', { count:'exact', head:true })
  if (error) { console.log(`   ${t}: ERR ${error.code}`); continue }
  if (count) dirty = true
  console.log(`   ${t.padEnd(14)} ${count} rows`)
}
const { data: au } = await dst.auth.admin.listUsers({ page:1, perPage:1000 })
console.log(`   auth.users     ${au?.users?.length ?? '?'}`)
if (dirty || (au?.users?.length ?? 0) > 0) console.log('   !! staging is NOT empty — stopping would be safer')

console.log('\n2. can we create an auth user with a SPECIFIED id? (the linchpin)')
const testId = randomUUID()
const testEmail = `clone-probe-${Date.now()}@example.invalid`
const { data: made, error: mkErr } = await dst.auth.admin.createUser({
  id: testId, email: testEmail, email_confirm: true,
})
if (mkErr) {
  console.log('   createUser FAILED:', mkErr.message)
} else {
  const preserved = made.user.id === testId
  console.log(`   requested: ${testId}`)
  console.log(`   created:   ${made.user.id}`)
  console.log(`   ID PRESERVED: ${preserved ? 'YES — clone can proceed' : 'NO — FKs would break, must stop'}`)
  const { data: trg } = await dst.from('users').select('id,email').eq('id', made.user.id).maybeSingle()
  console.log(`   trigger created public.users row: ${trg ? 'yes' : 'no'}`)
  await dst.auth.admin.deleteUser(made.user.id)
  const { data: gone } = await dst.from('users').select('id').eq('id', made.user.id).maybeSingle()
  console.log(`   cleanup: auth user deleted, public.users row ${gone ? 'STILL THERE' : 'cascaded away'}`)
}
