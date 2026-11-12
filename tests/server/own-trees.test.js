import test from 'node:test'
import assert from 'node:assert/strict'
import { treeSlug } from '../../shared/slug.js'
import { world, ADMIN } from './helpers.js'

test('tree addresses: readable, from the name, with a unique ending', () => {
  assert.equal(treeSlug('The Georgiou family', 'k3f9x'), 'georgiou-family-k3f9x'); assert.equal(treeSlug('Class 4B', 'k3f9x'), 'class-4b-k3f9x'); assert.equal(treeSlug('Ελένη', 'k3f9x'), 'tree-k3f9x')
  for (const n of ['The Georgiou family', 'x', 'A very long name for a tree that goes on and on', '!!!']) assert.match(treeSlug(n), /^[a-z0-9-]{3,30}$/)
  assert.notEqual(treeSlug('Same name'), treeSlug('Same name'))
})

test('own trees: anyone can create one; it is usable at once, private by link, with giving off', async () => {
  const { call, card } = world(), made = await call('POST', 'tree', { body: { name: '  The Georgiou   family ' }, dev: 'T' })
  assert.equal(made.status, 200); assert.equal(made.json.name, 'The Georgiou family'); assert.match(made.json.slug, /^georgiou-family-[a-z0-9]{5}$/)
  const t = (await call('GET', `tree/${made.json.slug}`)).json; assert.deepEqual(t.tree, { slug: made.json.slug, name: 'The Georgiou family', kind: 'community', giving: null })
  const E = await card('Eleni', 'T', { tree: made.json.slug }); assert.equal(E.tree, made.json.slug)
  assert.equal((await call('GET', 'tree/global')).json.counts.ornaments, 0)
  const again = (await call('POST', 'tree', { body: { name: 'The Georgiou family' }, dev: 'U' })).json; assert.notEqual(again.slug, made.json.slug)
})

test('own trees: bad names are refused, and one device can start two a day', async () => {
  const { call } = world()
  for (const name of ['', '   ', 'x'.repeat(41), 'The official tree', 'admin']) { const r = await call('POST', 'tree', { body: { name }, dev: 'N' }); assert.equal(r.status, 400, name); assert.equal(r.json.error, 'bad_name') }
  let ok = 0, slow = 0
  for (let i = 0; i < 20; i++) { const r = await call('POST', 'tree', { body: { name: 'Tree ' + i }, dev: 'flood' }); if (r.status === 200) ok++; else if (r.json.error === 'slow_down') slow++ }
  assert.equal(ok, 2); assert.equal(slow, 18)
  assert.equal((await call('POST', 'tree', { body: { name: 'Next day' }, dev: 'flood', clock: '2026-12-06T12:00:01Z' })).status, 200)
  assert.equal((await call('POST', 'tree', { body: { name: 'Too late' }, dev: 'Z', clock: '2027-01-02T00:00:00Z' })).json.error, 'frozen')
})

test('own trees: reports take a tree down; the shared tree cannot be taken down; an operator can do it directly', async () => {
  const { call, card } = world(), slug = (await call('POST', 'tree', { body: { name: 'Class 4B' }, dev: 'T' })).json.slug
  await card('Eleni', 'T', { tree: slug })
  for (const d of ['r1', 'r1', 'r2']) assert.deepEqual((await call('POST', `tree/${slug}/report`, { dev: d })).json, { ok: true })
  assert.equal((await call('GET', `tree/${slug}`)).status, 200) // two different devices so far
  await call('POST', `tree/${slug}/report`, { dev: 'r3' })
  assert.equal((await call('GET', `tree/${slug}`)).json.error, 'no_tree'); assert.equal((await call('GET', `page/t/${slug}`)).status, 404)
  assert.equal((await call('POST', 'card', { body: { tree: slug, name: 'Late', design: 0, hook: 3 }, dev: 'L' })).json.error, 'no_tree')
  for (const d of ['r1', 'r2', 'r3', 'r4']) await call('POST', 'tree/global/report', { dev: d })
  assert.equal((await call('GET', 'tree/global')).status, 200)
  const other = (await call('POST', 'tree', { body: { name: 'Flat 12' }, dev: 'F' })).json.slug
  assert.equal((await call('POST', `admin/trees/${other}/takedown`, {})).status, 401)
  assert.equal((await call('POST', `admin/trees/${other}/takedown`, { auth: ADMIN })).json.ok, true); assert.equal((await call('GET', `tree/${other}`)).status, 404)
  assert.equal((await call('POST', 'admin/trees/global/takedown', { auth: ADMIN })).status, 404)
})
