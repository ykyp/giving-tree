import test from 'node:test'
import assert from 'node:assert/strict'
import { world, ADMIN } from './helpers.js'

test('trees: the global tree exists, is unbranded and has giving off', async () => {
  const { call } = world(), t = (await call('GET', 'tree/global')).json
  assert.deepEqual(t.tree, { slug: 'global', name: 'The Giving Tree', kind: 'global', giving: null })
  assert.deepEqual(t.counts, { ornaments: 0, wishes: 0 }); assert.deepEqual(t.ornaments, [])
})

test('trees: a community tree is created by an operator, with a filtered name and giving off', async () => {
  const { call } = world()
  assert.equal((await call('POST', 'admin/trees', { body: { slug: 'georgiou', name: 'The Georgiou family' } })).status, 401)
  const made = await call('POST', 'admin/trees', { auth: ADMIN, body: { slug: 'georgiou', name: 'The Georgiou family' } })
  assert.equal(made.status, 200); assert.equal(made.json.giving.enabled, false)
  assert.equal((await call('POST', 'admin/trees', { auth: ADMIN, body: { slug: 'georgiou', name: 'Again' } })).json.error, 'taken')
  for (const bad of [{ slug: 'ab', name: 'Too short' }, { slug: 'Has Space', name: 'x' }, { slug: 'fine-slug', name: 'The official tree' }, { slug: 'fine-slug', name: 'x'.repeat(41) }])
    assert.equal((await call('POST', 'admin/trees', { auth: ADMIN, body: bad })).status, 400)
  assert.equal((await call('GET', 'tree/georgiou')).json.tree.name, 'The Georgiou family')
  assert.equal((await call('GET', 'tree/nope')).json.error, 'no_tree')
})

test('trees: a card, its branch and its ornaments belong to exactly one tree', async () => {
  const { call, card } = world()
  await call('POST', 'admin/trees', { auth: ADMIN, body: { slug: 'georgiou', name: 'The Georgiou family' } })
  const E = await card('Eleni', 'E', { tree: 'georgiou' }), G = await card('Grace', 'G')
  assert.equal(E.tree, 'georgiou')
  assert.deepEqual((await call('GET', 'tree/georgiou')).json.ornaments.map(o => o.name), ['Eleni'])
  assert.deepEqual((await call('GET', 'tree/global')).json.ornaments.map(o => o.name), ['Grace'])
  const cross = await call('POST', 'card', { body: { tree: 'global', name: 'Tom', design: 1, hook: 31, parent: E.id }, dev: 'T' })
  assert.equal(cross.status, 400); assert.equal(cross.json.error, 'wrong_tree')
  assert.equal((await call('GET', `card/${E.id}`, { dev: 'T' })).json.tree.slug, 'georgiou')
  assert.equal((await call('POST', 'card', { body: { tree: 'nope', name: 'Tom', design: 1, hook: 31 }, dev: 'T' })).json.error, 'no_tree')
})

test('trees: the feed returns the newest ornaments first, only newer ones after a cursor, never hidden ones', async () => {
  const { call, card } = world(), A = await card('Maria', 'A'), B = await card('Tom', 'B', { hook: 31 })
  const first = (await call('GET', 'tree/global')).json
  assert.deepEqual(first.ornaments.map(o => o.name), ['Tom', 'Maria']); assert.equal(Object.keys(first.ornaments[0]).includes('token'), false)
  assert.deepEqual((await call('GET', 'tree/global', { query: { since: String(first.cursor) } })).json.ornaments, [])
  await card('Ana', 'C', { hook: 32 })
  assert.deepEqual((await call('GET', 'tree/global', { query: { since: String(first.cursor) } })).json.ornaments.map(o => o.name), ['Ana'])
  assert.equal((await call('POST', `admin/cards/${B.id}/hide`, { auth: ADMIN, body: { hidden: true } })).json.moderation, 'hidden')
  const after = (await call('GET', 'tree/global')).json
  assert.deepEqual(after.ornaments.map(o => o.name), ['Ana', 'Maria']); assert.equal(after.counts.ornaments, 2)
  assert.deepEqual((await call('GET', 'keepsake/global')).json.names, ['Maria', 'Ana'])
})

test('trees: counts cover every card even when more exist than the tree shows', async () => {
  const { call } = world()
  for (let i = 0; i < 130; i++) await call('POST', 'card', { body: { tree: 'global', name: 'N' + i, design: i % 8, hook: i }, dev: 'd' + i })
  const t = (await call('GET', 'tree/global')).json
  assert.equal(t.ornaments.length, 120); assert.equal(t.counts.ornaments, 130); assert.equal(t.ornaments[0].name, 'N129')
})
