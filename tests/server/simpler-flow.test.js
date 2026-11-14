import test from 'node:test'
import assert from 'node:assert/strict'
import { world, ADMIN } from './helpers.js'
import { copy } from '../../shared/copy.js'
import { pages } from '../../shared/shell.js'
import { daysToChristmas } from '../../shared/season.js'

const family = async call => { await call('POST', 'admin/trees', { auth: ADMIN, body: { slug: 'family', name: 'The Georgiou family' } }) }
const hang = async (call, name, dev, hook) => (await call('POST', 'card', { body: { tree: 'family', name, design: 2, hook }, dev })).json

test('simpler flow: on a tree for your people anyone can wish anyone, once, and the tree says whom you have wished', async () => {
  const { call } = world(); await family(call)
  const ana = await hang(call, 'Ana', 'A', 10), ben = await hang(call, 'Ben', 'B', 11), cleo = await hang(call, 'Cleo', 'C', 12)
  assert.deepEqual((await call('GET', 'tree/family', { dev: 'A' })).json.wished, [])
  assert.equal((await call('POST', 'wish', { body: { to: ben.id, from: 'Ana', text: 'A calm year' }, dev: 'A' })).status, 200)
  assert.equal((await call('POST', 'wish', { body: { to: cleo.id, from: 'Ana', text: 'More sea' }, dev: 'A' })).status, 200)
  assert.deepEqual((await call('GET', 'tree/family', { dev: 'A' })).json.wished.sort(), [ben.id, cleo.id].sort())
  assert.deepEqual((await call('GET', 'tree/family', { dev: 'B' })).json.wished, [], 'only your own')
  assert.deepEqual((await call('GET', 'tree/global', { dev: 'A' })).json.wished, [], 'only this tree')
  assert.equal((await call('POST', 'wish', { body: { to: ben.id, from: 'Ana', text: 'Again' }, dev: 'A' })).json.error, 'already')
  assert.equal((await call('POST', 'wish', { body: { to: ana.id, from: 'Ana', text: 'Me' }, dev: 'A' })).json.error, 'own_card')
  const bens = (await call('GET', `me/${ben.token}`, { dev: 'B', query: { day: '2026-12-05' } })).json
  assert.deepEqual(bens.wishes.map(w => [w.from, 'text' in w]), [['Ana', false]], 'sealed like every other wish')
})

test('simpler flow: a wish can come before the ornament, from someone with no ornament at all', async () => {
  const { call } = world(), maria = (await call('POST', 'card', { body: { tree: 'global', name: 'Maria', design: 1, hook: 30 }, dev: 'M' })).json
  assert.equal((await call('POST', 'wish', { body: { to: maria.id, from: 'Tom', text: 'Snow on the day' }, dev: 'T' })).status, 200)
  assert.equal((await call('POST', 'wish', { body: { to: maria.id, from: '', text: 'x' }, dev: 'U' })).json.error, 'bad_name')
  assert.equal((await call('GET', `card/${maria.id}`, { dev: 'T' })).json.left, true)
  // hanging afterwards next to her: nothing asks for the wish again, and a second one is refused
  const tom = (await call('POST', 'card', { body: { tree: 'global', name: 'Tom', design: 3, hook: 31, parent: maria.id }, dev: 'T' })).json
  assert.equal(tom.parent, maria.id)
  assert.equal((await call('POST', 'wish', { body: { to: maria.id, from: 'Tom', text: 'Twice' }, dev: 'T' })).json.error, 'already')
})

test('simpler flow: a family can wish each other in one sitting; the shared tree keeps its tighter limit', async () => {
  const { call } = world(); await family(call); let ok = 0
  for (let i = 0; i < 45; i++) { const c = await hang(call, 'N' + i, 'owner' + i, i); if ((await call('POST', 'wish', { body: { to: c.id, from: 'Ana', text: 'hello' }, dev: 'A' })).status === 200) ok++ }
  assert.equal(ok, 40)
})

test('simpler flow: an ornament made for a friend carries its design; older links have none', async () => {
  const { call } = world(), send = body => call('POST', 'sent', { body: { tree: 'global', from: 'Eleni', to: 'Tom', text: 'A calm year', ...body }, dev: 'S' })
  const made = (await send({ design: 4 })).json, plain = (await send({})).json
  assert.equal((await call('GET', `sent/${made.token}`, { dev: 'T' })).json.design, 4)
  assert.equal((await call('GET', `sent/${plain.token}`, { dev: 'T' })).json.design, null)
  for (const design of [8, -1, 1.5, 'x']) assert.equal((await send({ design })).json.error, 'bad_card')
})

test('simpler flow: nothing a visitor reads on a wishes-only tree says "branch"', async () => {
  const { call } = world(), maria = (await call('POST', 'card', { body: { tree: 'global', name: 'Maria', design: 1, hook: 30 }, dev: 'M' })).json
  const sent = (await call('POST', 'sent', { body: { tree: 'global', from: 'Eleni', to: 'Tom', text: 'hi' }, dev: 'S' })).json
  const said = [copy.invite({ late: false }), copy.invite({ late: true }), copy.thanks({ giving: null, given: 0 }), copy.thanks({ giving: null, given: 0, nye: true }), copy.previewTitle({ name: 'Maria' }), copy.previewTitle({ name: 'Maria', thanks: true }),
    copy.previewText({ giving: null, thanks: false, waiting: 2 }), copy.previewText({ giving: null, thanks: true }), copy.greetingNote({ giving: null, own: false }), copy.greetingNote({ giving: null, own: true }), copy.sentMessage({ to: 'Tom', from: 'Eleni' }),
    JSON.stringify(copy.summary({ giving: null, stats: { ornaments: 3, wishes: 2 } })), JSON.stringify(copy.calendar({ url: 'u' })), pages.home().body]
  for (const p of ['page/t/global', `page/c/${maria.id}`, `page/w/${sent.token}`]) said.push((await call('GET', p)).text)
  said.push((await call('GET', `page/c/${maria.id}`, { query: { t: '1' } })).text)
  for (const s of said) assert.doesNotMatch(s, /branch/i)
})

test('simpler flow: the countdown uses the visitor\'s own calendar day', () => {
  assert.equal(daysToChristmas(new Date(2026, 10, 12, 23, 30)), 43); assert.equal(daysToChristmas(new Date(2026, 11, 24, 1)), 1)
  assert.equal(daysToChristmas(new Date(2026, 11, 25, 9)), 0); assert.equal(daysToChristmas(new Date(2026, 11, 28)), 0)
})
